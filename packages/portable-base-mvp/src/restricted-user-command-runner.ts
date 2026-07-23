import { spawnSync, type SpawnSyncReturns } from "node:child_process";

export const WINDOWS_TOOLS = {
  whoami: "C:\\Windows\\System32\\whoami.exe",
  powershell: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
} as const;
const ALLOWED = new Set<string>(Object.values(WINDOWS_TOOLS).map((p) => p.toLowerCase()));
const unsafe = /[\u0000-\u001f]|[&|<>]/;
export type CommandFailure = "NONE" | "NOT_ALLOWLISTED" | "ARGUMENT_REJECTED" | "TIMEOUT" | "NOT_FOUND" | "NONZERO_EXIT" | "SPAWN_ERROR";
export interface CommandObservation { executable: string; args: string[]; startedAt: string; completedAt: string; exitCode: number | null; stdout: string; stderr: string; failure: CommandFailure; timedOut: boolean; }
export type SpawnApi = (file: string, args: readonly string[], options: any) => SpawnSyncReturns<string>;

export function runWindowsCommand(executable: string, args: string[], input: { timeoutMs?: number; spawn?: SpawnApi; env?: NodeJS.ProcessEnv } = {}): CommandObservation {
  const startedAt = new Date().toISOString();
  if (!ALLOWED.has(executable.toLowerCase())) return result("NOT_ALLOWLISTED");
  if (args.some((arg) => unsafe.test(arg))) return result("ARGUMENT_REJECTED");
  const timeoutMs = Math.min(Math.max(input.timeoutMs ?? 10_000, 100), 30_000);
  try {
    const run = input.spawn ?? (spawnSync as SpawnApi);
    const observed = run(executable, args, { shell: false, encoding: "utf8", windowsHide: true, timeout: timeoutMs, env: input.env ?? minimalWindowsEnvironment() });
    const timedOut = (observed.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT";
    const failure: CommandFailure = timedOut ? "TIMEOUT" : (observed.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT" ? "NOT_FOUND" : observed.error ? "SPAWN_ERROR" : observed.status === 0 ? "NONE" : "NONZERO_EXIT";
    return { executable, args: [...args], startedAt, completedAt: new Date().toISOString(), exitCode: observed.status, stdout: observed.stdout ?? "", stderr: observed.stderr ?? "", failure, timedOut };
  } catch { return result("SPAWN_ERROR"); }
  function result(failure: CommandFailure): CommandObservation { return { executable, args: [...args], startedAt, completedAt: new Date().toISOString(), exitCode: null, stdout: "", stderr: "", failure, timedOut: failure === "TIMEOUT" }; }
}

export function minimalWindowsEnvironment(source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return Object.fromEntries(["SystemRoot", "WINDIR", "TEMP", "TMP", "USERPROFILE", "LOCALAPPDATA", "APPDATA"].flatMap((key) => source[key] ? [[key, source[key]!]] : []));
}

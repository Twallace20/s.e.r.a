import { spawn } from "node:child_process";
import type { ExecutionRequest } from "./execution-request";
import { BoundedOutputCollector, type OutputCapture } from "./output-capture";

export interface ProcessRunResult {
  status: "exited" | "timed_out" | "cancelled" | "spawn_error";
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  startedAt: string;
  completedAt: string;
  output: OutputCapture;
  spawnError?: string;
}

export interface ActiveProcessHandle {
  cancel(reason: string): void;
}

export function runProcess(input: {
  executablePath: string;
  args: string[];
  cwd: string;
  request: ExecutionRequest;
  env: Record<string, string>;
  onActive?: (handle: ActiveProcessHandle) => void;
}): Promise<ProcessRunResult> {
  const startedAt = new Date().toISOString();
  const collector = new BoundedOutputCollector(input.request.maxStdoutBytes, input.request.maxStderrBytes, input.request.maxCombinedOutputBytes);
  return new Promise((resolve) => {
    let child: ReturnType<typeof spawn>;
    let settled = false;
    let timeout: NodeJS.Timeout | undefined;
    let forceTimer: NodeJS.Timeout | undefined;
    let cancellationReason: string | undefined;
    let timedOut = false;
    const finish = (status: ProcessRunResult["status"], exitCode: number | null, signal: NodeJS.Signals | null, spawnError?: string) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      if (forceTimer) clearTimeout(forceTimer);
      resolve({ status, exitCode, signal, startedAt, completedAt: new Date().toISOString(), output: collector.result(), spawnError });
    };
    try {
      child = spawn(input.executablePath, input.args, {
        cwd: input.cwd,
        env: input.env,
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"]
      });
    } catch (error) {
      finish("spawn_error", null, null, error instanceof Error ? error.message : String(error));
      return;
    }
    child.stdout?.on("data", (chunk: Buffer) => collector.pushStdout(chunk));
    child.stderr?.on("data", (chunk: Buffer) => collector.pushStderr(chunk));
    child.once("error", (error) => finish("spawn_error", null, null, error.message));
    child.once("close", (code, signal) => finish(timedOut ? "timed_out" : cancellationReason ? "cancelled" : "exited", code, signal));
    timeout = setTimeout(() => {
      timedOut = true;
      cancellationReason = "timeout";
      child.kill("SIGTERM");
      forceTimer = setTimeout(() => {
        if (!settled) child.kill("SIGKILL");
      }, input.request.gracefulCancellationMs);
      setTimeout(() => finish("timed_out", null, null), input.request.gracefulCancellationMs + 500);
    }, input.request.timeoutMs);
    input.onActive?.({
      cancel(reason: string) {
        if (settled) return;
        cancellationReason = reason || "operator-cancelled";
        child.kill("SIGTERM");
        forceTimer = setTimeout(() => {
          if (!settled) child.kill("SIGKILL");
        }, input.request.gracefulCancellationMs);
      }
    });
  });
}

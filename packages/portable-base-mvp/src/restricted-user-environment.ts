import { sha256 } from "./restricted-user-evidence";

const ALLOW = ["SystemRoot", "WINDIR", "TEMP", "TMP", "USERPROFILE", "LOCALAPPDATA", "APPDATA", "PATHEXT"];
const COVERAGE = ["PATH", "PATHEXT", "SystemRoot", "WINDIR", "TEMP", "TMP", "USERPROFILE", "LOCALAPPDATA", "APPDATA", "NODE_PATH", "NODE_OPTIONS", "npm_config_*", "NPM_CONFIG_*", "GIT_*", "CODEX_*", "PROXY_*", "CLOUD_CREDENTIALS", "PROVIDER_CREDENTIALS", "DEVELOPMENT_PATHS"];
export function buildSanitizedEnvironment(source: NodeJS.ProcessEnv, runtimeDir: string): NodeJS.ProcessEnv { const env: NodeJS.ProcessEnv = { PATH: runtimeDir }; for (const key of ALLOW) if (source[key]) env[key] = source[key]; return env; }
export function observeRedactedEnvironment(env: NodeJS.ProcessEnv, pid: number, sessionId: string, developmentRoots: string[]): any {
  const entries = COVERAGE.map((key) => { const matches = wildcardValues(env, key); return matches.length ? { key, classification: "digest-only", valueDigest: sha256(matches.join("\0")) } : { key, classification: "absent" }; });
  const developmentPathPresent = Object.values(env).some((v) => developmentRoots.some((root) => String(v).toLowerCase().includes(root.toLowerCase())));
  return { pid, sessionId, createdFromAllowlist: true, secretValueWritten: false, developmentPathPresent, coverage: COVERAGE, entries };
}
function wildcardValues(env: NodeJS.ProcessEnv, pattern: string): string[] { const regex = new RegExp(`^${pattern.replace("*", ".*")}$`, "i"); return Object.entries(env).filter(([k, v]) => regex.test(k) && v !== undefined).map(([k, v]) => `${k}=${v}`); }

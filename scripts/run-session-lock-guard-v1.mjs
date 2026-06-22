import {
  createDefaultSessionLockGuardV1,
  inspectSessionLockGuardV1,
} from "./lib/session-lock-guard-v1.mjs";

const result = inspectSessionLockGuardV1(createDefaultSessionLockGuardV1(), {
  rootDir: process.cwd(),
});

console.log(`S.E.R.A. phase43 session lock guard v1: ${result.ok ? "PASS" : "FAIL"}`);
console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exitCode = 1;
}

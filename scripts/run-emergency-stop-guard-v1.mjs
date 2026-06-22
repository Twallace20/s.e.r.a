import {
  createDefaultEmergencyStopGuardV1,
  inspectEmergencyStopGuardV1,
} from "./lib/emergency-stop-guard-v1.mjs";

const result = inspectEmergencyStopGuardV1(createDefaultEmergencyStopGuardV1(), {
  rootDir: process.cwd(),
});

console.log(`S.E.R.A. phase44 emergency stop guard v1: ${result.ok ? "PASS" : "FAIL"}`);
console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exitCode = 1;
}

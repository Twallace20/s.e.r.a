import { inspectCommandAllowlistGateV1, createDefaultCommandAllowlistGateV1 } from "./lib/command-allowlist-gate-v1.mjs";

const result = inspectCommandAllowlistGateV1(createDefaultCommandAllowlistGateV1(), {
  rootDir: process.cwd(),
});

if (!result.ok) {
  console.error("S.E.R.A. phase38 command allowlist gate v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase38 command allowlist gate v1: PASS");
console.log(JSON.stringify(result, null, 2));

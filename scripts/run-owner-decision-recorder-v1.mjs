import {
  createDefaultOwnerDecisionRecorderV1,
  inspectOwnerDecisionRecorderV1,
} from "./lib/owner-decision-recorder-v1.mjs";

const result = inspectOwnerDecisionRecorderV1(createDefaultOwnerDecisionRecorderV1(), {
  rootDir: process.cwd(),
});

console.log(`S.E.R.A. phase41 owner decision recorder v1: ${result.ok ? "PASS" : "FAIL"}`);
console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exitCode = 1;
}

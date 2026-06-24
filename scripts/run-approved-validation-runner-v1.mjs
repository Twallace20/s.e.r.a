#!/usr/bin/env node
import { runApprovedValidationRunnerDemoV1 } from "./lib/approved-validation-runner-v1.mjs";

const result = runApprovedValidationRunnerDemoV1();
if (!result.ok) {
  console.error("S.E.R.A. phase91 approved validation runner v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log("S.E.R.A. phase91 approved validation runner v1: PASS");
console.log(JSON.stringify(result, null, 2));

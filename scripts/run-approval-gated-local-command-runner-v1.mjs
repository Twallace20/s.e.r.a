#!/usr/bin/env node
import { runApprovalGatedLocalCommandRunnerDemoV1 } from "./lib/approval-gated-local-command-runner-v1.mjs";

const result = runApprovalGatedLocalCommandRunnerDemoV1();
if (!result.ok) {
  console.error("S.E.R.A. phase90 approval-gated local command runner v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log("S.E.R.A. phase90 approval-gated local command runner v1: PASS");
console.log(JSON.stringify(result, null, 2));

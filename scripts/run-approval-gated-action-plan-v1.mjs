import {
  createDefaultApprovalGatedActionPlanV1,
  inspectApprovalGatedActionPlanV1,
} from "./lib/approval-gated-action-plan-v1.mjs";

const result = inspectApprovalGatedActionPlanV1(createDefaultApprovalGatedActionPlanV1(), {
  rootDir: process.cwd(),
});

console.log(`S.E.R.A. phase42 approval-gated action plan v1: ${result.ok ? "PASS" : "FAIL"}`);
console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exitCode = 1;
}

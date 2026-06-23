import { createDefaultLocalWorkerSchedulerApprovalPlanV1, inspectLocalWorkerSchedulerApprovalPlanV1 } from "./lib/local-worker-scheduler-approval-plan-v1.mjs";

const result = inspectLocalWorkerSchedulerApprovalPlanV1(createDefaultLocalWorkerSchedulerApprovalPlanV1(), { writeArtifacts: true });
console.log("S.E.R.A. phase73 local worker scheduler approval plan v1: " + (result.ok ? "PASS" : "FAIL"));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

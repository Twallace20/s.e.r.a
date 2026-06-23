import { createDefaultLocalWorkerHealthPollingApprovalPlanV1, inspectLocalWorkerHealthPollingApprovalPlanV1 } from "./lib/local-worker-health-polling-approval-plan-v1.mjs";

const result = inspectLocalWorkerHealthPollingApprovalPlanV1(createDefaultLocalWorkerHealthPollingApprovalPlanV1(), { writeArtifacts: true });
console.log("S.E.R.A. phase72 local worker health polling approval plan v1: " + (result.ok ? "PASS" : "FAIL"));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

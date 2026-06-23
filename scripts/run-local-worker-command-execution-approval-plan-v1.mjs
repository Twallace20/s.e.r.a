import { createDefaultLocalWorkerCommandExecutionApprovalPlanV1, inspectLocalWorkerCommandExecutionApprovalPlanV1 } from "./lib/local-worker-command-execution-approval-plan-v1.mjs";

const result = inspectLocalWorkerCommandExecutionApprovalPlanV1(createDefaultLocalWorkerCommandExecutionApprovalPlanV1(), { writeArtifacts: true });
console.log("S.E.R.A. phase74 local worker command execution approval plan v1: " + (result.ok ? "PASS" : "FAIL"));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

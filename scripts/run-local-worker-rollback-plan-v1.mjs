import { inspectLocalWorkerRollbackPlanV1 } from "./lib/local-worker-rollback-plan-v1.mjs";

const result = inspectLocalWorkerRollbackPlanV1(undefined, { writeArtifacts: true });
console.log("S.E.R.A. phase66 local worker rollback plan v1: " + (result.ok ? "PASS" : "BLOCKED"));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;

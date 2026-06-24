import { createDefaultLocalWorkerCommandTimeoutBoundaryDraftV1, inspectLocalWorkerCommandTimeoutBoundaryDraftV1 } from "./lib/local-worker-command-timeout-boundary-draft-v1.mjs";

const result = inspectLocalWorkerCommandTimeoutBoundaryDraftV1(createDefaultLocalWorkerCommandTimeoutBoundaryDraftV1(), { writeArtifacts: true });
console.log("S.E.R.A. phase83 local worker command timeout boundary draft v1: " + (result.ok ? "PASS" : "FAIL"));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

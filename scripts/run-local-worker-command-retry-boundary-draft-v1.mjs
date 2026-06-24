import { createDefaultLocalWorkerCommandRetryBoundaryDraftV1, inspectLocalWorkerCommandRetryBoundaryDraftV1 } from "./lib/local-worker-command-retry-boundary-draft-v1.mjs";

const result = inspectLocalWorkerCommandRetryBoundaryDraftV1(createDefaultLocalWorkerCommandRetryBoundaryDraftV1(), { writeArtifacts: true });
console.log("S.E.R.A. phase84 local worker command retry boundary draft v1: " + (result.ok ? "PASS" : "FAIL"));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

import { createDefaultLocalWorkerCommandOutputBoundaryDraftV1, inspectLocalWorkerCommandOutputBoundaryDraftV1 } from "./lib/local-worker-command-output-boundary-draft-v1.mjs";

const result = inspectLocalWorkerCommandOutputBoundaryDraftV1(createDefaultLocalWorkerCommandOutputBoundaryDraftV1(), { writeArtifacts: true });
console.log("S.E.R.A. phase79 local worker command output boundary draft v1: " + (result.ok ? "PASS" : "FAIL"));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

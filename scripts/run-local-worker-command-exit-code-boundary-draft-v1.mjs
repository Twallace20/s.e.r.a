import { createDefaultLocalWorkerCommandExitCodeBoundaryDraftV1, inspectLocalWorkerCommandExitCodeBoundaryDraftV1 } from "./lib/local-worker-command-exit-code-boundary-draft-v1.mjs";

const result = inspectLocalWorkerCommandExitCodeBoundaryDraftV1(createDefaultLocalWorkerCommandExitCodeBoundaryDraftV1(), { writeArtifacts: true });
console.log("S.E.R.A. phase80 local worker command exit-code boundary draft v1: " + (result.ok ? "PASS" : "FAIL"));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

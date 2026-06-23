import { createDefaultLocalWorkerCommandWorkingDirectoryBoundaryDraftV1, inspectLocalWorkerCommandWorkingDirectoryBoundaryDraftV1 } from "./lib/local-worker-command-working-directory-boundary-draft-v1.mjs";

const result = inspectLocalWorkerCommandWorkingDirectoryBoundaryDraftV1(createDefaultLocalWorkerCommandWorkingDirectoryBoundaryDraftV1(), { writeArtifacts: true });
console.log("S.E.R.A. phase77 local worker command working directory boundary draft v1: " + (result.ok ? "PASS" : "FAIL"));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

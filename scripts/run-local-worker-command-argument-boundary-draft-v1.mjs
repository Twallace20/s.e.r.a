import { createDefaultLocalWorkerCommandArgumentBoundaryDraftV1, inspectLocalWorkerCommandArgumentBoundaryDraftV1 } from "./lib/local-worker-command-argument-boundary-draft-v1.mjs";

const result = inspectLocalWorkerCommandArgumentBoundaryDraftV1(createDefaultLocalWorkerCommandArgumentBoundaryDraftV1(), { writeArtifacts: true });
console.log("S.E.R.A. phase76 local worker command argument boundary draft v1: " + (result.ok ? "PASS" : "FAIL"));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

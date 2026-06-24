import { createDefaultLocalWorkerCommandEnvironmentBoundaryDraftV1, inspectLocalWorkerCommandEnvironmentBoundaryDraftV1 } from "./lib/local-worker-command-environment-boundary-draft-v1.mjs";

const result = inspectLocalWorkerCommandEnvironmentBoundaryDraftV1(createDefaultLocalWorkerCommandEnvironmentBoundaryDraftV1(), { writeArtifacts: true });
console.log("S.E.R.A. phase78 local worker command environment boundary draft v1: " + (result.ok ? "PASS" : "FAIL"));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

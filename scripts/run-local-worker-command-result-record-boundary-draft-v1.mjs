import { createDefaultLocalWorkerCommandResultRecordBoundaryDraftV1, inspectLocalWorkerCommandResultRecordBoundaryDraftV1 } from "./lib/local-worker-command-result-record-boundary-draft-v1.mjs";

const result = inspectLocalWorkerCommandResultRecordBoundaryDraftV1(createDefaultLocalWorkerCommandResultRecordBoundaryDraftV1(), { writeArtifacts: true });
console.log("S.E.R.A. phase81 local worker command result-record boundary draft v1: " + (result.ok ? "PASS" : "FAIL"));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

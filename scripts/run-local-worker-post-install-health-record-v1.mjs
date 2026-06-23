import { createDefaultLocalWorkerPostInstallHealthRecordV1, inspectLocalWorkerPostInstallHealthRecordV1 } from "./lib/local-worker-post-install-health-record-v1.mjs";

const result = inspectLocalWorkerPostInstallHealthRecordV1(createDefaultLocalWorkerPostInstallHealthRecordV1(), { writeArtifacts: true });
console.log("S.E.R.A. phase71 local worker post-install health record v1: " + (result.ok ? "PASS" : "FAIL"));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

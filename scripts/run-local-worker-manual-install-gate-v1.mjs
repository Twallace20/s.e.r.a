import { createDefaultLocalWorkerManualInstallGateV1, inspectLocalWorkerManualInstallGateV1 } from "./lib/local-worker-manual-install-gate-v1.mjs";

const result = inspectLocalWorkerManualInstallGateV1(createDefaultLocalWorkerManualInstallGateV1(), { writeArtifacts: true });
console.log("S.E.R.A. phase70 local worker manual install gate v1: " + (result.ok ? "PASS" : "FAIL"));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

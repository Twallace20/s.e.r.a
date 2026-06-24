import { createDefaultLocalWorkerCommandRiskClassifierV1, inspectLocalWorkerCommandRiskClassifierV1 } from "./lib/local-worker-command-risk-classifier-v1.mjs";

const result = inspectLocalWorkerCommandRiskClassifierV1(createDefaultLocalWorkerCommandRiskClassifierV1(), { writeArtifacts: true });
console.log("S.E.R.A. phase85 local worker command risk classifier v1: " + (result.ok ? "PASS" : "FAIL"));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

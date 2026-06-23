import { createDefaultLocalWorkerInstallDryRunV1, inspectLocalWorkerInstallDryRunV1 } from "./lib/local-worker-install-dry-run-v1.mjs";

const result = inspectLocalWorkerInstallDryRunV1(createDefaultLocalWorkerInstallDryRunV1(), { writeArtifacts: true });
console.log("S.E.R.A. phase68 local worker install dry-run v1:", result.ok ? "PASS" : "BLOCKED");
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);

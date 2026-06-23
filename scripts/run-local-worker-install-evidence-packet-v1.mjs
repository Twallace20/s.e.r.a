import { createDefaultLocalWorkerInstallEvidencePacketV1, inspectLocalWorkerInstallEvidencePacketV1 } from "./lib/local-worker-install-evidence-packet-v1.mjs";

const result = inspectLocalWorkerInstallEvidencePacketV1(createDefaultLocalWorkerInstallEvidencePacketV1(), { writeArtifacts: true });
console.log("S.E.R.A. phase69 local worker install evidence packet v1:", result.ok ? "PASS" : "BLOCKED");
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);

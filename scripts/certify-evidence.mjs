import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { currentEvidenceExpectations, latestEvidencePath, verifyValidationEvidence } from "./lib/validation-ledger-v1.mjs";

const root = process.cwd();
let evidencePath;
try {
  evidencePath = latestEvidencePath(root);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
const verification = verifyValidationEvidence(evidence, currentEvidenceExpectations(root), { requireCleanTree: true });
if (!verification.ok) {
  console.error(JSON.stringify({ ok: false, status: "BLOCKED", errorCode: verification.failureCode, evidencePath, checks: verification.checks }, null, 2));
  process.exit(1);
}

const result = spawnSync("node", ["packages/certs/dist/certify.js"], { cwd: root, encoding: "utf8", shell: process.platform === "win32" });
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
if (result.status !== 0) process.exit(result.status ?? 1);

console.log(JSON.stringify({ ok: true, status: "CERTIFIED_WITH_VALIDATION_EVIDENCE", evidencePath, validationId: evidence.validationId, evidenceDigest: evidence.finalEvidenceDigest, reranBuild: false, reranTests: false }, null, 2));

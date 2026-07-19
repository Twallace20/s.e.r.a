import fs from "node:fs";
import path from "node:path";
import { createValidationEvidence, runCommand } from "./lib/validation-ledger-v1.mjs";

const root = process.cwd();
const commands = [
  ["hygiene", "npm", ["run", "hygiene"]],
  ["free-core", "npm", ["run", "free-core:verify"]],
  ["knowledge", "npm", ["run", "knowledge:verify"]],
  ["build", "npm", ["run", "build"]],
  ["vitest", "npx", ["vitest", "run"]]
];

const results = [];
for (const [component, command, args] of commands) {
  const result = runCommand(root, component, command, args);
  results.push(result);
  if (result.exitCode !== 0) break;
}

const evidence = createValidationEvidence(root, results);
const outDir = path.join(root, ".sera", "validation-ledger", evidence.validationId);
fs.mkdirSync(outDir, { recursive: true });
const evidencePath = path.join(outDir, "validation-evidence.json");
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(root, ".sera", "validation-ledger", "latest.json"), `${JSON.stringify({ path: path.relative(root, evidencePath).replace(/\\/g, "/"), validationId: evidence.validationId, finalEvidenceDigest: evidence.finalEvidenceDigest }, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ ok: results.every((result) => result.exitCode === 0), validationId: evidence.validationId, evidencePath, finalEvidenceDigest: evidence.finalEvidenceDigest, testFileCount: evidence.testFileCount, testCount: evidence.testCount }, null, 2));
process.exit(results.every((result) => result.exitCode === 0) ? 0 : 1);

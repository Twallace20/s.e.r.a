#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { SeraKernel } = require("../packages/kernel/dist/index.js");

function fail(message, detail) {
  console.error(`S.E.R.A. phase20 multi-file dev worker: FAIL ${message}`);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase20-demo-"));
fs.mkdirSync(path.join(rootDir, "src"), { recursive: true });
fs.writeFileSync(path.join(rootDir, "src", "alpha.ts"), "export const alpha = 'old';\n", "utf8");
fs.writeFileSync(path.join(rootDir, "src", "beta.ts"), "export const beta = 'old';\n", "utf8");

const kernel = new SeraKernel({ rootDir });
const result = kernel.runDeveloperMultiPatchTask({
  mode: "direct",
  targets: [
    { relativePath: "src/alpha.ts", operations: [{ kind: "replace", find: "'old'", replaceWith: "'phase20-alpha'", expectedOccurrences: 1 }] },
    { relativePath: "src/beta.ts", operations: [{ kind: "replace", find: "'old'", replaceWith: "'phase20-beta'", expectedOccurrences: 1 }] }
  ],
  validate: ({ files }) => ({
    ok: files.length === 2 && files.every((file) => file.after.includes("phase20")),
    message: "Both Phase 20 files contain the certified replacement."
  })
});

if (!result.ok || !result.multiPatch.changed) fail("multi-file apply did not complete", result);
if (result.multiPatch.fileCount !== 2 || result.multiPatch.changedFileCount !== 2) fail("unexpected changed file count", result.multiPatch);
if (!result.multiPatch.manifestPath || !fs.existsSync(result.multiPatch.manifestPath)) fail("multi-file manifest missing", result.multiPatch);
if (!result.multiPatch.files.every((file) => file.backupPath && fs.existsSync(file.backupPath))) fail("backup evidence missing", result.multiPatch.files);
if (!fs.readFileSync(path.join(rootDir, "src", "alpha.ts"), "utf8").includes("phase20-alpha")) fail("alpha file did not change");
if (!fs.readFileSync(path.join(rootDir, "src", "beta.ts"), "utf8").includes("phase20-beta")) fail("beta file did not change");

const rollbackRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase20-rollback-"));
fs.mkdirSync(path.join(rollbackRoot, "src"), { recursive: true });
fs.writeFileSync(path.join(rollbackRoot, "src", "one.ts"), "export const one = 'old';\n", "utf8");
fs.writeFileSync(path.join(rollbackRoot, "src", "two.ts"), "export const two = 'old';\n", "utf8");
const rollback = new SeraKernel({ rootDir: rollbackRoot }).runDeveloperMultiPatchTask({
  mode: "direct",
  targets: [
    { relativePath: "src/one.ts", operations: [{ kind: "replace", find: "'old'", replaceWith: "'bad-one'", expectedOccurrences: 1 }] },
    { relativePath: "src/two.ts", operations: [{ kind: "replace", find: "'old'", replaceWith: "'bad-two'", expectedOccurrences: 1 }] }
  ],
  validate: () => ({ ok: false, message: "simulated rollback proof" })
});
if (rollback.ok || rollback.status !== "failed" || !rollback.multiPatch.restored) fail("rollback proof did not fail and restore", rollback);
if (!fs.readFileSync(path.join(rollbackRoot, "src", "one.ts"), "utf8").includes("'old'")) fail("rollback did not restore one.ts");
if (!fs.readFileSync(path.join(rollbackRoot, "src", "two.ts"), "utf8").includes("'old'")) fail("rollback did not restore two.ts");

console.log("S.E.R.A. phase20 multi-file dev worker: PASS");
console.log(JSON.stringify({
  ok: true,
  status: "completed",
  mode: result.multiPatch.mode,
  fileCount: result.multiPatch.fileCount,
  changedFileCount: result.multiPatch.changedFileCount,
  totalOccurrences: result.multiPatch.totalOccurrences,
  manifestPath: result.multiPatch.manifestPath,
  backupCount: result.multiPatch.files.filter((file) => file.backupPath).length,
  rollbackRestored: rollback.multiPatch.restored,
  freeCorePreserved: true,
  noPaidServicesRequired: true
}, null, 2));

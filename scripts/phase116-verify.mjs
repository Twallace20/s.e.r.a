#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const phase = "phase116-continuation-loop-smoke-test-v1";
const root = process.cwd();
const requiredFiles = [
  ".overlay/phase116-manifest.json",
  "docs/phases/PHASE_116_CONTINUATION_LOOP_SMOKE_TEST_V1.md",
  "scripts/phase116-verify.mjs"
];

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

const results = [];
for (const rel of requiredFiles) {
  const file = path.join(root, rel);
  results.push({
    check: `exists:${rel}`,
    ok: fs.existsSync(file),
    detail: fs.existsSync(file) ? sha256(file) : "missing"
  });
}

const verifier = path.join(root, "scripts/phase116-verify.mjs");
if (fs.existsSync(verifier)) {
  const syntax = spawnSync(process.execPath, ["--check", verifier], { encoding: "utf8" });
  results.push({
    check: "node_syntax:phase116-verify",
    ok: syntax.status === 0,
    detail: syntax.stderr || syntax.stdout || "syntax ok"
  });
}

if (exists(".overlay/phase116-manifest.json")) {
  const manifest = JSON.parse(read(".overlay/phase116-manifest.json"));
  results.push({ check: "manifest:phase", ok: manifest.phase === 116, detail: String(manifest.phase) });
  results.push({ check: "manifest:zipRoot", ok: manifest.zipRoot === "repo/", detail: manifest.zipRoot || "missing" });
  results.push({ check: "manifest:noNewBrowserAutomation", ok: manifest.browserControl?.addsNewBrowserAutomation === false, detail: JSON.stringify(manifest.browserControl || {}) });
  results.push({ check: "manifest:usesExistingPhase115DownloadController", ok: manifest.browserControl?.usesExistingPhase115DownloadController === true, detail: JSON.stringify(manifest.browserControl || {}) });
}

if (exists("docs/phases/PHASE_116_CONTINUATION_LOOP_SMOKE_TEST_V1.md")) {
  const doc = read("docs/phases/PHASE_116_CONTINUATION_LOOP_SMOKE_TEST_V1.md");
  const requiredPhrases = [
    "Continuation Loop Smoke Test",
    "repo/",
    "s.e.r.a_phase116_continuation_loop_smoke_test_v1_overlay.zip",
    "13_chatgpt_downloads",
    "01_apply_approved",
    "npm run sera:gate",
    "Phase 117"
  ];
  for (const phrase of requiredPhrases) {
    results.push({ check: `doc_contains:${phrase}`, ok: doc.includes(phrase), detail: doc.includes(phrase) ? "found" : "missing" });
  }

  const forbiddenPhrases = [
    "npm install",
    "winget install",
    "api key",
    "token",
    "password",
    "secret",
    "new chat fallback",
    "random recent chat fallback"
  ];
  for (const phrase of forbiddenPhrases) {
    results.push({ check: `doc_forbidden:${phrase}`, ok: !doc.toLowerCase().includes(phrase), detail: doc.toLowerCase().includes(phrase) ? "found" : "not found" });
  }
}

const pass = results.every((result) => result.ok);
const outDir = path.join(root, ".sera-proof", "phase116");
fs.mkdirSync(outDir, { recursive: true });
const report = { phase, status: pass ? "PASS" : "FAIL", createdAt: new Date().toISOString(), results };
const outFile = path.join(outDir, "phase116-verify.json");
fs.writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");

for (const result of results) {
  console.log(`${result.ok ? "✓" : "✗"} ${result.check} — ${result.detail}`);
}
console.log(`Phase 116 verify: ${report.status}`);
console.log(outFile);
process.exit(pass ? 0 : 1);

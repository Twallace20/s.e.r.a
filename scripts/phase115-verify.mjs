#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const phase = "phase115-chatgpt-dom-download-troubleshooter-v1";
const root = process.cwd();
const requiredFiles = [
  "docs/phases/PHASE_115_CHATGPT_DOM_DOWNLOAD_TROUBLESHOOTER_V1.md",
  "docs/autopilot/CHATGPT_DOM_DOWNLOAD_TROUBLESHOOTING.md",
  "scripts/chatgpt-bridge-submit-download.mjs",
  "scripts/sera-chatgpt-submit-download.ps1",
  "scripts/phase115-write-phase116-test-prompt.ps1",
  "scripts/phase115-verify.mjs"
];

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const results = [];
for (const rel of requiredFiles) {
  const file = path.join(root, rel);
  results.push({ check: `exists:${rel}`, ok: fs.existsSync(file), detail: fs.existsSync(file) ? sha256(file) : "missing" });
}

const bridge = path.join(root, "scripts/chatgpt-bridge-submit-download.mjs");
if (fs.existsSync(bridge)) {
  const syntax = spawnSync(process.execPath, ["--check", bridge], { encoding: "utf8" });
  results.push({ check: "node_syntax:chatgpt-bridge-submit-download", ok: syntax.status === 0, detail: syntax.stderr || syntax.stdout || "syntax ok" });
  const source = read("scripts/chatgpt-bridge-submit-download.mjs");
  const requiredTokens = [
    "expectedZipNameFromPrompt",
    "--expected-zip-name",
    "getDownloadCandidates",
    "waitForZipCandidate",
    "clickDownloadCandidate",
    "latestAssistant",
    "downloadCandidate",
    "downloadCandidates",
    "domTroubleshooting",
    "12_browser_helper_blocked",
    "17_needs_attention",
    "SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE",
    "allowNewChatFallback",
    "allowRandomRecentChatFallback"
  ];
  for (const token of requiredTokens) {
    results.push({ check: `contains:${token}`, ok: source.includes(token), detail: source.includes(token) ? "found" : "missing" });
  }
  const forbidden = [
    "allowNewChatFallback = true",
    "allowRandomRecentChatFallback = true",
    "SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE !== false"
  ];
  for (const token of forbidden) {
    results.push({ check: `forbidden:${token}`, ok: !source.includes(token), detail: source.includes(token) ? "found" : "not found" });
  }
}

const wrapper = path.join(root, "scripts/sera-chatgpt-submit-download.ps1");
if (fs.existsSync(wrapper)) {
  const source = read("scripts/sera-chatgpt-submit-download.ps1");
  results.push({ check: "wrapper:ExpectedZipName", ok: source.includes("ExpectedZipName") && source.includes("--expected-zip-name"), detail: "wrapper supports explicit expected ZIP name" });
}

const writer = path.join(root, "scripts/phase115-write-phase116-test-prompt.ps1");
if (fs.existsSync(writer)) {
  const source = read("scripts/phase115-write-phase116-test-prompt.ps1");
  results.push({ check: "phase116_prompt:repo_root", ok: source.includes("ZIP root must be repo/"), detail: "Phase 116 prompt enforces repo/ root" });
  results.push({ check: "phase116_prompt:expected_zip", ok: source.includes("s.e.r.a_phase116_continuation_loop_smoke_test_v1_overlay.zip"), detail: "Phase 116 expected ZIP is explicit" });
}

const pass = results.every((result) => result.ok);
const outDir = path.join(root, ".sera-proof", "phase115");
fs.mkdirSync(outDir, { recursive: true });
const report = { phase, status: pass ? "PASS" : "FAIL", createdAt: new Date().toISOString(), results };
const outFile = path.join(outDir, "phase115-verify.json");
fs.writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");

for (const result of results) console.log(`${result.ok ? "✓" : "✗"} ${result.check} — ${result.detail}`);
console.log(`Phase 115 verify: ${report.status}`);
console.log(outFile);
process.exit(pass ? 0 : 1);

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const phase = "phase113-chatgpt-bridge-submit-download-v1";
const root = process.cwd();
const requiredFiles = [
  "docs/phases/PHASE_113_CHATGPT_BRIDGE_SUBMIT_DOWNLOAD_V1.md",
  "scripts/chatgpt-bridge-submit-download.mjs",
  "scripts/sera-chatgpt-submit-download.ps1",
  "scripts/phase113-write-phase114-test-prompt.ps1"
];

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const results = [];
for (const rel of requiredFiles) {
  const file = path.join(root, rel);
  results.push({ check: `exists:${rel}`, ok: fs.existsSync(file), detail: fs.existsSync(file) ? sha256(file) : "missing" });
}

const script = path.join(root, "scripts/chatgpt-bridge-submit-download.mjs");
if (fs.existsSync(script)) {
  const syntax = spawnSync(process.execPath, ["--check", script], { encoding: "utf8" });
  results.push({ check: "node_syntax:chatgpt-bridge-submit-download", ok: syntax.status === 0, detail: syntax.stderr || syntax.stdout || "syntax ok" });
  const source = fs.readFileSync(script, "utf8");
  const requiredTokens = [
    "SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE",
    "allowRandomRecentChatFallback",
    "allowNewChatFallback",
    "15_bridge_outbox",
    "13_chatgpt_downloads",
    "PAUSE_AUTOPILOT.txt",
    "Browser.setDownloadBehavior",
    "chatgpt.com",
    "sameSavedConversation",
    "writeJson(evidencePath",
    "NEEDS_ATTENTION"
  ];
  for (const token of requiredTokens) {
    results.push({ check: `contains:${token}`, ok: source.includes(token), detail: source.includes(token) ? "found" : "missing" });
  }
  const forbiddenDefaults = [
    "allowNewChatFallback = true",
    "allowRandomRecentChatFallback = true",
    "SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE !== false"
  ];
  for (const token of forbiddenDefaults) {
    results.push({ check: `forbidden-default:${token}`, ok: !source.includes(token), detail: source.includes(token) ? "found" : "not found" });
  }
}

const promptWriter = path.join(root, "scripts/phase113-write-phase114-test-prompt.ps1");
if (fs.existsSync(promptWriter)) {
  const writer = fs.readFileSync(promptWriter, "utf8");
  results.push({ check: "phase114_prompt_mentions_repo_root", ok: writer.includes("ZIP root must be repo/"), detail: "Phase 114 test prompt enforces repo/ root" });
  results.push({ check: "phase114_prompt_names_zip", ok: writer.includes("s.e.r.a_phase114_chatgpt_bridge_end_to_end_smoke_test_v1_overlay.zip"), detail: "Phase 114 output filename is explicit" });
}

const pass = results.every((result) => result.ok);
const outDir = path.join(root, ".sera-proof", "phase113");
fs.mkdirSync(outDir, { recursive: true });
const report = { phase, status: pass ? "PASS" : "FAIL", createdAt: new Date().toISOString(), results };
const outFile = path.join(outDir, "phase113-verify.json");
fs.writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");

for (const result of results) {
  console.log(`${result.ok ? "✓" : "✗"} ${result.check} — ${result.detail}`);
}
console.log(`Phase 113 verify: ${report.status}`);
console.log(outFile);
process.exit(pass ? 0 : 1);

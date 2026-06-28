#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const phase = "phase114-autopilot-end-to-end-validation-harness-v1";
const root = process.cwd();

const requiredFiles = [
  "docs/phases/PHASE_114_AUTOPILOT_END_TO_END_VALIDATION_HARNESS_V1.md",
  "docs/autopilot/AUTOPILOT_PROMPT_CONTRACT.md",
  "docs/autopilot/NORMAL_PHASE_PROMPT_TEMPLATE.md",
  "docs/autopilot/REPAIR_HOTFIX_PROMPT_TEMPLATE.md",
  "scripts/phase114-build-bridge-prompt.ps1",
  "scripts/phase114-write-phase115-test-prompt.ps1",
  "scripts/phase114-verify.mjs"
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
  results.push({
    check: `exists:${rel}`,
    ok: fs.existsSync(file),
    detail: fs.existsSync(file) ? sha256(file) : "missing"
  });
}

const verifyFile = path.join(root, "scripts/phase114-verify.mjs");
if (fs.existsSync(verifyFile)) {
  const syntax = spawnSync(process.execPath, ["--check", verifyFile], { encoding: "utf8" });
  results.push({
    check: "node_syntax:phase114-verify",
    ok: syntax.status === 0,
    detail: syntax.stderr || syntax.stdout || "syntax ok"
  });
}

const tokenChecks = [
  ["docs/autopilot/AUTOPILOT_PROMPT_CONTRACT.md", "The laptop does not ask vague questions"],
  ["docs/autopilot/AUTOPILOT_PROMPT_CONTRACT.md", "repo/"],
  ["docs/autopilot/AUTOPILOT_PROMPT_CONTRACT.md", "NEEDS_ATTENTION"],
  ["docs/autopilot/AUTOPILOT_PROMPT_CONTRACT.md", "must not invent"],
  ["docs/autopilot/NORMAL_PHASE_PROMPT_TEMPLATE.md", "{{CURRENT_STATE}}"],
  ["docs/autopilot/NORMAL_PHASE_PROMPT_TEMPLATE.md", "{{NEXT_PHASE_NUMBER}}"],
  ["docs/autopilot/NORMAL_PHASE_PROMPT_TEMPLATE.md", "ZIP must use this root"],
  ["docs/autopilot/NORMAL_PHASE_PROMPT_TEMPLATE.md", "repo/"],
  ["docs/autopilot/NORMAL_PHASE_PROMPT_TEMPLATE.md", "npm run sera:gate"],
  ["docs/autopilot/NORMAL_PHASE_PROMPT_TEMPLATE.md", "If you cannot determine"],
  ["docs/autopilot/REPAIR_HOTFIX_PROMPT_TEMPLATE.md", "{{BLOCKED_PACKET}}"],
  ["docs/autopilot/REPAIR_HOTFIX_PROMPT_TEMPLATE.md", "Do not invent"],
  ["docs/autopilot/REPAIR_HOTFIX_PROMPT_TEMPLATE.md", "repo/"],
  ["scripts/phase114-build-bridge-prompt.ps1", "allowNewChatFallback"],
  ["scripts/phase114-build-bridge-prompt.ps1", "allowRandomRecentChatFallback"],
  ["scripts/phase114-build-bridge-prompt.ps1", "15_bridge_outbox"],
  ["scripts/phase114-build-bridge-prompt.ps1", "CLOSED_CLEANLY"],
  ["scripts/phase114-build-bridge-prompt.ps1", "BLOCKED"],
  ["scripts/phase114-write-phase115-test-prompt.ps1", "Intentional Blocked Repair Loop Smoke Test v1"]
];

for (const [rel, token] of tokenChecks) {
  const file = path.join(root, rel);
  const source = fs.existsSync(file) ? read(rel) : "";
  results.push({
    check: `contains:${rel}:${token}`,
    ok: source.includes(token),
    detail: source.includes(token) ? "found" : "missing"
  });
}

const forbidden = [
  ["scripts/phase114-build-bridge-prompt.ps1", "allowNewChatFallback = $true"],
  ["scripts/phase114-build-bridge-prompt.ps1", "allowRandomRecentChatFallback = $true"],
  ["docs/autopilot/NORMAL_PHASE_PROMPT_TEMPLATE.md", "s.e.r.a/"],
  ["docs/autopilot/REPAIR_HOTFIX_PROMPT_TEMPLATE.md", "s.e.r.a/"]
];

for (const [rel, token] of forbidden) {
  const file = path.join(root, rel);
  const source = fs.existsSync(file) ? read(rel) : "";
  results.push({
    check: `forbidden:${rel}:${token}`,
    ok: !source.includes(token),
    detail: source.includes(token) ? "found" : "not found"
  });
}

const pass = results.every((result) => result.ok);
const outDir = path.join(root, ".sera-proof", "phase114");
fs.mkdirSync(outDir, { recursive: true });
const report = { phase, status: pass ? "PASS" : "FAIL", createdAt: new Date().toISOString(), results };
const outFile = path.join(outDir, "phase114-verify.json");
fs.writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");

for (const result of results) {
  console.log(`${result.ok ? "✓" : "✗"} ${result.check} — ${result.detail}`);
}
console.log(`Phase 114 verify: ${report.status}`);
console.log(outFile);
process.exit(pass ? 0 : 1);

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const phase = "phase112-chatgpt-bridge-dom-inspector-v1";
const root = process.cwd();
const requiredFiles = [
  "docs/phases/PHASE_112_CHATGPT_BRIDGE_DOM_INSPECTOR_V1.md",
  "scripts/chatgpt-bridge-dom-inspector.mjs",
  "scripts/phase112-set-chatgpt-target.ps1",
  "scripts/sera-chatgpt-dom-inspector.ps1"
];

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const results = [];
for (const rel of requiredFiles) {
  const file = path.join(root, rel);
  results.push({ check: `exists:${rel}`, ok: fs.existsSync(file), detail: fs.existsSync(file) ? sha256(file) : "missing" });
}

const script = path.join(root, "scripts/chatgpt-bridge-dom-inspector.mjs");
if (fs.existsSync(script)) {
  const syntax = spawnSync(process.execPath, ["--check", script], { encoding: "utf8" });
  results.push({ check: "node_syntax:chatgpt-bridge-dom-inspector", ok: syntax.status === 0, detail: syntax.stderr || syntax.stdout || "syntax ok" });
  const source = fs.readFileSync(script, "utf8");
  const forbidden = [
    "Input.dispatchKeyEvent",
    "Input.insertText",
    "page.click",
    ".click()",
    "downloadFile",
    "setDownloadBehavior",
    "textarea.value =",
    "el.value =",
    "innerText =",
    "textContent ="
  ];
  for (const token of forbidden) {
    results.push({ check: `forbidden:${token}`, ok: !source.includes(token), detail: source.includes(token) ? "found" : "not found" });
  }
  results.push({ check: "contains:composer-selectors", ok: source.includes("prompt-textarea") && source.includes("contenteditable"), detail: "checks ChatGPT composer selectors" });
  results.push({ check: "contains:no-random-fallback", ok: source.includes("allowRandomRecentChatFallback") && source.includes("allowNewChatFallback"), detail: "checks fallback controls" });
}

const pass = results.every((result) => result.ok);
const outDir = path.join(root, ".sera-proof", "phase112");
fs.mkdirSync(outDir, { recursive: true });
const report = {
  phase,
  status: pass ? "PASS" : "FAIL",
  createdAt: new Date().toISOString(),
  results
};
const outFile = path.join(outDir, "phase112-verify.json");
fs.writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");

for (const result of results) {
  console.log(`${result.ok ? "✓" : "✗"} ${result.check} — ${result.detail}`);
}
console.log(`Phase 112 verify: ${report.status}`);
console.log(outFile);
process.exit(pass ? 0 : 1);

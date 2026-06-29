#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const required = [
  "scripts/chatgpt-bridge-submit-download.mjs",
  "scripts/sera-chatgpt-submit-download.ps1",
  "scripts/sera-chatgpt-artifact-watcher.mjs",
  "scripts/sera-chatgpt-target-normalize.mjs",
  "scripts/sera-chatgpt-target-normalize.ps1",
  "docs/autopilot/SAFE_AUTOPILOT_CONTINUATION_V1.md",
  "docs/phases/PHASE_123_SAFE_AUTOPILOT_CONTINUATION_V1.md",
  ".overlay/phase123-manifest.json",
  ".sera-proof/phase123/phase123-verify.json"
];

const failures = [];
for (const file of required) {
  if (!fs.existsSync(path.join(process.cwd(), file))) failures.push(`missing ${file}`);
}

for (const file of [
  "scripts/chatgpt-bridge-submit-download.mjs",
  "scripts/sera-chatgpt-artifact-watcher.mjs",
  "scripts/sera-chatgpt-target-normalize.mjs"
]) {
  if (fs.existsSync(file)) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) failures.push(`${file} syntax failed: ${result.stderr || result.stdout}`);
  }
}

const bridgeText = fs.existsSync("scripts/chatgpt-bridge-submit-download.mjs") ? fs.readFileSync("scripts/chatgpt-bridge-submit-download.mjs", "utf8") : "";
const watcherText = fs.existsSync("scripts/sera-chatgpt-artifact-watcher.mjs") ? fs.readFileSync("scripts/sera-chatgpt-artifact-watcher.mjs", "utf8") : "";
const normalizerText = fs.existsSync("scripts/sera-chatgpt-target-normalize.mjs") ? fs.readFileSync("scripts/sera-chatgpt-target-normalize.mjs", "utf8") : "";

for (const [name, text] of [["bridge", bridgeText], ["watcher", watcherText], ["normalizer", normalizerText]]) {
  if (!text.includes("conversationIdFromUrl")) failures.push(`${name} missing conversationIdFromUrl`);
  if (!text.includes("allowNewChatFallback") || !text.includes("allowRandomRecentChatFallback")) failures.push(`${name} missing fallback guard references`);
}

if (!bridgeText.includes("00_control_center")) failures.push("bridge does not read control-center target config");

const output = {
  phaseId: "phase123-safe-autopilot-continuation-v1",
  valid: failures.length === 0,
  failures,
  createdAt: new Date().toISOString()
};
console.log(JSON.stringify(output, null, 2));
if (failures.length) process.exitCode = 1;

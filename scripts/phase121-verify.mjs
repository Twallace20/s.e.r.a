#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const required = [
  "scripts/sera-chatgpt-artifact-watcher.mjs",
  "scripts/sera-autopilot-loop.mjs",
  "scripts/sera-autopilot-continue.ps1",
  "docs/autopilot/CONTROL_CENTER_ACTIVE_MISSION_DEDUPE_HARDENING.md",
  "docs/phases/PHASE_121_CONTROL_CENTER_ACTIVE_MISSION_DEDUPE_HARDENING_V1.md",
  ".overlay/phase121-manifest.json",
  ".sera-proof/phase121"
];

const failures = [];
for (const file of required) {
  if (!fs.existsSync(file)) failures.push(`missing: ${file}`);
}
for (const file of ["scripts/sera-chatgpt-artifact-watcher.mjs", "scripts/sera-autopilot-loop.mjs"]) {
  if (fs.existsSync(file)) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) failures.push(`syntax failed: ${file}\n${result.stderr}`);
  }
}
const watcher = fs.existsSync("scripts/sera-chatgpt-artifact-watcher.mjs") ? fs.readFileSync("scripts/sera-chatgpt-artifact-watcher.mjs", "utf8") : "";
const loop = fs.existsSync("scripts/sera-autopilot-loop.mjs") ? fs.readFileSync("scripts/sera-autopilot-loop.mjs", "utf8") : "";
const ps1 = fs.existsSync("scripts/sera-autopilot-continue.ps1") ? fs.readFileSync("scripts/sera-autopilot-continue.ps1", "utf8") : "";
if (!watcher.includes("idle_no_active_artifact_request")) failures.push("watcher must not fall back to newest prompt without active request");
if (!watcher.includes("completedHandoffFor")) failures.push("watcher must detect already closed phases");
if (!watcher.includes("decodeText")) failures.push("watcher must use JSON/text decode hardening");
if (!loop.includes("writeArtifactWatchRequest")) failures.push("autopilot loop must write active artifact request");
if (!loop.includes("decodeText")) failures.push("autopilot loop must use JSON/text decode hardening");
if (!ps1.includes("UTF8Encoding($false)")) failures.push("autopilot PowerShell must write JSON UTF-8 without BOM");
const proof = {
  phaseId: "phase121-control-center-active-mission-dedupe-hardening-v1",
  valid: failures.length === 0,
  failures,
  createdAt: new Date().toISOString()
};
fs.mkdirSync(".sera-proof/phase121", { recursive: true });
fs.writeFileSync(".sera-proof/phase121/phase121-verify.json", JSON.stringify(proof, null, 2) + "\n", "utf8");
console.log(JSON.stringify(proof, null, 2));
if (failures.length) process.exit(1);

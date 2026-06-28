#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const required = [
  "docs/phases/PHASE_118_AUTOPILOT_GOVERNOR_CONTROL_CENTER_V1.md",
  "docs/autopilot/CONTROL_CENTER_CONTRACT.md",
  "scripts/chatgpt-bridge-submit-download.mjs",
  "scripts/sera-autopilot-governor.mjs",
  "scripts/sera-control-center-init.ps1",
  "scripts/phase118-verify.mjs",
  ".overlay/phase118-manifest.json",
  ".sera-proof/phase118/phase118-verify.json"
];
const results = [];
function sha(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function check(name, ok, detail = "") { results.push({ check: name, ok, detail }); if (!ok) process.exitCode = 1; }
for (const file of required) check(`exists:${file}`, fs.existsSync(file), fs.existsSync(file) ? sha(file) : "missing");
for (const file of ["scripts/chatgpt-bridge-submit-download.mjs", "scripts/sera-autopilot-governor.mjs", "scripts/phase118-verify.mjs"]) {
  try { execFileSync(process.execPath, ["--check", file], { stdio: "pipe" }); check(`node_syntax:${file}`, true, "syntax ok"); }
  catch (error) { check(`node_syntax:${file}`, false, String(error)); }
}
const bridge = fs.existsSync("scripts/chatgpt-bridge-submit-download.mjs") ? fs.readFileSync("scripts/chatgpt-bridge-submit-download.mjs", "utf8") : "";
for (const needle of [
  "phase118-autopilot-governor-control-center-v1",
  "controlCenterDir",
  "targetConfigCandidates",
  "00_control_center",
  "chatgpt-target.json",
  "targetSource",
  "stop.flag",
  "pause.flag",
  "allowRandomRecentChatFallback"
]) check(`bridge_contains:${needle}`, bridge.includes(needle), bridge.includes(needle) ? "found" : "missing");
const governor = fs.existsSync("scripts/sera-autopilot-governor.mjs") ? fs.readFileSync("scripts/sera-autopilot-governor.mjs", "utf8") : "";
for (const needle of [
  "autopilot-state.json",
  "phase-mission.json",
  "service-registry.json",
  "stopOnNeedsAttention",
  "maxRepairAttemptsPerPhase",
  "allowSafeAutoMerge",
  "needsAttention"
]) check(`governor_contains:${needle}`, governor.includes(needle), governor.includes(needle) ? "found" : "missing");
console.log(JSON.stringify({ phase: "phase118-autopilot-governor-control-center-v1", status: process.exitCode ? "FAIL" : "PASS", results }, null, 2));

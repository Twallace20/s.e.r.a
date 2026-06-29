#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const required = [
  "docs/phases/PHASE_119_AUTOPILOT_CONTINUATION_LOOP_REPAIR_ORCHESTRATOR_V1.md",
  "docs/autopilot/AUTOPILOT_CONTINUATION_LOOP_CONTRACT.md",
  "scripts/sera-autopilot-loop.mjs",
  "scripts/sera-autopilot-continue.ps1",
  "scripts/sera-autopilot-repair-orchestrator.mjs",
  "scripts/phase119-verify.mjs",
  ".overlay/phase119-manifest.json",
  ".sera-proof/phase119/phase119-verify.json"
];
const results = [];
function sha(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function check(name, ok, detail = "") { results.push({ check: name, ok, detail }); if (!ok) process.exitCode = 1; }
for (const file of required) check(`exists:${file}`, fs.existsSync(file), fs.existsSync(file) ? sha(file) : "missing");
for (const file of ["scripts/sera-autopilot-loop.mjs", "scripts/sera-autopilot-repair-orchestrator.mjs", "scripts/phase119-verify.mjs"]) {
  try { execFileSync(process.execPath, ["--check", file], { stdio: "pipe" }); check(`node_syntax:${file}`, true, "syntax ok"); }
  catch (error) { check(`node_syntax:${file}`, false, String(error)); }
}
const loop = fs.existsSync("scripts/sera-autopilot-loop.mjs") ? fs.readFileSync("scripts/sera-autopilot-loop.mjs", "utf8") : "";
for (const needle of [
  "15_bridge_outbox",
  "13_chatgpt_downloads",
  "SERA Download Router",
  "SERA AutoOps Runner",
  "SERA Safe Merge Auto Approver",
  "maxRepairAttemptsPerPhase",
  "stopPauseDecision",
  "allowRandomRecentChatFallback",
  "phase-mission.json",
  "repair-orchestrator"
]) check(`loop_contains:${needle}`, loop.includes(needle), loop.includes(needle) ? "found" : "missing");
const repair = fs.existsSync("scripts/sera-autopilot-repair-orchestrator.mjs") ? fs.readFileSync("scripts/sera-autopilot-repair-orchestrator.mjs", "utf8") : "";
for (const needle of ["repair_prompt_ready", "owner_required", "HOTFIX overlay ZIP", "sanitizeForBridge", "hard-stop keyword"]) {
  check(`repair_contains:${needle}`, repair.includes(needle), repair.includes(needle) ? "found" : "missing");
}
const contract = fs.existsSync("docs/autopilot/AUTOPILOT_CONTINUATION_LOOP_CONTRACT.md") ? fs.readFileSync("docs/autopilot/AUTOPILOT_CONTINUATION_LOOP_CONTRACT.md", "utf8") : "";
for (const needle of ["Loop sequence", "Recoverable examples", "Owner-stop examples", "Bounded execution", "Safe auto-merge"]) {
  check(`contract_contains:${needle}`, contract.includes(needle), contract.includes(needle) ? "found" : "missing");
}
console.log(JSON.stringify({ phase: "phase119-autopilot-continuation-loop-repair-orchestrator-v1", status: process.exitCode ? "FAIL" : "PASS", results }, null, 2));

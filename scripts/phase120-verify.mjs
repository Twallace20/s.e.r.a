#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const required = [
  "docs/phases/PHASE_120_CHATGPT_ARTIFACT_WATCHER_SCHEDULER_V1.md",
  "docs/autopilot/CHATGPT_ARTIFACT_WATCHER_SCHEDULER_CONTRACT.md",
  "scripts/sera-chatgpt-artifact-watcher.mjs",
  "scripts/sera-chatgpt-artifact-watch.ps1",
  "scripts/sera-chatgpt-artifact-watcher-schedule.ps1",
  "scripts/phase120-verify.mjs",
  ".overlay/phase120-manifest.json",
  ".sera-proof/phase120/phase120-verify.json"
];

const results = [];
function sha(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function check(name, ok, detail = "") { results.push({ check: name, ok, detail }); if (!ok) process.exitCode = 1; }

for (const file of required) check(`exists:${file}`, fs.existsSync(file), fs.existsSync(file) ? sha(file) : "missing");
for (const file of ["scripts/sera-chatgpt-artifact-watcher.mjs", "scripts/phase120-verify.mjs"]) {
  try { execFileSync(process.execPath, ["--check", file], { stdio: "pipe" }); check(`node_syntax:${file}`, true, "syntax ok"); }
  catch (error) { check(`node_syntax:${file}`, false, String(error)); }
}

const watcher = fs.existsSync("scripts/sera-chatgpt-artifact-watcher.mjs") ? fs.readFileSync("scripts/sera-chatgpt-artifact-watcher.mjs", "utf8") : "";
for (const needle of [
  "artifact-watcher-ledger.json",
  "15_bridge_outbox",
  "13_chatgpt_downloads",
  "01_apply_approved",
  "02_hotfix_approved",
  "hotfix-shaped artifact cannot be routed while current branch",
  "allowNewChatFallback",
  "allowRandomRecentChatFallback",
  "Page.reload",
  "SERA AutoOps Runner",
  "CHATGPT_ARTIFACT_WATCHER_NEEDS_ATTENTION"
]) check(`watcher_contains:${needle}`, watcher.includes(needle), watcher.includes(needle) ? "found" : "missing");

const schedule = fs.existsSync("scripts/sera-chatgpt-artifact-watcher-schedule.ps1") ? fs.readFileSync("scripts/sera-chatgpt-artifact-watcher-schedule.ps1", "utf8") : "";
for (const needle of ["Register-ScheduledTask", "SERA ChatGPT Artifact Watcher", "-Once -StartRunner", "Unregister-ScheduledTask"]) {
  check(`scheduler_contains:${needle}`, schedule.includes(needle), schedule.includes(needle) ? "found" : "missing");
}

const wrapper = fs.existsSync("scripts/sera-chatgpt-artifact-watch.ps1") ? fs.readFileSync("scripts/sera-chatgpt-artifact-watch.ps1", "utf8") : "";
for (const needle of ["--route-mode", "--refresh-ms", "--max-attempts-per-prompt", "sera-chatgpt-artifact-watcher.mjs"]) {
  check(`wrapper_contains:${needle}`, wrapper.includes(needle), wrapper.includes(needle) ? "found" : "missing");
}

console.log(JSON.stringify({ phase: "phase120-chatgpt-artifact-watcher-scheduler-v1", valid: results.every((r) => r.ok), results }, null, 2));

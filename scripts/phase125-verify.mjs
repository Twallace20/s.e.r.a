#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repo = process.cwd();
const required = [
  "scripts/sera-autopilot-loop.mjs",
  "scripts/sera-autopilot-repair-orchestrator.mjs",
  "scripts/sera-hotfix-overlay-protocol.mjs",
  "scripts/sera-hotfix-overlay-protocol.ps1",
  "docs/autopilot/BLOCKED_PHASE_HOTFIX_OVERLAY_PROTOCOL_V1.md",
  "docs/phases/PHASE_125_BLOCKED_PHASE_HOTFIX_OVERLAY_PROTOCOL_V1.md",
  ".overlay/phase125-manifest.json",
  ".sera-proof/phase125/phase125-verify.json"
];
const missing = required.filter((rel) => !fs.existsSync(path.join(repo, rel)));
const syntaxFiles = [
  "scripts/sera-autopilot-loop.mjs",
  "scripts/sera-autopilot-repair-orchestrator.mjs",
  "scripts/sera-hotfix-overlay-protocol.mjs"
];
const checks = syntaxFiles.map((rel) => {
  const result = spawnSync(process.execPath, ["--check", path.join(repo, rel)], { encoding: "utf8" });
  return { rel, status: result.status, stderr: result.stderr };
});
const repairText = fs.existsSync(path.join(repo, "scripts/sera-autopilot-repair-orchestrator.mjs"))
  ? fs.readFileSync(path.join(repo, "scripts/sera-autopilot-repair-orchestrator.mjs"), "utf8")
  : "";
const loopText = fs.existsSync(path.join(repo, "scripts/sera-autopilot-loop.mjs"))
  ? fs.readFileSync(path.join(repo, "scripts/sera-autopilot-loop.mjs"), "utf8")
  : "";
const protocolChecks = [
  { name: "hotfix-request-state", ok: repairText.includes("active-hotfix-request.json") },
  { name: "hotfix-route-hint", ok: repairText.includes("02_hotfix_approved") && loopText.includes("02_hotfix_approved") },
  { name: "repair-prompt-is-used", ok: loopText.includes("task.promptFile") && loopText.includes("repair.promptFile") },
  { name: "retry-after-hotfix", ok: loopText.includes("retryAfterHotfixAttempt") && loopText.includes("hotfixResult") },
  { name: "owner-required-stop", ok: repairText.includes("owner_required") }
];
const ok = missing.length === 0 && checks.every((check) => check.status === 0) && protocolChecks.every((check) => check.ok);
const result = {
  ok,
  phase: 125,
  version: "phase125-blocked-phase-hotfix-overlay-protocol-v1",
  requiredCount: required.length,
  missing,
  checks,
  protocolChecks,
  verifiedAt: new Date().toISOString()
};
console.log(JSON.stringify(result, null, 2));
if (!ok) process.exitCode = 2;

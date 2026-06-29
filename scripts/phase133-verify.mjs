#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const required = [
  "scripts/chatgpt-bridge-submit-download.mjs",
  "scripts/sera-chatgpt-submit-download.ps1",
  "scripts/sera-phone-control-job.mjs",
  "docs/phases/PHASE_133_BRIDGE_CONTEXTUAL_RISK_FILTER_ACTIVE_COMMAND_ISOLATION_V1.md",
  "docs/autopilot/BRIDGE_CONTEXTUAL_RISK_FILTER_ACTIVE_COMMAND_ISOLATION_V1.md",
  ".overlay/phase133-manifest.json",
  ".sera-proof/phase133/phase133-verify.json"
];
const missing = required.filter((file) => !fs.existsSync(path.join(process.cwd(), file)));
const bridge = fs.existsSync(path.join(process.cwd(), "scripts/chatgpt-bridge-submit-download.mjs")) ? fs.readFileSync(path.join(process.cwd(), "scripts/chatgpt-bridge-submit-download.mjs"), "utf8") : "";
const phoneJob = fs.existsSync(path.join(process.cwd(), "scripts/sera-phone-control-job.mjs")) ? fs.readFileSync(path.join(process.cwd(), "scripts/sera-phone-control-job.mjs"), "utf8") : "";
const checks = {
  missing,
  contextualRiskFilterInstalled: bridge.includes("riskMatches(prompt)") && bridge.includes("allowSafetyContext") && bridge.includes("Prompt blocked by contextual bridge risk filter"),
  negativeSafetyLanguageAllowed: bridge.includes("do not") && bridge.includes("stop on") && bridge.includes("owner judgment"),
  phoneBlockedReasonIncludesRunnerDetail: phoneJob.includes("Runner detail") && phoneJob.includes("stdout") && phoneJob.includes("stderr"),
  bridgePhaseVersionUpdated: bridge.includes("phase133-bridge-contextual-risk-filter-active-command-isolation-v1")
};
const valid = missing.length === 0 && checks.contextualRiskFilterInstalled && checks.negativeSafetyLanguageAllowed && checks.phoneBlockedReasonIncludesRunnerDetail && checks.bridgePhaseVersionUpdated;
const result = { phaseId: "phase133-bridge-contextual-risk-filter-active-command-isolation-v1", valid, checks, createdAt: new Date().toISOString() };
console.log(JSON.stringify(result, null, 2));
if (!valid) process.exit(1);

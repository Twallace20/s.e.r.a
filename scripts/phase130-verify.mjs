#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const required = [
  "scripts/sera-phone-control-scheduled-watcher.mjs",
  "scripts/sera-phone-control-scheduled-watcher.ps1",
  "scripts/sera-phone-control-job.mjs",
  "scripts/sera-phone-control-job.ps1",
  "00_control_center_templates/autopilot-command.queue.example.json",
  "docs/autopilot/PHONE_COMMAND_QUEUE_STATUS_LIFECYCLE_V1.md",
  "docs/phases/PHASE_130_PHONE_COMMAND_QUEUE_STATUS_LIFECYCLE_V1.md",
  ".overlay/phase130-manifest.json",
  ".sera-proof/phase130/phase130-verify.json"
];
const missing = required.filter(file => !fs.existsSync(path.join(root, file)));
const watcher = fs.existsSync(path.join(root, "scripts/sera-phone-control-scheduled-watcher.mjs")) ? fs.readFileSync(path.join(root, "scripts/sera-phone-control-scheduled-watcher.mjs"), "utf8") : "";
const job = fs.existsSync(path.join(root, "scripts/sera-phone-control-job.mjs")) ? fs.readFileSync(path.join(root, "scripts/sera-phone-control-job.mjs"), "utf8") : "";
const checks = {
  queueFolderMentioned: watcher.includes("command_inbox"),
  wildcardSupported: watcher.includes("autopilot-command") && watcher.includes(".json"),
  commandStatusLifecycle: watcher.includes("commandStatus") && job.includes("commandStatus"),
  acceptsNewOnly: watcher.includes('command.commandStatus === "new"'),
  updatesComplete: job.includes('commandStatus: ok ? "complete" : "blocked"'),
  singleRunLock: job.includes("phone-control-run.lock.json"),
  statusMarkdown: watcher.includes("AUTOPILOT_STATUS.md") || job.includes("AUTOPILOT_STATUS.md"),
  savedTargetPreservedByDelegation: job.includes("sera-autopilot-continue.ps1") && job.includes("-EnableAutopilotForThisRun")
};
const failures = [];
if (missing.length) failures.push(`Missing files: ${missing.join(", ")}`);
for (const [name, ok] of Object.entries(checks)) if (!ok) failures.push(`Check failed: ${name}`);
const result = {
  phaseId: "phase130-phone-command-queue-status-lifecycle-v1",
  valid: failures.length === 0,
  missing,
  checks,
  failures,
  createdAt: new Date().toISOString()
};
const out = path.join(root, ".sera-proof", "phase130", "phase130-verify-runtime.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exitCode = 1;

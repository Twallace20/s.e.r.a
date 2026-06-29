#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const required = [
  "scripts/sera-phone-control-scheduled-watcher.mjs",
  "scripts/sera-phone-control-scheduled-watcher.ps1",
  "scripts/sera-phone-control-job.mjs",
  "scripts/sera-phone-control-job.ps1",
  "00_control_center_templates/autopilot-command.phase131-e2e.example.json",
  "docs/autopilot/PHONE_AUTOPILOT_END_TO_END_ORCHESTRATOR_V1.md",
  "docs/phases/PHASE_131_PHONE_AUTOPILOT_END_TO_END_ORCHESTRATOR_V1.md",
  ".overlay/phase131-manifest.json",
  ".sera-proof/phase131/phase131-verify.json"
];
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8"); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function runNode(script, env) {
  return spawnSync("node", [script, "--run-once", "--json", "--force"], { cwd: root, encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 1024 * 1024 * 20 });
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase131-e2e-"));
const autoOps = path.join(tmp, "SERA-AutoOps");
const control = path.join(autoOps, "00_control_center");
const inbox = path.join(control, "command_inbox");
const handoff = path.join(autoOps, "06_handoff");
ensureDir(inbox); ensureDir(handoff);
const commandFile = path.join(control, "autopilot-command.json");
writeJson(commandFile, {
  schemaVersion: 2,
  commandId: "phase131-verify-closed-001",
  commandStatus: "new",
  enabled: true,
  action: "run_range",
  phaseStart: 931,
  phaseEnd: 931,
  maxPhases: 1,
  guide: "Verifier: prove phone command goes from new to running to complete based on CLOSED_CLEANLY handoff.",
  stopAfterRange: true,
  pauseAfterCurrentPhase: false,
  emergencyStop: false,
  updatedBy: "phase131-verify",
  updatedReason: "e2e lifecycle proof"
});
const watcher = path.join(root, "scripts", "sera-phone-control-scheduled-watcher.mjs");
const first = runNode(watcher, { SERA_AUTOOPS_DIR: autoOps, SERA_PHONE_E2E_TEST_MODE: "closed" });
const closedCommand = readJson(commandFile);
const statusMd = fs.existsSync(path.join(control, "AUTOPILOT_STATUS.md")) ? fs.readFileSync(path.join(control, "AUTOPILOT_STATUS.md"), "utf8") : "";
const closedHandoffs = fs.readdirSync(handoff).filter(name => /CLOSED_CLEANLY/.test(name));
const staleFile = path.join(inbox, "autopilot-command-stale-accepted.json");
writeJson(staleFile, {
  schemaVersion: 2,
  commandId: "phase131-verify-stale-accepted-001",
  commandStatus: "accepted",
  status: "accepted",
  enabled: true,
  action: "run_range",
  phaseStart: 932,
  phaseEnd: 932,
  maxPhases: 1,
  guide: "Verifier: prove stale accepted command blocks when no handoff exists.",
  acceptedAt: "2000-01-01T00:00:00.000Z",
  stopAfterRange: true,
  pauseAfterCurrentPhase: false,
  emergencyStop: false,
  updatedBy: "phase131-verify",
  updatedReason: "stale accepted proof"
});
const second = runNode(watcher, { SERA_AUTOOPS_DIR: autoOps, SERA_PHONE_ACCEPTED_STALE_MS: "1" });
const staleCommand = readJson(staleFile);
const scheduledPs1 = fs.readFileSync(path.join(root, "scripts", "sera-phone-control-scheduled-watcher.ps1"), "utf8");
const watcherText = fs.readFileSync(watcher, "utf8");
const jobText = fs.readFileSync(path.join(root, "scripts", "sera-phone-control-job.mjs"), "utf8");
const missing = required.filter(file => !fs.existsSync(path.join(root, file)));
const checks = {
  requiredFilesPresent: missing.length === 0,
  defaultTwoMinuteSchedule: /EveryMinutes\s*=\s*2/.test(scheduledPs1),
  scansDefaultCommand: watcherText.includes("autopilot-command.json"),
  scansCommandInboxWildcard: watcherText.includes("command_inbox") && watcherText.includes("autopilot-command") && watcherText.includes(".json"),
  acceptsNewOnly: watcherText.includes('command.commandStatus === "new"'),
  immediatelyMovesToRunning: watcherText.includes('commandStatus: "running"') && watcherText.includes("lastRunStartedAt"),
  jobMovesToRunning: jobText.includes('commandStatus: "running"') && jobText.includes("lastRunStartedAt"),
  missingHandoffBlocks: watcherText.includes("No handoff was produced") && jobText.includes("Missing final handoff"),
  latestHandoffSurfaced: watcherText.includes("Latest Handoff") && jobText.includes("Latest Handoff"),
  staleAcceptedBlocks: staleCommand.commandStatus === "blocked" && String(staleCommand.blockedReason || "").includes("accepted"),
  e2eClosedCommandComplete: closedCommand.commandStatus === "complete" && closedCommand.enabled === false && closedCommand.latestHandoffStatus === "CLOSED_CLEANLY",
  e2eClosedHandoffWritten: closedHandoffs.length > 0,
  statusMentionsLatestHandoff: statusMd.includes("Latest Handoff") || Boolean(closedCommand.latestHandoffPath)
};
const failures = [];
if (missing.length) failures.push(`Missing files: ${missing.join(", ")}`);
for (const [name, ok] of Object.entries(checks)) if (!ok) failures.push(`Check failed: ${name}`);
if (first.status !== 0) failures.push(`Closed e2e run exited ${first.status}: ${first.stderr || first.stdout}`);
if (second.status === null) failures.push(`Stale recovery run did not exit cleanly: ${second.stderr || second.stdout}`);
const result = {
  phaseId: "phase131-phone-autopilot-end-to-end-orchestrator-v1",
  valid: failures.length === 0,
  missing,
  checks,
  failures,
  proof: {
    tempAutoOps: autoOps,
    closedCommand,
    staleCommand,
    closedHandoffs,
    firstExitCode: first.status,
    secondExitCode: second.status
  },
  createdAt: new Date().toISOString()
};
const out = path.join(root, ".sera-proof", "phase131", "phase131-verify-runtime.json");
ensureDir(path.dirname(out));
fs.writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exitCode = 1;

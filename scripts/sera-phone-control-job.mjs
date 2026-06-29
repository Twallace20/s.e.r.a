#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const VERSION = "phase128-phone-control-center-job-file-v1";

function autoOpsDir() { return process.env.SERA_AUTOOPS_DIR || path.join(os.homedir(), "OneDrive", "SERA-AutoOps"); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function timestamp() { return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "_"); }
function decode(buffer) {
  if (!buffer || buffer.length === 0) return "";
  let text = buffer.toString("utf8");
  const nulls = (text.match(/\u0000/g) || []).length;
  if (nulls > Math.max(2, text.length / 20)) text = buffer.toString("utf16le");
  return text.replace(/^\uFEFF/, "").replace(/\u0000/g, "");
}
function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  const text = decode(fs.readFileSync(file)).trim();
  if (!text) return fallback;
  return JSON.parse(text);
}
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8"); }
function writeText(file, text) { ensureDir(path.dirname(file)); fs.writeFileSync(file, text, "utf8"); }
function readText(file, fallback = "") { return fs.existsSync(file) ? decode(fs.readFileSync(file)) : fallback; }
function sha(value) { return crypto.createHash("sha256").update(String(value)).digest("hex").toUpperCase(); }
function psExe() { return process.platform === "win32" ? "powershell" : "pwsh"; }
function repoRoot() { return path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."); }
function parseArgs(argv) {
  const args = { run: false, status: false, init: false, dryRun: false, json: false };
  for (const arg of argv) {
    if (arg === "--run") args.run = true;
    else if (arg === "--status") args.status = true;
    else if (arg === "--init") args.init = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--json") args.json = true;
  }
  return args;
}
function defaultGuide() {
  return "Continue guarded autopilot hardening. Use exact Download Phase X overlay ZIP link text. Preserve saved ChatGPT target only. Stop on blocked, unclear, risky, or owner-decision work.";
}
function defaultCommand() {
  return {
    schemaVersion: 1,
    enabled: false,
    action: "idle",
    status: "ready",
    phaseStart: 128,
    phaseEnd: 130,
    maxPhases: 3,
    guide: defaultGuide(),
    stopAfterRange: true,
    pauseAfterCurrentPhase: false,
    emergencyStop: false,
    updatedBy: "owner",
    updatedReason: "phone control ready"
  };
}
function paths() {
  const autoOps = autoOpsDir();
  const control = path.join(autoOps, "00_control_center");
  return {
    autoOps,
    control,
    evidence: path.join(control, "evidence"),
    command: path.join(control, "autopilot-command.json"),
    commandState: path.join(control, "autopilot-command-state.json"),
    statusMd: path.join(control, "AUTOPILOT_STATUS.md"),
    lastResult: path.join(control, "autopilot-command-last-result.json"),
    guide: path.join(control, "GUIDE_AUTOPILOT.md"),
    directive: path.join(control, "autopilot-directive.json"),
    state: path.join(control, "autopilot-state.json")
  };
}
function ensureCommandFile(p) {
  ensureDir(p.control);
  if (!fs.existsSync(p.command)) writeJson(p.command, defaultCommand());
  return readJson(p.command, defaultCommand()) || defaultCommand();
}
function normalizeCommand(raw) {
  const base = { ...defaultCommand(), ...(raw || {}) };
  base.action = String(base.action || "idle").toLowerCase().trim();
  base.enabled = base.enabled === true || String(base.enabled).toLowerCase() === "true";
  base.emergencyStop = base.emergencyStop === true || String(base.emergencyStop).toLowerCase() === "true";
  base.pauseAfterCurrentPhase = base.pauseAfterCurrentPhase === true || String(base.pauseAfterCurrentPhase).toLowerCase() === "true";
  base.phaseStart = Number(base.phaseStart || 0);
  base.phaseEnd = Number(base.phaseEnd || base.phaseStart || 0);
  base.maxPhases = Number(base.maxPhases || Math.max(1, base.phaseEnd - base.phaseStart + 1));
  base.guide = String(base.guide || defaultGuide()).trim();
  base.status = String(base.status || "ready").toLowerCase().trim();
  return base;
}
function validateRange(command) {
  const errors = [];
  if (!Number.isInteger(command.phaseStart) || command.phaseStart <= 0) errors.push("phaseStart must be a positive whole number.");
  if (!Number.isInteger(command.phaseEnd) || command.phaseEnd < command.phaseStart) errors.push("phaseEnd must be greater than or equal to phaseStart.");
  const count = command.phaseEnd - command.phaseStart + 1;
  if (!Number.isInteger(command.maxPhases) || command.maxPhases <= 0) errors.push("maxPhases must be a positive whole number.");
  if (command.maxPhases < count) errors.push(`maxPhases must be at least the requested range count (${count}).`);
  if (command.maxPhases > 5) errors.push("maxPhases may not exceed 5 from phone control.");
  if (count > 5) errors.push("phone control range may not exceed 5 phases.");
  if (!command.guide || command.guide.length < 20) errors.push("guide must describe the bounded work and stop conditions.");
  return errors;
}
function signature(command) {
  const signed = {
    action: command.action,
    phaseStart: command.phaseStart,
    phaseEnd: command.phaseEnd,
    maxPhases: command.maxPhases,
    guide: command.guide,
    stopAfterRange: command.stopAfterRange !== false
  };
  return sha(JSON.stringify(signed));
}
function clearFile(file) { try { if (fs.existsSync(file)) fs.rmSync(file, { force: true }); } catch {} }
function writePhoneStatus(p, payload) {
  writeJson(p.lastResult, { ...payload, version: VERSION, updatedAt: new Date().toISOString() });
  const command = payload.command || {};
  const lines = [];
  lines.push("# S.E.R.A. Phone Control Status");
  lines.push("");
  lines.push(`Updated: ${new Date().toISOString()}`);
  lines.push(`Result: ${payload.ok ? "OK" : "NEEDS ATTENTION"}`);
  if (payload.message) lines.push(`Message: ${payload.message}`);
  if (command.action) lines.push(`Action: ${command.action}`);
  if (command.phaseStart && command.phaseEnd) lines.push(`Range: ${command.phaseStart}-${command.phaseEnd}`);
  if (payload.runnerExitCode !== undefined) lines.push(`Runner Exit Code: ${payload.runnerExitCode}`);
  lines.push("");
  lines.push("## Phone file to edit");
  lines.push("");
  lines.push("`00_control_center/autopilot-command.json`");
  lines.push("");
  lines.push("Set `enabled` to `true`, set `action` to `run_range`, choose `phaseStart` and `phaseEnd`, then let the laptop job read it.");
  lines.push("");
  lines.push("Use `pauseAfterCurrentPhase: true` to pause at the next safe checkpoint, or `emergencyStop: true` to stop before new work begins.");
  lines.push("");
  writeText(p.statusMd, lines.join("\n"));
}
function writeControlForRange(p, command) {
  const count = command.phaseEnd - command.phaseStart + 1;
  const state = readJson(p.state, {}) || {};
  const nextState = {
    schemaVersion: 1,
    ...state,
    enabled: true,
    maxConsecutivePhases: Math.max(Number(state.maxConsecutivePhases || 1), command.maxPhases, count),
    maxRepairAttemptsPerPhase: Number(state.maxRepairAttemptsPerPhase || 2),
    allowSafeAutoMerge: state.allowSafeAutoMerge !== false,
    stopOnNeedsAttention: true,
    allowNewChatFallback: false,
    allowRandomRecentChatFallback: false,
    requireSavedChatTarget: true,
    ignoreExistingNeedsAttentionAtStart: state.ignoreExistingNeedsAttentionAtStart !== false,
    phaseRange: { start: command.phaseStart, end: command.phaseEnd },
    updatedBy: VERSION,
    updatedAt: new Date().toISOString()
  };
  const directive = {
    schemaVersion: 1,
    command: "run_range",
    status: "active",
    phaseRange: { start: command.phaseStart, end: command.phaseEnd },
    guidance: command.guide,
    maxPhases: command.maxPhases,
    source: "autopilot-command.json",
    updatedBy: VERSION,
    updatedAt: new Date().toISOString()
  };
  writeJson(p.state, nextState);
  writeJson(p.directive, directive);
  writeText(p.guide, command.guide + "\n");
  clearFile(path.join(p.control, "PAUSE_AUTOPILOT.flag"));
  clearFile(path.join(p.control, "STOP_AUTOPILOT.flag"));
  clearFile(path.join(p.control, "EMERGENCY_STOP_AUTOPILOT.flag"));
  return { state: nextState, directive };
}
function updateCommandFile(p, patch) {
  const current = readJson(p.command, defaultCommand()) || defaultCommand();
  writeJson(p.command, { ...current, ...patch, updatedAt: new Date().toISOString(), updatedBy: VERSION });
}
function runAutopilot(command) {
  const repo = repoRoot();
  const script = path.join(repo, "scripts", "sera-autopilot-continue.ps1");
  if (!fs.existsSync(script)) throw new Error(`Missing autopilot continuation script: ${script}`);
  const args = [
    "-ExecutionPolicy", "Bypass",
    "-File", script,
    "-MaxPhases", String(command.maxPhases),
    "-StartPhase", String(command.phaseStart),
    "-EndPhase", String(command.phaseEnd),
    "-Guide", command.guide,
    "-EnableAutopilotForThisRun"
  ];
  return spawnSync(psExe(), args, { cwd: repo, encoding: "utf8", maxBuffer: 1024 * 1024 * 20 });
}
function handleStopLike(p, command, kind) {
  const fileName = kind === "pause" ? "PAUSE_AUTOPILOT.flag" : kind === "emergency" ? "EMERGENCY_STOP_AUTOPILOT.flag" : "STOP_AUTOPILOT.flag";
  writeText(path.join(p.control, fileName), `${kind} requested by phone control.\nCreated: ${new Date().toISOString()}\n`);
  updateCommandFile(p, { enabled: false, status: kind === "pause" ? "paused" : "stopped", lastAction: kind });
  const payload = { ok: true, status: kind === "pause" ? "paused" : "stopped", command, message: `${kind} request written.` };
  writePhoneStatus(p, payload);
  return payload;
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  const p = paths();
  ensureDir(p.control); ensureDir(p.evidence);
  const raw = ensureCommandFile(p);
  const command = normalizeCommand(raw);
  const sig = signature(command);
  const prior = readJson(p.commandState, {}) || {};

  if (args.init) {
    writeJson(p.command, { ...defaultCommand(), updatedAt: new Date().toISOString(), updatedBy: VERSION });
  }

  if (command.emergencyStop || command.action === "emergency_stop") return output(handleStopLike(p, command, "emergency"), args);
  if (command.pauseAfterCurrentPhase || command.action === "pause") return output(handleStopLike(p, command, "pause"), args);
  if (command.action === "stop") return output(handleStopLike(p, command, "stop"), args);

  if (!args.run || args.status || command.action === "idle") {
    const payload = { ok: true, status: "ready", command, message: "Phone control status read." };
    writePhoneStatus(p, payload);
    return output(payload, args);
  }

  if (!command.enabled) {
    const payload = { ok: true, status: "disabled", command, message: "Phone command is disabled. Set enabled=true to run." };
    writePhoneStatus(p, payload);
    return output(payload, args);
  }
  if (command.action !== "run_range") throw new Error(`Unsupported phone control action: ${command.action}`);
  const validationErrors = validateRange(command);
  if (validationErrors.length) {
    const payload = { ok: false, status: "invalid_command", command, errors: validationErrors, message: "Phone command did not pass validation." };
    writePhoneStatus(p, payload);
    return output(payload, args, 2);
  }
  if (prior.lastProcessedSignature === sig && ["completed", "running"].includes(String(command.status || "").toLowerCase())) {
    const payload = { ok: true, status: "already_processed", command, message: "This phone command signature has already been processed. Change the range or guide to run another job." };
    writePhoneStatus(p, payload);
    return output(payload, args);
  }

  const controlPayload = writeControlForRange(p, command);
  writeJson(p.commandState, { lastProcessedSignature: sig, status: "running", startedAt: new Date().toISOString(), command });
  updateCommandFile(p, { status: "running", lastRunStartedAt: new Date().toISOString(), lastSignature: sig });

  if (args.dryRun) {
    const payload = { ok: true, status: "dry_run", command, controlPayload, message: "Phone command validated and control files written. Runner was not started." };
    writePhoneStatus(p, payload);
    return output(payload, args);
  }

  const run = runAutopilot(command);
  const evidencePath = path.join(p.evidence, `phone-control-run-${timestamp()}.json`);
  const runnerEvidence = {
    version: VERSION,
    command,
    signature: sig,
    controlPayload,
    runnerExitCode: run.status ?? 0,
    stdoutTail: String(run.stdout || "").slice(-12000),
    stderrTail: String(run.stderr || "").slice(-12000),
    finishedAt: new Date().toISOString()
  };
  writeJson(evidencePath, runnerEvidence);

  const ok = (run.status ?? 0) === 0;
  updateCommandFile(p, { enabled: false, status: ok ? "completed" : "needs_attention", lastRunFinishedAt: new Date().toISOString(), lastEvidencePath: evidencePath, lastExitCode: run.status ?? 0 });
  writeJson(p.commandState, { lastProcessedSignature: sig, status: ok ? "completed" : "needs_attention", finishedAt: new Date().toISOString(), command, evidencePath });
  const payload = { ok, status: ok ? "completed" : "needs_attention", command, runnerExitCode: run.status ?? 0, evidencePath, message: ok ? "Phone-controlled bounded run completed." : "Phone-controlled run needs attention." };
  writePhoneStatus(p, payload);
  return output(payload, args, ok ? 0 : 2);
}
function output(payload, args, exitCode = 0) {
  if (args.json || !payload.ok) console.log(JSON.stringify(payload, null, 2));
  else console.log(payload.message || JSON.stringify(payload));
  if (exitCode) process.exitCode = exitCode;
  return payload;
}
try { main(); }
catch (error) {
  const p = paths();
  const payload = { ok: false, status: "needs_attention", version: VERSION, error: error instanceof Error ? error.message : String(error), updatedAt: new Date().toISOString() };
  try { writePhoneStatus(p, payload); writeJson(path.join(p.evidence, `phone-control-error-${timestamp()}.json`), payload); } catch {}
  console.error(JSON.stringify(payload, null, 2));
  process.exitCode = 2;
}

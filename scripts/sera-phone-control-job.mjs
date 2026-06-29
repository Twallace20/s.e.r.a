#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const VERSION = "phase130-phone-command-queue-status-lifecycle-v1";
const MAX_PHONE_PHASES = 5;

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
function sha(value) { return crypto.createHash("sha256").update(String(value)).digest("hex").toUpperCase(); }
function psExe() { return process.platform === "win32" ? "powershell" : "pwsh"; }
function repoRoot() { return path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."); }
function parseArgs(argv) {
  const args = { run: false, status: false, init: false, dryRun: false, json: false, commandFile: null, force: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--run") args.run = true;
    else if (arg === "--status") args.status = true;
    else if (arg === "--init") args.init = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--command-file") args.commandFile = argv[++i] || null;
  }
  return args;
}
function defaultGuide() {
  return "Continue guarded autopilot hardening. Use exact Download Phase X overlay ZIP link text. Preserve saved ChatGPT target only. Stop on blocked, unclear, risky, or owner-decision work.";
}
function defaultCommand() {
  return {
    schemaVersion: 2,
    commandId: "idle-current-command",
    commandStatus: "idle",
    enabled: false,
    action: "idle",
    status: "ready",
    phaseStart: 130,
    phaseEnd: 130,
    maxPhases: 1,
    guide: defaultGuide(),
    stopAfterRange: true,
    pauseAfterCurrentPhase: false,
    emergencyStop: false,
    updatedBy: "owner",
    updatedReason: "phone command queue ready"
  };
}
function paths(commandFileArg = null) {
  const autoOps = autoOpsDir();
  const control = path.join(autoOps, "00_control_center");
  const inbox = path.join(control, "command_inbox");
  const defaultCommandFile = path.join(control, "autopilot-command.json");
  const command = commandFileArg || process.env.SERA_PHONE_COMMAND_PATH || defaultCommandFile;
  return {
    autoOps,
    control,
    inbox,
    evidence: path.join(control, "evidence"),
    command,
    defaultCommand: defaultCommandFile,
    commandState: path.join(control, "autopilot-command-state.json"),
    statusMd: path.join(control, "AUTOPILOT_STATUS.md"),
    lastResult: path.join(control, "autopilot-command-last-result.json"),
    runLock: path.join(control, "phone-control-run.lock.json"),
    guide: path.join(control, "GUIDE_AUTOPILOT.md"),
    directive: path.join(control, "autopilot-directive.json"),
    state: path.join(control, "autopilot-state.json")
  };
}
function ensureCommandFile(p) {
  ensureDir(p.control); ensureDir(p.inbox); ensureDir(p.evidence);
  if (!fs.existsSync(p.defaultCommand)) writeJson(p.defaultCommand, defaultCommand());
  if (!fs.existsSync(p.command)) writeJson(p.command, defaultCommand());
  return readJson(p.command, defaultCommand()) || defaultCommand();
}
function normalizeBool(value) { return value === true || String(value).toLowerCase() === "true"; }
function normalizeCommand(raw, commandFile = null) {
  const base = { ...defaultCommand(), ...(raw || {}) };
  base.action = String(base.action || "idle").toLowerCase().trim();
  base.enabled = normalizeBool(base.enabled);
  base.emergencyStop = normalizeBool(base.emergencyStop);
  base.pauseAfterCurrentPhase = normalizeBool(base.pauseAfterCurrentPhase);
  base.phaseStart = Number(base.phaseStart || 0);
  base.phaseEnd = Number(base.phaseEnd || base.phaseStart || 0);
  base.maxPhases = Number(base.maxPhases || Math.max(1, base.phaseEnd - base.phaseStart + 1));
  base.guide = String(base.guide || defaultGuide()).trim();
  base.status = String(base.status || "ready").toLowerCase().trim();
  base.commandStatus = String(base.commandStatus || "missing").toLowerCase().trim();
  if (!base.commandId || String(base.commandId).trim() === "") {
    const seed = `${commandFile || "autopilot-command"}:${base.phaseStart}-${base.phaseEnd}:${base.guide}`;
    base.commandId = `cmd-${sha(seed).slice(0, 12).toLowerCase()}`;
  }
  return base;
}
function validateRange(command) {
  const errors = [];
  if (!Number.isInteger(command.phaseStart) || command.phaseStart <= 0) errors.push("phaseStart must be a positive whole number.");
  if (!Number.isInteger(command.phaseEnd) || command.phaseEnd < command.phaseStart) errors.push("phaseEnd must be greater than or equal to phaseStart.");
  const count = command.phaseEnd - command.phaseStart + 1;
  if (!Number.isInteger(command.maxPhases) || command.maxPhases <= 0) errors.push("maxPhases must be a positive whole number.");
  if (command.maxPhases < count) errors.push(`maxPhases must be at least the requested range count (${count}).`);
  if (command.maxPhases > MAX_PHONE_PHASES) errors.push(`maxPhases may not exceed ${MAX_PHONE_PHASES} from phone control.`);
  if (count > MAX_PHONE_PHASES) errors.push(`phone control range may not exceed ${MAX_PHONE_PHASES} phases.`);
  if (!command.guide || command.guide.length < 20) errors.push("guide must describe the bounded work and stop conditions.");
  if (!["new", "accepted", "running"].includes(command.commandStatus) && command.action === "run_range") {
    errors.push("commandStatus must be new, accepted, or running for a runnable command.");
  }
  return errors;
}
function signature(command) {
  const signed = {
    commandId: command.commandId,
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
function mergeCommandFile(file, patch) {
  const current = readJson(file, {}) || {};
  writeJson(file, { ...current, ...patch, updatedAt: new Date().toISOString(), updatedBy: VERSION });
}
function updateCommandFile(p, patch) {
  mergeCommandFile(p.command, patch);
  if (path.resolve(p.command) !== path.resolve(p.defaultCommand)) {
    const current = readJson(p.command, defaultCommand()) || defaultCommand();
    writeJson(p.defaultCommand, {
      ...current,
      ...patch,
      sourceCommandFile: p.command,
      mirroredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: VERSION
    });
  }
}
function acquireRunLock(p, args) {
  const now = Date.now();
  const staleMs = 1000 * 60 * 60 * 3;
  const existing = readJson(p.runLock, null);
  if (existing && !args.force) {
    const created = Date.parse(existing.createdAt || "");
    if (Number.isFinite(created) && now - created < staleMs) {
      return { ok: false, existing };
    }
  }
  writeJson(p.runLock, { version: VERSION, pid: process.pid, createdAt: new Date().toISOString(), host: os.hostname(), commandFile: p.command });
  return { ok: true };
}
function releaseRunLock(p) {
  try {
    const current = readJson(p.runLock, null);
    if (current && Number(current.pid) === process.pid) fs.rmSync(p.runLock, { force: true });
  } catch {}
}
function writePhoneStatus(p, payload) {
  writeJson(p.lastResult, { ...payload, version: VERSION, updatedAt: new Date().toISOString() });
  const command = payload.command || {};
  const lines = [];
  lines.push("# S.E.R.A. Phone Control Status");
  lines.push("");
  lines.push(`Updated: ${new Date().toISOString()}`);
  lines.push(`Result: ${payload.ok ? "OK" : "NEEDS ATTENTION"}`);
  if (payload.message) lines.push(`Message: ${payload.message}`);
  if (payload.commandFile) lines.push(`Command File: ${payload.commandFile}`);
  if (command.commandId) lines.push(`Command ID: ${command.commandId}`);
  if (command.commandStatus) lines.push(`Command Status: ${command.commandStatus}`);
  if (command.action) lines.push(`Action: ${command.action}`);
  if (command.phaseStart && command.phaseEnd) lines.push(`Range: ${command.phaseStart}-${command.phaseEnd}`);
  if (payload.runnerExitCode !== undefined) lines.push(`Runner Exit Code: ${payload.runnerExitCode}`);
  if (payload.evidencePath) lines.push(`Evidence: ${payload.evidencePath}`);
  lines.push("");
  lines.push("## Phone command queue");
  lines.push("");
  lines.push("Create or edit `00_control_center/command_inbox/autopilot-command*.json` from OneDrive on your phone.");
  lines.push("");
  lines.push("Set `enabled: true` and `commandStatus: \"new\"` to start a bounded run.");
  lines.push("S.E.R.A. updates the same JSON automatically: `new → accepted → running → complete` or `blocked`.");
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
    source: path.basename(p.command),
    sourceCommandFile: p.command,
    commandId: command.commandId,
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
  writeText(path.join(p.control, fileName), `${kind} requested by phone control.\nCreated: ${new Date().toISOString()}\nCommand: ${command.commandId}\n`);
  updateCommandFile(p, { enabled: false, commandStatus: "complete", status: kind === "pause" ? "paused" : "stopped", lastAction: kind, completedAt: new Date().toISOString() });
  const nextCommand = normalizeCommand(readJson(p.command, command), p.command);
  const payload = { ok: true, status: kind === "pause" ? "paused" : "stopped", command: nextCommand, commandFile: p.command, message: `${kind} request consumed and status updated.` };
  writePhoneStatus(p, payload);
  return payload;
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  const p = paths(args.commandFile);
  ensureDir(p.control); ensureDir(p.inbox); ensureDir(p.evidence);
  const raw = ensureCommandFile(p);
  let command = normalizeCommand(raw, p.command);
  const sig = signature(command);

  if (args.init) {
    writeJson(p.defaultCommand, { ...defaultCommand(), updatedAt: new Date().toISOString(), updatedBy: VERSION });
  }

  if (args.status || !args.run) {
    const payload = { ok: true, status: "ready", command, commandFile: p.command, message: "Phone control status read." };
    writePhoneStatus(p, payload);
    return output(payload, args);
  }

  const lock = acquireRunLock(p, args);
  if (!lock.ok) {
    const payload = { ok: true, status: "already_running", command, commandFile: p.command, lock: lock.existing, message: "A phone-controlled run is already active. No duplicate runner started." };
    writePhoneStatus(p, payload);
    return output(payload, args);
  }

  try {
    if (command.emergencyStop || command.action === "emergency_stop") return output(handleStopLike(p, command, "emergency"), args);
    if (command.pauseAfterCurrentPhase || command.action === "pause") return output(handleStopLike(p, command, "pause"), args);
    if (command.action === "stop") return output(handleStopLike(p, command, "stop"), args);

    if (!command.enabled) {
      const payload = { ok: true, status: "disabled", command, commandFile: p.command, message: "Phone command is disabled. Set enabled=true and commandStatus=new to run." };
      writePhoneStatus(p, payload);
      return output(payload, args);
    }
    if (command.action !== "run_range") throw new Error(`Unsupported phone control action: ${command.action}`);
    if (!["new", "accepted", "running"].includes(command.commandStatus)) {
      const payload = { ok: true, status: "ignored", command, commandFile: p.command, message: "Phone command ignored because commandStatus is not new, accepted, or running." };
      writePhoneStatus(p, payload);
      return output(payload, args);
    }

    const validationErrors = validateRange(command);
    if (validationErrors.length) {
      updateCommandFile(p, { commandStatus: "blocked", status: "invalid_command", blockedAt: new Date().toISOString(), blockedReason: validationErrors.join("; ") });
      command = normalizeCommand(readJson(p.command, command), p.command);
      const payload = { ok: false, status: "invalid_command", command, commandFile: p.command, errors: validationErrors, message: "Phone command did not pass validation." };
      writePhoneStatus(p, payload);
      return output(payload, args, 2);
    }

    const controlPayload = writeControlForRange(p, command);
    updateCommandFile(p, { commandStatus: "running", status: "running", lastRunStartedAt: new Date().toISOString(), lastSignature: sig, acceptedAt: command.acceptedAt || new Date().toISOString() });
    writeJson(p.commandState, { lastProcessedSignature: sig, commandId: command.commandId, status: "running", startedAt: new Date().toISOString(), command, commandFile: p.command });
    command = normalizeCommand(readJson(p.command, command), p.command);

    if (args.dryRun) {
      updateCommandFile(p, { commandStatus: "complete", status: "dry_run_complete", completedAt: new Date().toISOString() });
      command = normalizeCommand(readJson(p.command, command), p.command);
      const payload = { ok: true, status: "dry_run_complete", command, commandFile: p.command, controlPayload, message: "Phone command validated and lifecycle completed in dry-run mode." };
      writePhoneStatus(p, payload);
      return output(payload, args);
    }

    const run = runAutopilot(command);
    const evidencePath = path.join(p.evidence, `phone-control-run-${timestamp()}.json`);
    const exitCode = run.status ?? 0;
    const runnerEvidence = {
      version: VERSION,
      command,
      commandFile: p.command,
      signature: sig,
      controlPayload,
      runnerExitCode: exitCode,
      stdoutTail: String(run.stdout || "").slice(-12000),
      stderrTail: String(run.stderr || "").slice(-12000),
      finishedAt: new Date().toISOString()
    };
    writeJson(evidencePath, runnerEvidence);

    const ok = exitCode === 0;
    updateCommandFile(p, {
      enabled: false,
      commandStatus: ok ? "complete" : "blocked",
      status: ok ? "completed" : "blocked",
      lastRunFinishedAt: new Date().toISOString(),
      lastEvidencePath: evidencePath,
      lastExitCode: exitCode,
      blockedReason: ok ? undefined : "Runner returned non-zero exit code. Review evidence."
    });
    command = normalizeCommand(readJson(p.command, command), p.command);
    writeJson(p.commandState, { lastProcessedSignature: sig, commandId: command.commandId, status: ok ? "complete" : "blocked", finishedAt: new Date().toISOString(), command, commandFile: p.command, evidencePath });
    const payload = { ok, status: ok ? "complete" : "blocked", command, commandFile: p.command, runnerExitCode: exitCode, evidencePath, message: ok ? "Phone-controlled bounded run completed and commandStatus was updated to complete." : "Phone-controlled run blocked and commandStatus was updated to blocked." };
    writePhoneStatus(p, payload);
    return output(payload, args, ok ? 0 : 2);
  } finally {
    releaseRunLock(p);
  }
}
function output(payload, args, exitCode = 0) {
  if (args.json || !payload.ok) console.log(JSON.stringify(payload, null, 2));
  else console.log(payload.message || JSON.stringify(payload));
  if (exitCode) process.exitCode = exitCode;
  return payload;
}
try { main(); }
catch (error) {
  const args = parseArgs(process.argv.slice(2));
  const p = paths(args.commandFile);
  const payload = { ok: false, status: "needs_attention", version: VERSION, commandFile: p.command, error: error instanceof Error ? error.message : String(error), updatedAt: new Date().toISOString() };
  try {
    writePhoneStatus(p, payload);
    writeJson(path.join(p.evidence, `phone-control-error-${timestamp()}.json`), payload);
    if (fs.existsSync(p.command)) mergeCommandFile(p.command, { commandStatus: "blocked", status: "error", blockedAt: new Date().toISOString(), blockedReason: payload.error, updatedBy: VERSION });
  } catch {}
  console.error(JSON.stringify(payload, null, 2));
  process.exitCode = 2;
}

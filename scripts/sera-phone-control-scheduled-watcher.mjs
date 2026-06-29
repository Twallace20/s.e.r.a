#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const VERSION = "phase129-phone-control-scheduled-watcher-v1";
const TASK_NAME = "SERA Phone Control Watcher";

function autoOpsDir() {
  return process.env.SERA_AUTOOPS_DIR || path.join(os.homedir(), "OneDrive", "SERA-AutoOps");
}
function repoRoot() {
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
}
function psExe() {
  return process.platform === "win32" ? "powershell" : "pwsh";
}
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
  try {
    if (!fs.existsSync(file)) return fallback;
    const text = decode(fs.readFileSync(file)).trim();
    if (!text) return fallback;
    return JSON.parse(text);
  } catch (error) {
    return { __parseError: error instanceof Error ? error.message : String(error) };
  }
}
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8"); }
function writeText(file, text) { ensureDir(path.dirname(file)); fs.writeFileSync(file, text, "utf8"); }
function sha(value) { return crypto.createHash("sha256").update(String(value)).digest("hex").toUpperCase(); }
function parseArgs(argv) {
  const args = { runOnce: false, status: false, json: false, force: false };
  for (const arg of argv) {
    if (arg === "--run-once") args.runOnce = true;
    else if (arg === "--status") args.status = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--force") args.force = true;
  }
  return args;
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
    watcherState: path.join(control, "phone-control-watcher-state.json"),
    watcherLock: path.join(control, "phone-control-watcher.lock.json"),
    lastResult: path.join(control, "phone-control-watcher-last-result.json"),
    emergency: path.join(control, "EMERGENCY_STOP_AUTOPILOT.flag"),
    stop: path.join(control, "STOP_AUTOPILOT.flag"),
    pause: path.join(control, "PAUSE_AUTOPILOT.flag")
  };
}
function defaultCommand() {
  return {
    schemaVersion: 1,
    enabled: false,
    action: "idle",
    status: "ready",
    phaseStart: 129,
    phaseEnd: 130,
    maxPhases: 2,
    guide: "Continue guarded autopilot hardening. Stop on unclear work, owner judgment, browser issues, or validation failure.",
    stopAfterRange: true,
    pauseAfterCurrentPhase: false,
    emergencyStop: false,
    updatedBy: "owner",
    updatedReason: "phone control scheduled watcher ready"
  };
}
function normalizeCommand(raw) {
  const base = { ...defaultCommand(), ...(raw || {}) };
  base.action = String(base.action || "idle").toLowerCase().trim();
  base.status = String(base.status || "ready").toLowerCase().trim();
  base.enabled = base.enabled === true || String(base.enabled).toLowerCase() === "true";
  base.emergencyStop = base.emergencyStop === true || String(base.emergencyStop).toLowerCase() === "true";
  base.pauseAfterCurrentPhase = base.pauseAfterCurrentPhase === true || String(base.pauseAfterCurrentPhase).toLowerCase() === "true";
  base.phaseStart = Number(base.phaseStart || 0);
  base.phaseEnd = Number(base.phaseEnd || base.phaseStart || 0);
  base.maxPhases = Number(base.maxPhases || Math.max(1, base.phaseEnd - base.phaseStart + 1));
  base.guide = String(base.guide || defaultCommand().guide).trim();
  return base;
}
function commandSignature(command) {
  return sha(JSON.stringify({
    enabled: command.enabled,
    action: command.action,
    phaseStart: command.phaseStart,
    phaseEnd: command.phaseEnd,
    maxPhases: command.maxPhases,
    guide: command.guide,
    stopAfterRange: command.stopAfterRange !== false,
    pauseAfterCurrentPhase: command.pauseAfterCurrentPhase,
    emergencyStop: command.emergencyStop
  }));
}
function maybeEnsureCommand(p) {
  ensureDir(p.control);
  if (!fs.existsSync(p.command)) writeJson(p.command, defaultCommand());
}
function writeStatus(p, payload) {
  const now = new Date().toISOString();
  const status = { ...payload, version: VERSION, taskName: TASK_NAME, updatedAt: now };
  writeJson(p.lastResult, status);
  const command = payload.command || {};
  const lines = [];
  lines.push("# S.E.R.A. Phone Control Status");
  lines.push("");
  lines.push(`Updated: ${now}`);
  lines.push(`Watcher: ${payload.ok ? "OK" : "NEEDS ATTENTION"}`);
  lines.push(`Message: ${payload.message || "No message."}`);
  lines.push(`Task: ${TASK_NAME}`);
  if (payload.status) lines.push(`Status: ${payload.status}`);
  if (command.action) lines.push(`Command Action: ${command.action}`);
  if (command.phaseStart && command.phaseEnd) lines.push(`Command Range: ${command.phaseStart}-${command.phaseEnd}`);
  if (payload.runnerExitCode !== undefined) lines.push(`Runner Exit Code: ${payload.runnerExitCode}`);
  if (payload.evidencePath) lines.push(`Evidence: ${payload.evidencePath}`);
  lines.push("");
  lines.push("## Phone control file");
  lines.push("");
  lines.push("Edit `00_control_center/autopilot-command.json` from OneDrive on your phone.");
  lines.push("");
  lines.push("Use `enabled: true` and `action: run_range` to start a bounded run.");
  lines.push("Use `pauseAfterCurrentPhase: true` to pause at the next checkpoint.");
  lines.push("Use `emergencyStop: true` or `action: stop` to stop before starting new work.");
  lines.push("");
  writeText(p.statusMd, lines.join("\n"));
  return status;
}
function acquireLock(p, args) {
  const now = Date.now();
  const staleMs = 1000 * 60 * 60;
  const existing = readJson(p.watcherLock, null);
  if (existing && !args.force) {
    const created = Date.parse(existing.createdAt || "");
    if (Number.isFinite(created) && now - created < staleMs) {
      return { ok: false, stale: false, existing };
    }
  }
  writeJson(p.watcherLock, { version: VERSION, pid: process.pid, createdAt: new Date().toISOString(), host: os.hostname() });
  return { ok: true };
}
function releaseLock(p) {
  try {
    const current = readJson(p.watcherLock, null);
    if (current && Number(current.pid) === process.pid) fs.rmSync(p.watcherLock, { force: true });
  } catch {}
}
function writeFlag(file, message) {
  writeText(file, `${message}\nCreated: ${new Date().toISOString()}\nSource: ${VERSION}\n`);
}
function runPhoneControlJob(command) {
  const repo = repoRoot();
  const script = path.join(repo, "scripts", "sera-phone-control-job.mjs");
  if (!fs.existsSync(script)) throw new Error(`Missing Phase 128 phone control job script: ${script}`);
  const run = spawnSync("node", [script, "--run", "--json"], { cwd: repo, encoding: "utf8", maxBuffer: 1024 * 1024 * 20 });
  return {
    exitCode: run.status ?? 0,
    stdout: String(run.stdout || ""),
    stderr: String(run.stderr || "")
  };
}
function checkOnce(args) {
  const p = paths();
  ensureDir(p.control); ensureDir(p.evidence);
  maybeEnsureCommand(p);

  const lock = acquireLock(p, args);
  if (!lock.ok) {
    const payload = { ok: true, status: "already_running", message: "Phone control watcher skipped because another watcher instance is active.", lock: lock.existing };
    writeStatus(p, payload);
    return payload;
  }

  try {
    const raw = readJson(p.command, defaultCommand());
    if (raw && raw.__parseError) {
      const payload = { ok: false, status: "invalid_json", message: `autopilot-command.json could not be parsed: ${raw.__parseError}` };
      writeStatus(p, payload);
      return payload;
    }
    const command = normalizeCommand(raw);
    const sig = commandSignature(command);
    const prior = readJson(p.watcherState, {}) || {};

    if (command.emergencyStop || command.action === "emergency_stop") {
      writeFlag(p.emergency, "Emergency stop requested by phone command.");
      writeJson(p.watcherState, { lastSignature: sig, status: "emergency_stop", updatedAt: new Date().toISOString() });
      const payload = { ok: true, status: "emergency_stop", command, message: "Emergency stop flag written. No new work started." };
      writeStatus(p, payload);
      return payload;
    }
    if (command.pauseAfterCurrentPhase || command.action === "pause") {
      writeFlag(p.pause, "Pause requested by phone command.");
      writeJson(p.watcherState, { lastSignature: sig, status: "pause", updatedAt: new Date().toISOString() });
      const payload = { ok: true, status: "pause", command, message: "Pause flag written. No new run started." };
      writeStatus(p, payload);
      return payload;
    }
    if (command.action === "stop") {
      writeFlag(p.stop, "Stop requested by phone command.");
      writeJson(p.watcherState, { lastSignature: sig, status: "stop", updatedAt: new Date().toISOString() });
      const payload = { ok: true, status: "stop", command, message: "Stop flag written. No new run started." };
      writeStatus(p, payload);
      return payload;
    }
    if (!command.enabled || command.action === "idle") {
      const payload = { ok: true, status: "idle", command, message: "Phone command is idle or disabled. No run started." };
      writeStatus(p, payload);
      return payload;
    }
    if (command.action !== "run_range") {
      const payload = { ok: false, status: "unsupported_action", command, message: `Unsupported phone command action: ${command.action}` };
      writeStatus(p, payload);
      return payload;
    }
    if (prior.lastSignature === sig && ["completed", "running", "needs_attention"].includes(String(prior.status || "").toLowerCase())) {
      const payload = { ok: true, status: "already_seen", command, message: "This phone command signature was already handled. Change range or guide for a new run." };
      writeStatus(p, payload);
      return payload;
    }

    writeJson(p.watcherState, { lastSignature: sig, status: "running", startedAt: new Date().toISOString(), command });
    const run = runPhoneControlJob(command);
    const evidencePath = path.join(p.evidence, `phone-control-watcher-${timestamp()}.json`);
    writeJson(evidencePath, {
      version: VERSION,
      taskName: TASK_NAME,
      command,
      signature: sig,
      runnerExitCode: run.exitCode,
      stdoutTail: run.stdout.slice(-12000),
      stderrTail: run.stderr.slice(-12000),
      finishedAt: new Date().toISOString()
    });
    const ok = run.exitCode === 0;
    const status = ok ? "completed" : "needs_attention";
    writeJson(p.watcherState, { lastSignature: sig, status, finishedAt: new Date().toISOString(), command, evidencePath, exitCode: run.exitCode });
    const payload = { ok, status, command, runnerExitCode: run.exitCode, evidencePath, message: ok ? "Phone command completed through scheduled watcher." : "Phone command needs attention after scheduled watcher run." };
    writeStatus(p, payload);
    return payload;
  } finally {
    releaseLock(p);
  }
}
function statusOnly() {
  const p = paths();
  ensureDir(p.control); ensureDir(p.evidence); maybeEnsureCommand(p);
  const payload = {
    ok: true,
    status: "status",
    message: "Phone scheduled watcher status read.",
    command: normalizeCommand(readJson(p.command, defaultCommand())),
    watcherState: readJson(p.watcherState, {}) || {},
    lock: readJson(p.watcherLock, null)
  };
  writeStatus(p, payload);
  return payload;
}
function output(payload, args, exitCode = 0) {
  if (args.json || !payload.ok) console.log(JSON.stringify(payload, null, 2));
  else console.log(payload.message || JSON.stringify(payload));
  if (exitCode) process.exitCode = exitCode;
}
try {
  const args = parseArgs(process.argv.slice(2));
  const payload = args.status ? statusOnly() : checkOnce(args);
  output(payload, args, payload.ok ? 0 : 2);
} catch (error) {
  const p = paths();
  const payload = { ok: false, status: "needs_attention", version: VERSION, error: error instanceof Error ? error.message : String(error), updatedAt: new Date().toISOString() };
  try { ensureDir(p.evidence); writeStatus(p, payload); writeJson(path.join(p.evidence, `phone-control-watcher-error-${timestamp()}.json`), payload); } catch {}
  console.error(JSON.stringify(payload, null, 2));
  process.exitCode = 2;
}

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const VERSION = "phase132-phone-autopilot-real-life-proof-harness-v1";
const TASK_NAME = "SERA Phone Control Watcher";
const ACCEPTED_STALE_MS = Number(process.env.SERA_PHONE_ACCEPTED_STALE_MS || 1000 * 60 * 10);
const RUNNING_STALE_MS = Number(process.env.SERA_PHONE_RUNNING_STALE_MS || 1000 * 60 * 90);

function autoOpsDir() { return process.env.SERA_AUTOOPS_DIR || path.join(os.homedir(), "OneDrive", "SERA-AutoOps"); }
function repoRoot() { return path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); }
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
    return { __parseError: error instanceof Error ? error.message : String(error), __file: file };
  }
}
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8"); }
function writeText(file, text) { ensureDir(path.dirname(file)); fs.writeFileSync(file, text, "utf8"); }
function sha(value) { return crypto.createHash("sha256").update(String(value)).digest("hex").toUpperCase(); }
function parseArgs(argv) {
  const args = { runOnce: false, status: false, json: false, force: false, recoverStale: true };
  for (const arg of argv) {
    if (arg === "--run-once") args.runOnce = true;
    else if (arg === "--status") args.status = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--no-recover-stale") args.recoverStale = false;
  }
  return args;
}
function paths() {
  const autoOps = autoOpsDir();
  const control = path.join(autoOps, "00_control_center");
  const inbox = path.join(control, "command_inbox");
  return {
    autoOps,
    control,
    inbox,
    handoff: path.join(autoOps, "06_handoff"),
    evidence: path.join(control, "evidence"),
    command: path.join(control, "autopilot-command.json"),
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
    schemaVersion: 2,
    commandId: "idle-current-command",
    commandStatus: "idle",
    enabled: false,
    action: "idle",
    status: "ready",
    phaseStart: 131,
    phaseEnd: 131,
    maxPhases: 1,
    guide: "Continue guarded autopilot hardening. Stop on unclear work, owner judgment, browser issues, download failure, validation failure, or missing handoff.",
    stopAfterRange: true,
    pauseAfterCurrentPhase: false,
    emergencyStop: false,
    updatedBy: "owner",
    updatedReason: "phone end-to-end orchestrator ready"
  };
}
function normalizeBool(value) { return value === true || String(value).toLowerCase() === "true"; }
function normalizeCommand(raw, file) {
  const base = { ...defaultCommand(), ...(raw || {}) };
  base.action = String(base.action || "idle").toLowerCase().trim();
  base.status = String(base.status || "ready").toLowerCase().trim();
  base.commandStatus = String(base.commandStatus || "missing").toLowerCase().trim();
  base.enabled = normalizeBool(base.enabled);
  base.emergencyStop = normalizeBool(base.emergencyStop);
  base.pauseAfterCurrentPhase = normalizeBool(base.pauseAfterCurrentPhase);
  base.stopAfterRange = base.stopAfterRange !== false;
  base.phaseStart = Number(base.phaseStart || 0);
  base.phaseEnd = Number(base.phaseEnd || base.phaseStart || 0);
  base.maxPhases = Number(base.maxPhases || Math.max(1, base.phaseEnd - base.phaseStart + 1));
  base.guide = String(base.guide || defaultCommand().guide).trim();
  if (!base.commandId || String(base.commandId).trim() === "") {
    base.commandId = `cmd-${sha(`${file}:${base.phaseStart}-${base.phaseEnd}:${base.guide}`).slice(0, 12).toLowerCase()}`;
  }
  return base;
}
function maybeEnsureCommand(p) {
  ensureDir(p.control); ensureDir(p.inbox); ensureDir(p.evidence); ensureDir(p.handoff);
  if (!fs.existsSync(p.command)) writeJson(p.command, defaultCommand());
  const example = path.join(p.inbox, "autopilot-command-phase131.example.json");
  if (!fs.existsSync(example)) {
    writeJson(example, {
      schemaVersion: 2,
      commandId: "phase131-example-do-not-run",
      commandStatus: "ignored",
      enabled: false,
      action: "run_range",
      phaseStart: 131,
      phaseEnd: 131,
      maxPhases: 1,
      guide: "Example only. Copy this file, change commandId, set commandStatus to new, and set enabled to true.",
      stopAfterRange: true,
      pauseAfterCurrentPhase: false,
      emergencyStop: false,
      updatedBy: "owner",
      updatedReason: "example command"
    });
  }
}
function commandFiles(p) {
  maybeEnsureCommand(p);
  const files = [];
  if (fs.existsSync(p.command)) files.push(p.command);
  if (fs.existsSync(p.inbox)) {
    for (const entry of fs.readdirSync(p.inbox, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (/^autopilot-command.*\.json$/i.test(entry.name)) files.push(path.join(p.inbox, entry.name));
    }
  }
  return [...new Set(files.map(f => path.resolve(f)))];
}
function readCommands(p) {
  return commandFiles(p).map(file => {
    const raw = readJson(file, null);
    const stat = fs.statSync(file);
    if (raw && raw.__parseError) return { file, raw, command: null, parseError: raw.__parseError, mtimeMs: stat.mtimeMs };
    return { file, raw, command: normalizeCommand(raw || {}, file), parseError: null, mtimeMs: stat.mtimeMs };
  }).sort((a, b) => a.mtimeMs - b.mtimeMs);
}
function runnableCommand(items) {
  return items.find(item => item.command && item.command.enabled === true && item.command.commandStatus === "new");
}
function counts(items) {
  const result = { total: items.length, new: 0, accepted: 0, running: 0, complete: 0, blocked: 0, ignored: 0, idle: 0, missing: 0, invalid: 0 };
  for (const item of items) {
    if (item.parseError) { result.invalid++; continue; }
    const status = item.command?.commandStatus || "missing";
    result[status] = (result[status] || 0) + 1;
  }
  return result;
}
function sameFile(a, b) { return path.resolve(String(a || "")).toLowerCase() === path.resolve(String(b || "")).toLowerCase(); }
function quarantineInvalidCommands(p, badItems) {
  if (!badItems.length) return [];
  const dir = path.join(p.control, "archive", "invalid_commands", timestamp());
  ensureDir(dir);
  const receipts = [];
  for (const item of badItems) {
    const base = path.basename(item.file);
    const archivedPath = path.join(dir, base);
    const receipt = {
      version: VERSION,
      status: "invalid_json_quarantined",
      commandFile: item.file,
      archivedPath,
      parseError: item.parseError,
      quarantinedAt: new Date().toISOString()
    };
    try {
      if (sameFile(item.file, p.command)) {
        if (fs.existsSync(item.file)) fs.copyFileSync(item.file, archivedPath);
        writeJson(item.file, {
          ...defaultCommand(),
          commandId: "invalid-root-command-quarantined",
          commandStatus: "blocked",
          enabled: false,
          action: "idle",
          status: "invalid_json",
          blockedReason: `Root command file could not be parsed and was reset: ${item.parseError}`,
          archivedPath,
          updatedBy: VERSION,
          updatedAt: new Date().toISOString()
        });
      } else {
        if (fs.existsSync(item.file)) fs.renameSync(item.file, archivedPath);
      }
    } catch (error) {
      receipt.status = "invalid_json_quarantine_failed";
      receipt.error = error instanceof Error ? error.message : String(error);
    }
    receipts.push(receipt);
  }
  writeJson(path.join(p.evidence, `invalid-command-quarantine-${timestamp()}.json`), { version: VERSION, receipts });
  return receipts;
}
function phasePattern(phase) {
  return new RegExp(`phase[-_ ]?${phase}(?:\\D|$)`, "i");
}
function handoffStatusFromName(name) {
  if (/CLOSED_CLEANLY/i.test(name)) return "CLOSED_CLEANLY";
  if (/BLOCKED/i.test(name)) return "BLOCKED";
  if (/PASS/i.test(name)) return "PASS";
  return "UNKNOWN";
}
function latestHandoffForCommand(p, command) {
  if (!fs.existsSync(p.handoff)) return null;
  const phases = [];
  for (let n = command.phaseStart; n <= command.phaseEnd; n++) phases.push(n);
  const matches = [];
  for (const entry of fs.readdirSync(p.handoff, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith(".md")) continue;
    if (!phases.some(phase => phasePattern(phase).test(entry.name))) continue;
    const full = path.join(p.handoff, entry.name);
    const stat = fs.statSync(full);
    matches.push({ path: full, name: entry.name, status: handoffStatusFromName(entry.name), mtimeMs: stat.mtimeMs, mtime: new Date(stat.mtimeMs).toISOString() });
  }
  matches.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return matches[0] || null;
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
  if (payload.commandFile) lines.push(`Command File: ${payload.commandFile}`);
  if (command.commandId) lines.push(`Command ID: ${command.commandId}`);
  if (command.commandStatus) lines.push(`Command Status: ${command.commandStatus}`);
  if (command.status) lines.push(`Machine Status: ${command.status}`);
  if (command.action) lines.push(`Command Action: ${command.action}`);
  if (command.phaseStart && command.phaseEnd) lines.push(`Command Range: ${command.phaseStart}-${command.phaseEnd}`);
  if (payload.runnerExitCode !== undefined) lines.push(`Runner Exit Code: ${payload.runnerExitCode}`);
  if (payload.latestHandoff?.path) {
    lines.push(`Latest Handoff: ${payload.latestHandoff.path}`);
    lines.push(`Latest Handoff Status: ${payload.latestHandoff.status}`);
  }
  if (payload.evidencePath) lines.push(`Evidence: ${payload.evidencePath}`);
  if (payload.commandCounts) {
    lines.push("");
    lines.push("## Queue counts");
    for (const [key, value] of Object.entries(payload.commandCounts)) lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## Phone command queue");
  lines.push("");
  lines.push("Preferred folder: `00_control_center/command_inbox/`.");
  lines.push("Supported filenames: `autopilot-command*.json`.");
  lines.push("");
  lines.push("To start work from your phone, create or edit a command file with:");
  lines.push("");
  lines.push("```json");
  lines.push(`{ "commandStatus": "new", "enabled": true, "action": "run_range", "phaseStart": 132, "phaseEnd": 132, "maxPhases": 1 }`);
  lines.push("```");
  lines.push("");
  lines.push("S.E.R.A. updates the same JSON automatically: `new → accepted → running → complete` or `blocked`.");
  lines.push("");
  writeText(p.statusMd, lines.join("\n"));
  return status;
}
function acquireLock(p, args) {
  const now = Date.now();
  const staleMs = 1000 * 60 * 20;
  const existing = readJson(p.watcherLock, null);
  if (existing && !args.force) {
    const created = Date.parse(existing.createdAt || "");
    if (Number.isFinite(created) && now - created < staleMs) return { ok: false, stale: false, existing };
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
function mergeCommandFile(file, patch) {
  const current = readJson(file, {}) || {};
  const cleaned = { ...current, ...patch, updatedAt: new Date().toISOString(), updatedBy: VERSION };
  for (const [key, value] of Object.entries(cleaned)) if (value === undefined) delete cleaned[key];
  writeJson(file, cleaned);
}
function writeFlag(file, message) { writeText(file, `${message}\nCreated: ${new Date().toISOString()}\nSource: ${VERSION}\n`); }
function runPhoneControlJob(commandFile) {
  const repo = repoRoot();
  const script = path.join(repo, "scripts", "sera-phone-control-job.mjs");
  if (!fs.existsSync(script)) throw new Error(`Missing phone control job script: ${script}`);
  const env = { ...process.env, SERA_PHONE_COMMAND_PATH: commandFile };
  const run = spawnSync("node", [script, "--run", "--json", "--command-file", commandFile], { cwd: repo, encoding: "utf8", env, maxBuffer: 1024 * 1024 * 20, timeout: Number(process.env.SERA_PHONE_RUNNER_TIMEOUT_MS || 1000 * 60 * 100) });
  return {
    exitCode: run.error ? 2 : (run.status ?? 0),
    error: run.error ? String(run.error.message || run.error) : null,
    stdout: String(run.stdout || ""),
    stderr: String(run.stderr || "")
  };
}
function consumeControlCommand(p, command, sig, selectedFile) {
  if (command.emergencyStop || command.action === "emergency_stop") {
    writeFlag(p.emergency, "Emergency stop requested by phone command.");
    mergeCommandFile(selectedFile, { enabled: false, commandStatus: "complete", status: "emergency_stop", completedAt: new Date().toISOString(), lastSignature: sig });
    return { ok: true, status: "emergency_stop", command, message: "Emergency stop flag written. No new work started." };
  }
  if (command.pauseAfterCurrentPhase || command.action === "pause") {
    writeFlag(p.pause, "Pause requested by phone command.");
    mergeCommandFile(selectedFile, { enabled: false, commandStatus: "complete", status: "pause", completedAt: new Date().toISOString(), lastSignature: sig });
    return { ok: true, status: "pause", command, message: "Pause flag written. No new run started." };
  }
  if (command.action === "stop") {
    writeFlag(p.stop, "Stop requested by phone command.");
    mergeCommandFile(selectedFile, { enabled: false, commandStatus: "complete", status: "stop", completedAt: new Date().toISOString(), lastSignature: sig });
    return { ok: true, status: "stop", command, message: "Stop flag written. No new run started." };
  }
  return null;
}
function msSince(value) {
  const t = Date.parse(value || "");
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return Date.now() - t;
}
function reconcileExistingCommand(p, item) {
  const command = item.command;
  if (!command || !command.enabled) return null;
  if (!["accepted", "running"].includes(command.commandStatus)) return null;
  const latestHandoff = latestHandoffForCommand(p, command);
  if (latestHandoff?.status === "CLOSED_CLEANLY") {
    mergeCommandFile(item.file, { enabled: false, commandStatus: "complete", status: "completed", completedAt: new Date().toISOString(), latestHandoffPath: latestHandoff.path, latestHandoffStatus: latestHandoff.status });
    return { ok: true, status: "complete", command: normalizeCommand(readJson(item.file, command), item.file), commandFile: item.file, latestHandoff, message: "Existing phone command was reconciled to complete from CLOSED_CLEANLY handoff." };
  }
  if (latestHandoff?.status === "BLOCKED") {
    mergeCommandFile(item.file, { enabled: false, commandStatus: "blocked", status: "blocked", blockedAt: new Date().toISOString(), latestHandoffPath: latestHandoff.path, latestHandoffStatus: latestHandoff.status, blockedReason: "Latest handoff is BLOCKED. Repair before continuing." });
    return { ok: false, status: "blocked", command: normalizeCommand(readJson(item.file, command), item.file), commandFile: item.file, latestHandoff, message: "Existing phone command was reconciled to blocked from BLOCKED handoff." };
  }
  const age = command.commandStatus === "accepted" ? msSince(command.acceptedAt) : msSince(command.lastRunStartedAt || command.startedAt || command.acceptedAt);
  const threshold = command.commandStatus === "accepted" ? ACCEPTED_STALE_MS : RUNNING_STALE_MS;
  if (age > threshold) {
    const reason = command.commandStatus === "accepted"
      ? `Command stayed accepted longer than ${Math.round(ACCEPTED_STALE_MS / 60000)} minutes without moving to running or producing a handoff.`
      : `Command stayed running longer than ${Math.round(RUNNING_STALE_MS / 60000)} minutes without producing a final handoff.`;
    mergeCommandFile(item.file, { enabled: false, commandStatus: "blocked", status: "blocked", blockedAt: new Date().toISOString(), latestHandoffPath: latestHandoff?.path, latestHandoffStatus: latestHandoff?.status, blockedReason: reason });
    return { ok: false, status: "blocked", command: normalizeCommand(readJson(item.file, command), item.file), commandFile: item.file, latestHandoff, message: reason };
  }
  return { ok: true, status: command.commandStatus, command, commandFile: item.file, latestHandoff, message: `Command is already ${command.commandStatus}. Waiting for current run or handoff before starting another.` };
}
function checkOnce(args) {
  const p = paths();
  ensureDir(p.control); ensureDir(p.inbox); ensureDir(p.evidence); ensureDir(p.handoff); maybeEnsureCommand(p);
  const lock = acquireLock(p, args);
  if (!lock.ok) {
    const payload = { ok: true, status: "already_running", message: "Phone control watcher skipped because another watcher instance is active.", lock: lock.existing };
    writeStatus(p, payload);
    return payload;
  }
  try {
    let items = readCommands(p);
    const badItems = items.filter(item => item.parseError);
    const invalidReceipts = badItems.length ? quarantineInvalidCommands(p, badItems) : [];
    if (badItems.length) items = readCommands(p);
    if (args.recoverStale) {
      const active = items.find(item => item.command && item.command.enabled === true && ["accepted", "running"].includes(item.command.commandStatus));
      if (active) {
        const reconciled = reconcileExistingCommand(p, active);
        if (reconciled) {
          const payload = { ...reconciled, commandCounts: counts(readCommands(p)) };
          writeStatus(p, payload);
          return payload;
        }
      }
    }
    const selected = runnableCommand(items);
    if (!selected) {
      const payload = { ok: true, status: "idle", commandCounts: counts(items), message: "No enabled command with commandStatus=new found. No run started." };
      writeStatus(p, payload);
      return payload;
    }
    const command = selected.command;
    const sig = sha(JSON.stringify({ commandId: command.commandId, file: selected.file, phaseStart: command.phaseStart, phaseEnd: command.phaseEnd, maxPhases: command.maxPhases, guide: command.guide }));
    const controlResult = consumeControlCommand(p, command, sig, selected.file);
    if (controlResult) {
      const payload = { ...controlResult, commandFile: selected.file, command: normalizeCommand(readJson(selected.file, command), selected.file), commandCounts: counts(readCommands(p)) };
      writeStatus(p, payload);
      return payload;
    }
    const now = new Date().toISOString();
    mergeCommandFile(selected.file, { commandId: command.commandId, commandStatus: "accepted", status: "accepted", acceptedAt: now, lastSignature: sig });
    mergeCommandFile(selected.file, { commandStatus: "running", status: "running", lastRunStartedAt: new Date().toISOString(), lastSignature: sig });
    writeJson(p.watcherState, { lastSignature: sig, commandId: command.commandId, commandFile: selected.file, status: "running", startedAt: new Date().toISOString(), command: normalizeCommand(readJson(selected.file, command), selected.file) });
    let run;
    try {
      run = runPhoneControlJob(selected.file);
    } catch (error) {
      run = {
        exitCode: 2,
        error: error instanceof Error ? error.message : String(error),
        stdout: "",
        stderr: ""
      };
    }
    const evidencePath = path.join(p.evidence, `phone-control-watcher-${timestamp()}.json`);
    const updatedAfterRun = normalizeCommand(readJson(selected.file, command), selected.file);
    const latestHandoff = latestHandoffForCommand(p, updatedAfterRun);
    writeJson(evidencePath, {
      version: VERSION,
      taskName: TASK_NAME,
      commandFile: selected.file,
      command: updatedAfterRun,
      signature: sig,
      runnerExitCode: run.exitCode,
      runnerError: run.error,
      latestHandoff,
      invalidReceipts,
      stdoutTail: run.stdout.slice(-12000),
      stderrTail: run.stderr.slice(-12000),
      finishedAt: new Date().toISOString()
    });
    const finalCommand = normalizeCommand(readJson(selected.file, updatedAfterRun), selected.file);
    let ok = false;
    let status = "blocked";
    let message = "Phone-controlled run blocked.";
    if (latestHandoff?.status === "CLOSED_CLEANLY" && run.exitCode === 0) {
      ok = true; status = "complete"; message = "Phone command completed from real CLOSED_CLEANLY handoff and commandStatus was updated automatically.";
      mergeCommandFile(selected.file, { enabled: false, commandStatus: "complete", status: "completed", completedAt: new Date().toISOString(), latestHandoffPath: latestHandoff.path, latestHandoffStatus: latestHandoff.status, lastEvidencePath: evidencePath, lastExitCode: run.exitCode, blockedReason: undefined });
    } else {
      const reason = run.error || (latestHandoff ? `Latest handoff status is ${latestHandoff.status}.` : "No handoff was produced by the autopilot runner.");
      mergeCommandFile(selected.file, { enabled: false, commandStatus: "blocked", status: "blocked", blockedAt: new Date().toISOString(), latestHandoffPath: latestHandoff?.path, latestHandoffStatus: latestHandoff?.status, lastEvidencePath: evidencePath, lastExitCode: run.exitCode, blockedReason: reason });
      message = `Phone command blocked: ${reason}`;
    }
    const commandAfterFinal = normalizeCommand(readJson(selected.file, finalCommand), selected.file);
    writeJson(p.watcherState, { lastSignature: sig, commandId: commandAfterFinal.commandId, commandFile: selected.file, status, finishedAt: new Date().toISOString(), command: commandAfterFinal, evidencePath, latestHandoff, exitCode: run.exitCode });
    const payload = { ok, status, command: commandAfterFinal, commandFile: selected.file, runnerExitCode: run.exitCode, latestHandoff, evidencePath, commandCounts: counts(readCommands(p)), message };
    writeStatus(p, payload);
    return payload;
  } finally {
    releaseLock(p);
  }
}
function statusOnly() {
  const p = paths();
  ensureDir(p.control); ensureDir(p.inbox); ensureDir(p.evidence); ensureDir(p.handoff); maybeEnsureCommand(p);
  const items = readCommands(p);
  const latest = items.slice().sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
  const command = latest?.command || normalizeCommand(readJson(p.command, defaultCommand()), p.command);
  const payload = {
    ok: true,
    status: "status",
    message: "Phone scheduled watcher status read.",
    command,
    commandFile: latest?.file || p.command,
    latestHandoff: latestHandoffForCommand(p, command),
    commandCounts: counts(items),
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

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const VERSION = "phase124-autopilot-directive-control-center-v1";

function autoOpsDir() { return process.env.SERA_AUTOOPS_DIR || path.join(os.homedir(), "OneDrive", "SERA-AutoOps"); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function timestamp() { return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "_"); }
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8"); }
function writeText(file, text) { ensureDir(path.dirname(file)); fs.writeFileSync(file, text, "utf8"); }
function readJson(file, fallback = null) { if (!fs.existsSync(file)) return fallback; const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").trim(); return text ? JSON.parse(text) : fallback; }
function readText(file, fallback = "") { if (!fs.existsSync(file)) return fallback; return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""); }
function controlDir() { return path.join(autoOpsDir(), "00_control_center"); }
function parseArgs(argv) {
  const args = { command: "status", runRange: "", start: 0, end: 0, guide: "", guideFile: "", json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--run-range") { args.command = "run_range"; args.runRange = argv[++i] || ""; }
    else if (a === "--start") { args.command = "run_range"; args.start = Number(argv[++i]); }
    else if (a === "--end") { args.end = Number(argv[++i]); }
    else if (a === "--pause") args.command = "pause";
    else if (a === "--resume") args.command = "resume";
    else if (a === "--stop") args.command = "stop";
    else if (a === "--emergency-stop") args.command = "emergency_stop";
    else if (a === "--status") args.command = "status";
    else if (a === "--guide") { args.command = args.command === "status" ? "guide" : args.command; args.guide = argv[++i] || ""; }
    else if (a === "--guide-file") { args.command = args.command === "status" ? "guide" : args.command; args.guideFile = argv[++i] || ""; }
    else if (a === "--json") args.json = true;
  }
  return args;
}
function parseRange(args) {
  if (args.runRange) {
    const m = String(args.runRange).match(/^(\d+)\s*(?:-|–|—|\.\.|to)\s*(\d+)$/i) || String(args.runRange).match(/^(\d+)$/);
    if (!m) throw new Error(`Invalid run range: ${args.runRange}`);
    const start = Number(m[1]);
    const end = Number(m[2] || m[1]);
    if (!start || !end || end < start) throw new Error(`Invalid run range: ${args.runRange}`);
    return { start, end };
  }
  if (args.start) {
    const start = Number(args.start);
    const end = Number(args.end || args.start);
    if (!start || !end || end < start) throw new Error(`Invalid start/end: ${start}-${end}`);
    return { start, end };
  }
  return null;
}
function clearControlFlags(control) {
  const names = ["PAUSE_AUTOPILOT.flag", "STOP_AUTOPILOT.flag", "EMERGENCY_STOP_AUTOPILOT.flag"];
  for (const name of names) {
    const file = path.join(control, name);
    if (fs.existsSync(file)) fs.rmSync(file, { force: true });
  }
}
function clearRunFlags(control) {
  if (!fs.existsSync(control)) return;
  for (const name of fs.readdirSync(control)) {
    if (/^RUN_\d+_TO_\d+\.flag$/i.test(name)) fs.rmSync(path.join(control, name), { force: true });
  }
}
function loadGuidance(args, control) {
  if (args.guideFile) return readText(path.resolve(args.guideFile), "").trim();
  if (args.guide) return args.guide.trim();
  return readText(path.join(control, "GUIDE_AUTOPILOT.md"), "").trim();
}
function updateStateForRange(control, range) {
  const statePath = path.join(control, "autopilot-state.json");
  const state = readJson(statePath, {}) || {};
  const count = range.end - range.start + 1;
  const next = {
    schemaVersion: 1,
    enabled: true,
    maxConsecutivePhases: Math.max(Number(state.maxConsecutivePhases || 1), count),
    maxRepairAttemptsPerPhase: Number(state.maxRepairAttemptsPerPhase || 2),
    allowSafeAutoMerge: state.allowSafeAutoMerge !== false,
    stopOnNeedsAttention: state.stopOnNeedsAttention !== false,
    allowNewChatFallback: false,
    allowRandomRecentChatFallback: false,
    requireSavedChatTarget: true,
    ignoreExistingNeedsAttentionAtStart: state.ignoreExistingNeedsAttentionAtStart !== false,
    phaseRange: { start: range.start, end: range.end },
    updatedBy: VERSION,
    updatedAt: new Date().toISOString()
  };
  writeJson(statePath, next);
  return next;
}
function statusMarkdown(payload) {
  const lines = [];
  lines.push("# S.E.R.A. Autopilot Status");
  lines.push("");
  lines.push(`Updated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`Command: ${payload.command || "status"}`);
  if (payload.directive?.phaseRange) lines.push(`Range: ${payload.directive.phaseRange.start}-${payload.directive.phaseRange.end}`);
  if (payload.directive?.status) lines.push(`Directive Status: ${payload.directive.status}`);
  if (payload.message) { lines.push(""); lines.push(payload.message); }
  lines.push("");
  lines.push("## Phone controls");
  lines.push("");
  lines.push("- Pause: create `PAUSE_AUTOPILOT.flag`");
  lines.push("- Stop: create `STOP_AUTOPILOT.flag`");
  lines.push("- Guide: edit `GUIDE_AUTOPILOT.md`");
  lines.push("- Run range: create a file like `RUN_124_TO_130.flag` or edit `autopilot-directive.json`");
  lines.push("");
  return lines.join("\n");
}
function writeStatus(control, payload) {
  writeJson(path.join(control, "autopilot-directive-last-result.json"), { ...payload, version: VERSION, updatedAt: new Date().toISOString() });
  writeText(path.join(control, "AUTOPILOT_STATUS.md"), statusMarkdown(payload));
}
function run() {
  const args = parseArgs(process.argv.slice(2));
  const control = controlDir();
  ensureDir(control);
  const directivePath = path.join(control, "autopilot-directive.json");
  let directive = readJson(directivePath, {}) || {};
  let message = "";

  if (args.command === "run_range") {
    const range = parseRange(args);
    clearControlFlags(control);
    clearRunFlags(control);
    const guidance = loadGuidance(args, control);
    directive = {
      schemaVersion: 1,
      command: "run_range",
      status: "active",
      phaseRange: range,
      guidance,
      updatedBy: VERSION,
      updatedAt: new Date().toISOString()
    };
    writeJson(directivePath, directive);
    writeText(path.join(control, `RUN_${range.start}_TO_${range.end}.flag`), `Run S.E.R.A. autopilot for phases ${range.start}-${range.end}.\nCreated: ${new Date().toISOString()}\n`);
    if (guidance) writeText(path.join(control, "GUIDE_AUTOPILOT.md"), guidance + "\n");
    updateStateForRange(control, range);
    message = `Autopilot directive set: run phases ${range.start}-${range.end}.`;
  } else if (args.command === "pause") {
    directive = { ...directive, command: "pause", status: "paused", updatedBy: VERSION, updatedAt: new Date().toISOString() };
    writeJson(directivePath, directive);
    writeText(path.join(control, "PAUSE_AUTOPILOT.flag"), `Pause after current safe checkpoint.\nCreated: ${new Date().toISOString()}\n`);
    message = "Autopilot pause flag written.";
  } else if (args.command === "resume") {
    clearControlFlags(control);
    directive = { ...directive, command: directive.phaseRange ? "run_range" : "resume", status: directive.phaseRange ? "active" : "ready", updatedBy: VERSION, updatedAt: new Date().toISOString() };
    writeJson(directivePath, directive);
    message = "Autopilot resume directive written.";
  } else if (args.command === "stop" || args.command === "emergency_stop") {
    directive = { ...directive, command: args.command, status: "stopped", updatedBy: VERSION, updatedAt: new Date().toISOString() };
    writeJson(directivePath, directive);
    writeText(path.join(control, args.command === "emergency_stop" ? "EMERGENCY_STOP_AUTOPILOT.flag" : "STOP_AUTOPILOT.flag"), `Stop autopilot.\nCreated: ${new Date().toISOString()}\n`);
    message = "Autopilot stop flag written.";
  } else if (args.command === "guide") {
    const guidance = loadGuidance(args, control);
    if (!guidance) throw new Error("No guidance provided.");
    directive = { ...directive, guidance, updatedBy: VERSION, updatedAt: new Date().toISOString() };
    writeJson(directivePath, directive);
    writeText(path.join(control, "GUIDE_AUTOPILOT.md"), guidance + "\n");
    message = "Autopilot guidance updated.";
  } else {
    message = "Autopilot directive status read.";
  }

  const payload = { ok: true, command: args.command, control, directive, message };
  writeStatus(control, payload);
  if (args.json) console.log(JSON.stringify(payload, null, 2));
  else console.log(statusMarkdown(payload));
}

try { run(); }
catch (error) {
  const payload = { ok: false, error: error instanceof Error ? error.message : String(error), version: VERSION };
  try { writeStatus(controlDir(), payload); } catch {}
  console.error(JSON.stringify(payload, null, 2));
  process.exitCode = 2;
}

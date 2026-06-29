#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const VERSION = "phase122-control-center-handoff-reconciler-next-phase-resolver-v1";

function autoOpsDir() { return process.env.SERA_AUTOOPS_DIR || path.join(os.homedir(), "OneDrive", "SERA-AutoOps"); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function timestamp() { return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "_"); }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function decodeText(buffer) {
  if (!buffer || buffer.length === 0) return "";
  let text = "";
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) text = buffer.toString("utf16le");
  else {
    text = buffer.toString("utf8");
    const nullCount = (text.match(/\u0000/g) || []).length;
    if (nullCount > 0 && nullCount > Math.max(2, text.length / 20)) text = buffer.toString("utf16le");
  }
  return text.replace(/^\uFEFF/, "").replace(/\u0000/g, "");
}
function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  const text = decodeText(fs.readFileSync(file)).trim();
  if (!text) return fallback;
  return JSON.parse(text);
}
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8"); }
function writeText(file, text) { ensureDir(path.dirname(file)); fs.writeFileSync(file, text, "utf8"); }
function fileMtimeMs(file) { return fs.statSync(file).mtimeMs; }
function listFiles(dir) { if (!fs.existsSync(dir)) return []; return fs.readdirSync(dir).map((name) => path.join(dir, name)).filter((file) => fs.statSync(file).isFile()); }
function basenameNoZip(name) { return path.basename(name).replace(/\.zip$/i, ""); }
function slugify(value) { return String(value || "safe_autopilot_continuation_v1").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "safe_autopilot_continuation_v1"; }
function parseArgs(argv) {
  const args = { mode: "execute", maxPhases: 1, once: false, phase: null, title: "", expectedZipName: "", promptFile: "", runnerWaitMs: 1200000, bridgeWaitMs: 900000 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") args.mode = "dry-run";
    else if (arg === "--execute") args.mode = "execute";
    else if (arg === "--once") args.once = true;
    else if (arg === "--max-phases") args.maxPhases = Number(argv[++i]);
    else if (arg === "--phase") args.phase = Number(argv[++i]);
    else if (arg === "--title") args.title = argv[++i];
    else if (arg === "--expected-zip-name") args.expectedZipName = argv[++i];
    else if (arg === "--prompt-file") args.promptFile = argv[++i];
    else if (arg === "--runner-wait-ms") args.runnerWaitMs = Number(argv[++i]);
    else if (arg === "--bridge-wait-ms") args.bridgeWaitMs = Number(argv[++i]);
  }
  if (args.once) args.maxPhases = 1;
  return args;
}
function paths(autoOps) {
  return {
    control: path.join(autoOps, "00_control_center"),
    outbox: path.join(autoOps, "15_bridge_outbox"),
    downloads: path.join(autoOps, "13_chatgpt_downloads"),
    handoff: path.join(autoOps, "06_handoff"),
    needsAttention: path.join(autoOps, "17_needs_attention"),
    evidence: path.join(autoOps, "00_control_center", "evidence"),
    mergePending: path.join(autoOps, "09_merge_pending")
  };
}
function defaultState() {
  return {
    enabled: true,
    maxConsecutivePhases: 1,
    maxRepairAttemptsPerPhase: 2,
    stopOnNeedsAttention: true,
    allowSafeAutoMerge: true,
    allowNewChatFallback: false,
    allowRandomRecentChatFallback: false,
    requireSavedChatTarget: true,
    ignoreExistingNeedsAttentionAtStart: true
  };
}

function phaseNumberFromName(name) {
  const match = String(name || "").match(/phase[_-]?(\d+)/i);
  return match ? Number(match[1]) : 0;
}
function latestClosedPhase(p) {
  if (!fs.existsSync(p.handoff)) return null;
  const closed = listFiles(p.handoff)
    .map((file) => ({ file, name: path.basename(file), phase: phaseNumberFromName(path.basename(file)), mtime: fileMtimeMs(file) }))
    .filter((item) => item.phase > 0 && item.name.toLowerCase().includes("closed_cleanly"))
    .sort((a, b) => b.phase - a.phase || b.mtime - a.mtime)[0] || null;
  return closed;
}
function ensureSavedTarget(p) {
  const targetPath = path.join(p.control, "chatgpt-target.json");
  const legacyPath = path.join(autoOpsDir(), "12_browser_helper_state", "chatgpt-bridge-target.json");
  const source = fs.existsSync(targetPath) ? targetPath : legacyPath;
  if (!fs.existsSync(source)) return null;
  const target = readJson(source, null);
  if (!target) return null;
  if (!fs.existsSync(targetPath) && source === legacyPath) writeJson(targetPath, target);
  return target;
}
function reconcileControlCenter(p, mission) {
  ensureDir(p.control); ensureDir(path.join(p.control, "archive"));
  const closed = latestClosedPhase(p);
  const nextMission = { ...(mission || {}) };
  const changes = [];
  if (closed?.phase) {
    const current = Number(nextMission.currentPhase || 0);
    const next = Number(nextMission.nextPhase || 0);
    if (!current || current < closed.phase) { nextMission.currentPhase = closed.phase; changes.push(`currentPhase=${closed.phase}`); }
    if (!next || next <= closed.phase) { nextMission.nextPhase = closed.phase + 1; changes.push(`nextPhase=${closed.phase + 1}`); }
    nextMission.lastClosedCleanly = { phase: closed.phase, handoff: closed.file, detectedAt: new Date().toISOString() };
  }
  const requestPath = path.join(p.control, "artifact-watch-request.json");
  const req = readJson(requestPath, null);
  if (req && closed?.phase && Number(req.phase || 0) <= closed.phase) {
    const archived = path.join(p.control, "archive", `artifact-watch-request-phase${req.phase || "unknown"}-${timestamp()}.json`);
    writeJson(archived, { ...req, active: false, status: "archived_stale_closed_phase", archivedAt: new Date().toISOString(), closedPhase: closed.phase });
    try { fs.unlinkSync(requestPath); } catch {}
    changes.push(`archived stale artifact request for phase ${req.phase || "unknown"}`);
  }
  if (changes.length > 0) {
    nextMission.updatedAt = new Date().toISOString();
    nextMission.updatedBy = VERSION;
    writeJson(path.join(p.control, "phase-mission.json"), nextMission);
  }
  const target = ensureSavedTarget(p);
  const summary = { version: VERSION, changed: changes.length > 0, changes, latestClosedPhase: closed, targetPresent: !!target, mission: nextMission, updatedAt: new Date().toISOString() };
  writeJson(path.join(p.evidence, `control-center-reconcile-${timestamp()}.json`), summary);
  return { mission: nextMission, target, summary };
}

function loadControl(autoOps) {
  const p = paths(autoOps);
  const state = { ...defaultState(), ...(readJson(path.join(p.control, "autopilot-state.json"), {}) || {}) };
  const mission = readJson(path.join(p.control, "phase-mission.json"), {}) || {};
  const target = readJson(path.join(p.control, "chatgpt-target.json"), null);
  return { p, state, mission, target };
}
function stopPauseDecision(p, state, target) {
  const stopCandidates = ["stop.flag", "STOP_AUTOPILOT.flag", path.join("stop", "STOP_AUTOPILOT.txt")].map((name) => path.join(p.control, name));
  const pauseCandidates = ["pause.flag", "PAUSE_AUTOPILOT.flag", path.join("pause", "PAUSE_AUTOPILOT.txt")].map((name) => path.join(p.control, name));
  const stop = stopCandidates.find((file) => fs.existsSync(file));
  const pause = pauseCandidates.find((file) => fs.existsSync(file));
  if (stop) return { ok: false, status: "stopped", reason: `stop file present: ${stop}` };
  if (pause) return { ok: false, status: "paused", reason: `pause file present: ${pause}` };
  if (state.enabled !== true) return { ok: false, status: "disabled", reason: "autopilot-state.json enabled is not true" };
  if (!target || !target.targetUrl || target.targetUrl === "OWNER_SET_CHATGPT_THREAD_URL") return { ok: false, status: "needs_attention", reason: "saved ChatGPT target is missing" };
  if (target.allowNewChatFallback !== false || target.allowRandomRecentChatFallback !== false) return { ok: false, status: "needs_attention", reason: "ChatGPT fallback flags must remain false" };
  return { ok: true };
}
function phaseFromMission(mission, args, index) {
  if (args.phase) {
    const title = args.title || `Phase ${args.phase} Safe Autopilot Continuation v1`;
    const expectedZipName = args.expectedZipName || `s.e.r.a_phase${args.phase}_${slugify(title)}_overlay.zip`;
    return { phase: args.phase, title, expectedZipName, purpose: `Complete ${title} as a guarded S.E.R.A. overlay.`, requirements: [] };
  }
  const queue = Array.isArray(mission.phaseQueue) ? mission.phaseQueue : [];
  if (queue[index]) {
    const task = queue[index];
    const phase = Number(task.phase || task.phaseNumber || task.id);
    const title = task.title || task.phaseName || `Phase ${phase} Safe Autopilot Continuation v1`;
    const expectedZipName = task.expectedZipName || `s.e.r.a_phase${phase}_${slugify(title)}_overlay.zip`;
    return { phase, title, expectedZipName, purpose: task.purpose || `Complete ${title} as a guarded S.E.R.A. overlay.`, requirements: task.requirements || [] };
  }
  const base = Number(mission.nextPhase || mission.currentPhase || 119) + index + (mission.nextPhase ? 0 : 1);
  const title = mission.nextPhaseName || mission.nextPhaseTitle || `Phase ${base} Safe Autopilot Continuation v1`;
  const expectedZipName = mission.expectedZipName || `s.e.r.a_phase${base}_${slugify(title)}_overlay.zip`;
  return { phase: base, title, expectedZipName, purpose: mission.mission || `Continue S.E.R.A. guarded autopilot hardening with ${title}.`, requirements: mission.requirements || [] };
}
function inRange(task, state) {
  const range = state.phaseRange || {};
  if (range.start && task.phase < Number(range.start)) return false;
  if (range.end && task.phase > Number(range.end)) return false;
  return true;
}
function buildPrompt(task) {
  const reqs = [
    "Return a downloadable ZIP link.",
    "Return SHA256.",
    "ZIP root must be repo/.",
    "Include .overlay manifest.",
    "Include .sera-proof verification file.",
    "Use the existing S.E.R.A. safety gates.",
    "Preserve the saved ChatGPT target only; no random or new-chat fallback.",
    "Stop if owner judgment is required."
  ].concat(Array.isArray(task.requirements) ? task.requirements : []);
  return [
    "S.E.R.A. PHASE REQUEST",
    "",
    "Return the downloadable overlay ZIP for:",
    "",
    `Phase ${task.phase} — ${task.title}`,
    "",
    "Expected ZIP filename:",
    task.expectedZipName,
    "",
    "Purpose:",
    task.purpose,
    "",
    "Requirements:",
    ...reqs.map((line) => `- ${line}`),
    ""
  ].join("\n");
}
function writePhasePrompt(p, task) {
  ensureDir(p.outbox);
  const file = path.join(p.outbox, `phase${task.phase}-${slugify(task.title)}-${timestamp()}.md`);
  writeText(file, buildPrompt(task));
  return file;
}
function writeArtifactWatchRequest(p, task, promptFile) {
  const requestPath = path.join(p.control, "artifact-watch-request.json");
  const request = {
    schemaVersion: 1,
    active: true,
    status: "waiting_for_artifact",
    phase: task.phase,
    title: task.title,
    promptFile,
    expectedZipName: task.expectedZipName,
    createdAt: new Date().toISOString(),
    source: VERSION
  };
  writeJson(requestPath, request);
  return requestPath;
}
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false, ...options, env: { ...process.env, ...(options.env || {}) } });
  return { command, args, status: result.status, signal: result.signal, stdout: result.stdout || "", stderr: result.stderr || "" };
}
function runOrThrow(command, args, options = {}) {
  const result = run(command, args, options);
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
  return result;
}
function psExe() { return process.platform === "win32" ? "powershell" : "pwsh"; }
function startTask(name) {
  return run(psExe(), ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", `Start-ScheduledTask -TaskName ${JSON.stringify(name)}`]);
}
function bridgeArgs(promptFile, expectedZipName, args) {
  const ps = ["-ExecutionPolicy", "Bypass", "-File", path.join("scripts", "sera-chatgpt-submit-download.ps1")];
  if (args.mode === "execute") ps.push("-Execute");
  ps.push("-PromptFile", promptFile, "-ExpectedZipName", expectedZipName);
  return ps;
}
function newestMatching(dir, matcher, sinceMs = 0) {
  return listFiles(dir).filter((file) => fileMtimeMs(file) >= sinceMs && matcher(path.basename(file))).sort((a, b) => fileMtimeMs(b) - fileMtimeMs(a))[0] || null;
}
function newNeedsAttention(p, sinceMs) {
  return listFiles(p.needsAttention).filter((file) => fileMtimeMs(file) >= sinceMs).sort((a, b) => fileMtimeMs(b) - fileMtimeMs(a));
}
function classifyBlock(text) {
  const lower = text.toLowerCase();
  const hard = ["secret", "token", "credential", "password", "api key", "paid service", "billing", "github security", "repository settings", "npm install", "install dependency", "winget install", "force push", "rm -rf", "delete repository"];
  const hardHit = hard.find((needle) => lower.includes(needle));
  if (hardHit) return { recoverable: false, reason: `owner-required keyword: ${hardHit}` };
  const recover = ["download", "zip", "router", "unknown zip pattern", "validation", "syntax", "test", "artifact", "overlay", "timed out", "missing", "cannot find path", "blocked"];
  const recoverHit = recover.find((needle) => lower.includes(needle));
  if (recoverHit) return { recoverable: true, reason: `recoverable keyword: ${recoverHit}` };
  return { recoverable: false, reason: "unclear blocked state" };
}
function writeAttention(p, title, body) {
  const file = path.join(p.needsAttention, `${title}-${timestamp()}.md`);
  writeText(file, body);
  return file;
}
async function waitForHandoff(p, task, sinceMs, state, runEvidence) {
  const stem = basenameNoZip(task.expectedZipName).toLowerCase();
  const phaseNeedle = `phase${task.phase}`;
  let mergeStarted = false;
  const deadline = Date.now() + Number(state.runnerWaitMs || runEvidence.runnerWaitMs || 1200000);
  while (Date.now() < deadline) {
    const closed = newestMatching(p.handoff, (name) => name.toLowerCase().includes(stem) && name.includes("CLOSED_CLEANLY"), sinceMs);
    if (closed) return { status: "closed_cleanly", handoff: closed };
    const pass = newestMatching(p.handoff, (name) => name.toLowerCase().includes(stem) && name.includes("PASS"), sinceMs);
    if (pass && state.allowSafeAutoMerge === true && !mergeStarted) {
      mergeStarted = true;
      runEvidence.safeMergeStartedAt = new Date().toISOString();
      runEvidence.safeMergeTask = startTask("SERA Safe Merge Auto Approver");
      await sleep(15000);
      runEvidence.runnerAfterMerge = startTask("SERA AutoOps Runner");
    }
    const blocked = newestMatching(p.handoff, (name) => (name.toLowerCase().includes(stem) || name.toLowerCase().includes(phaseNeedle)) && name.includes("BLOCKED"), sinceMs);
    const attention = newNeedsAttention(p, sinceMs)[0];
    if (blocked || attention) return { status: "blocked", handoff: blocked || null, attention: attention || null };
    await sleep(10000);
  }
  return { status: "timeout", reason: "Timed out waiting for PASS/CLOSED_CLEANLY/BLOCKED handoff" };
}
async function runOne(task, args, control, index) {
  const { p, state } = control;
  const startMs = Date.now();
  const evidence = { version: VERSION, startedAt: new Date().toISOString(), task, mode: args.mode, index, runnerWaitMs: args.runnerWaitMs };
  ensureDir(p.evidence);
  const evidencePath = path.join(p.evidence, `phase${task.phase}-autopilot-${timestamp()}.json`);
  try {
    if (!inRange(task, state)) throw new Error(`Phase ${task.phase} is outside allowed phase range.`);
    const promptFile = args.promptFile ? path.resolve(args.promptFile) : writePhasePrompt(p, task);
    evidence.promptFile = promptFile;
    evidence.expectedZipName = task.expectedZipName;
    evidence.artifactWatchRequest = writeArtifactWatchRequest(p, task, promptFile);
    if (args.mode === "dry-run") {
      evidence.status = "dry_run_ready";
      writeJson(evidencePath, evidence);
      return { ok: true, status: "dry_run_ready", evidencePath };
    }
    const bridge = runOrThrow(psExe(), bridgeArgs(promptFile, task.expectedZipName, args), { env: { SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE: "true" } });
    evidence.bridge = bridge;
    evidence.downloadRouterStarted = startTask("SERA Download Router");
    await sleep(15000);
    evidence.autoOpsRunnerStarted = startTask("SERA AutoOps Runner");
    const outcome = await waitForHandoff(p, task, startMs, { ...state, runnerWaitMs: args.runnerWaitMs }, evidence);
    evidence.outcome = outcome;
    if (outcome.status === "closed_cleanly") {
      evidence.status = "closed_cleanly";
      writeJson(evidencePath, evidence);
      return { ok: true, status: "closed_cleanly", handoff: outcome.handoff, evidencePath };
    }
    if (outcome.status === "blocked") {
      const reasonFile = outcome.handoff || outcome.attention;
      const reasonText = reasonFile && fs.existsSync(reasonFile) ? fs.readFileSync(reasonFile, "utf8") : JSON.stringify(outcome);
      const classification = classifyBlock(reasonText);
      evidence.classification = classification;
      writeJson(evidencePath, evidence);
      return { ok: false, status: "blocked", classification, reasonFile, evidencePath };
    }
    evidence.status = "timeout";
    writeJson(evidencePath, evidence);
    return { ok: false, status: "timeout", evidencePath };
  } catch (error) {
    evidence.status = "error";
    evidence.error = error instanceof Error ? error.message : String(error);
    writeJson(evidencePath, evidence);
    const attentionPath = writeAttention(p, `AUTOPILOT_LOOP_NEEDS_ATTENTION-phase${task.phase}`, `# S.E.R.A. Autopilot Loop Needs Attention\n\nPhase: ${task.phase}\n\n## Reason\n\n${evidence.error}\n\n## Evidence\n\n${evidencePath}\n`);
    return { ok: false, status: "error", error: evidence.error, attentionPath, evidencePath };
  }
}
function runRepair(task, attempt, reasonFile) {
  const result = runOrThrow(process.execPath, [path.join("scripts", "sera-autopilot-repair-orchestrator.mjs"), "--phase", String(task.phase), "--title", task.title, "--expected-zip-name", task.expectedZipName, "--reason-file", reasonFile || "", "--attempt", String(attempt)]);
  return JSON.parse(result.stdout);
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const autoOps = autoOpsDir();
  const control = loadControl(autoOps);
  for (const dir of Object.values(control.p)) ensureDir(dir);
  const reconciled = reconcileControlCenter(control.p, control.mission);
  control.mission = reconciled.mission;
  control.target = reconciled.target || control.target;
  const gate = stopPauseDecision(control.p, control.state, control.target);
  if (!gate.ok) {
    console.log(JSON.stringify({ ok: false, ...gate }, null, 2));
    process.exitCode = gate.status === "paused" || gate.status === "disabled" ? 0 : 2;
    return;
  }
  const maxByState = Number(control.state.maxConsecutivePhases || 1);
  const max = Math.max(1, Math.min(Number(args.maxPhases || 1), maxByState));
  const summary = { version: VERSION, autoOps, maxPhases: max, reconciliation: reconciled.summary, results: [] };
  for (let i = 0; i < max; i += 1) {
    const task = phaseFromMission(control.mission, args, i);
    let result = await runOne(task, args, control, i);
    let attempt = 0;
    while (!result.ok && result.status === "blocked" && result.classification?.recoverable && attempt < Number(control.state.maxRepairAttemptsPerPhase || 0)) {
      attempt += 1;
      const repair = runRepair(task, attempt, result.reasonFile);
      const repairTask = { phase: task.phase, title: `${task.title} Repair Attempt ${attempt}`, expectedZipName: repair.expectedZipName, purpose: `Repair Phase ${task.phase} blocked state.`, requirements: [] };
      result = await runOne(repairTask, args, control, i);
      result.repairAttempt = attempt;
    }
    summary.results.push(result);
    if (!result.ok) {
      const attentionPath = writeAttention(control.p, `AUTOPILOT_STOPPED-phase${task.phase}`, `# S.E.R.A. Autopilot Stopped\n\nPhase: ${task.phase}\n\n## Result\n\n${JSON.stringify(result, null, 2)}\n`);
      summary.stopped = true;
      summary.attentionPath = attentionPath;
      break;
    }
  }
  const summaryPath = path.join(control.p.evidence, `autopilot-summary-${timestamp()}.json`);
  writeJson(summaryPath, summary);
  console.log(JSON.stringify({ ok: !summary.stopped, summaryPath, results: summary.results }, null, 2));
  if (summary.stopped) process.exitCode = 2;
}
main();

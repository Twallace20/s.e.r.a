#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const VERSION = "phase122-control-center-handoff-reconciler-next-phase-resolver-v1";

function autoOpsDir() { return process.env.SERA_AUTOOPS_DIR || path.join(os.homedir(), "OneDrive", "SERA-AutoOps"); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function timestamp() { return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "_"); }
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
function isFile(file) { try { return fs.statSync(file).isFile(); } catch { return false; } }
function fileMtimeMs(file) { return fs.statSync(file).mtimeMs; }
function paths(autoOps) {
  return {
    control: path.join(autoOps, "00_control_center"),
    handoff: path.join(autoOps, "06_handoff"),
    evidence: path.join(autoOps, "00_control_center", "evidence"),
    archive: path.join(autoOps, "00_control_center", "archive"),
    outbox: path.join(autoOps, "15_bridge_outbox")
  };
}
function phaseNumberFromName(name) {
  const match = String(name || "").match(/phase[_-]?(\d+)/i);
  return match ? Number(match[1]) : 0;
}
function latestClosedPhase(p) {
  if (!fs.existsSync(p.handoff)) return null;
  return fs.readdirSync(p.handoff)
    .map((name) => ({ name, file: path.join(p.handoff, name), phase: phaseNumberFromName(name) }))
    .filter((item) => item.phase > 0 && item.name.toLowerCase().includes("closed_cleanly") && isFile(item.file))
    .sort((a, b) => b.phase - a.phase || fileMtimeMs(b.file) - fileMtimeMs(a.file))[0] || null;
}
function ensureSavedTarget(autoOps, p) {
  const targetPath = path.join(p.control, "chatgpt-target.json");
  const legacyPath = path.join(autoOps, "12_browser_helper_state", "chatgpt-bridge-target.json");
  const source = fs.existsSync(targetPath) ? targetPath : legacyPath;
  if (!fs.existsSync(source)) return { present: false, targetPath, legacyPath };
  const target = readJson(source, null);
  if (target && source === legacyPath && !fs.existsSync(targetPath)) writeJson(targetPath, target);
  return { present: !!target, source, targetPath, targetUrlPresent: !!target?.targetUrl };
}
function reconcile(autoOps) {
  const p = paths(autoOps);
  ensureDir(p.control); ensureDir(p.evidence); ensureDir(p.archive);
  const changes = [];
  const closed = latestClosedPhase(p);
  const missionPath = path.join(p.control, "phase-mission.json");
  const mission = readJson(missionPath, {}) || {};
  if (closed?.phase) {
    const current = Number(mission.currentPhase || 0);
    const next = Number(mission.nextPhase || 0);
    if (!current || current < closed.phase) { mission.currentPhase = closed.phase; changes.push(`currentPhase=${closed.phase}`); }
    if (!next || next <= closed.phase) { mission.nextPhase = closed.phase + 1; changes.push(`nextPhase=${closed.phase + 1}`); }
    mission.lastClosedCleanly = { phase: closed.phase, handoff: closed.file, detectedAt: new Date().toISOString() };
  }
  mission.updatedAt = new Date().toISOString();
  mission.updatedBy = VERSION;
  writeJson(missionPath, mission);

  const requestPath = path.join(p.control, "artifact-watch-request.json");
  const request = readJson(requestPath, null);
  let archivedRequest = null;
  if (request && closed?.phase && Number(request.phase || 0) <= closed.phase) {
    archivedRequest = path.join(p.archive, `artifact-watch-request-phase${request.phase || "unknown"}-${timestamp()}.json`);
    writeJson(archivedRequest, { ...request, active: false, status: "archived_stale_closed_phase", archivedAt: new Date().toISOString(), closedPhase: closed.phase, closedHandoff: closed.file });
    try { fs.unlinkSync(requestPath); } catch {}
    changes.push(`archived stale artifact-watch-request for phase ${request.phase || "unknown"}`);
  }

  const target = ensureSavedTarget(autoOps, p);
  if (target.present && target.source && target.source !== target.targetPath) changes.push("copied legacy ChatGPT target into control center");

  const summary = { ok: true, version: VERSION, autoOps, latestClosedPhase: closed, mission, target, archivedRequest, changed: changes.length > 0, changes, evidenceAt: new Date().toISOString() };
  const evidencePath = path.join(p.evidence, `control-center-reconcile-${timestamp()}.json`);
  writeJson(evidencePath, summary);
  return { ...summary, evidencePath };
}

try {
  const result = reconcile(autoOpsDir());
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.log(JSON.stringify({ ok: false, version: VERSION, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 2;
}

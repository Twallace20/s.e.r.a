#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const VERSION = "phase127-closed-phase-reprocessing-guard-v1";
function autoOpsDir(){ return process.env.SERA_AUTOOPS_DIR || path.join(os.homedir(), "OneDrive", "SERA-AutoOps"); }
function ensureDir(dir){ fs.mkdirSync(dir,{recursive:true}); }
function timestamp(){ return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "_"); }
function decode(buffer){
  if (!buffer || buffer.length === 0) return "";
  let text = buffer.toString("utf8");
  const nulls = (text.match(/\u0000/g) || []).length;
  if (nulls > Math.max(2, text.length / 20)) text = buffer.toString("utf16le");
  return text.replace(/^\uFEFF/, "").replace(/\u0000/g, "");
}
function readText(file){ return fs.existsSync(file) ? decode(fs.readFileSync(file)) : ""; }
function writeJson(file, data){ ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(data,null,2)+"\n", "utf8"); }
function listFiles(dir){ return fs.existsSync(dir) ? fs.readdirSync(dir).map(name=>path.join(dir,name)).filter(file=>{ try { return fs.statSync(file).isFile(); } catch { return false; }}) : []; }
function phaseFromName(name){ const m=String(name||"").match(/phase[_-]?(\d+)/i); return m ? Number(m[1]) : 0; }
function closedHandoffs(autoOps){
  const handoff = path.join(autoOps, "06_handoff");
  const map = new Map();
  for (const file of listFiles(handoff)) {
    const name = path.basename(file).toLowerCase();
    const phase = phaseFromName(name);
    if (!phase || !name.includes("closed_cleanly")) continue;
    const prior = map.get(phase);
    const record = { phase, file, mtime: fs.statSync(file).mtimeMs };
    if (!prior || record.mtime > prior.mtime) map.set(phase, record);
  }
  return map;
}
function archiveFile(file, archiveDir){
  ensureDir(archiveDir);
  const dest = path.join(archiveDir, file.replace(/[:\\/]/g, "_"));
  fs.renameSync(file, dest);
  return dest;
}
function main(){
  const autoOps = autoOpsDir();
  const control = path.join(autoOps, "00_control_center");
  const evidence = path.join(control, "evidence");
  const closed = closedHandoffs(autoOps);
  const archiveDir = path.join(control, "archive", `closed-phase-reprocessing-guard-${timestamp()}`);
  const queueDirs = ["01_apply_approved", "02_hotfix_approved", "08_processing", "13_chatgpt_downloads", "15_bridge_outbox", "17_needs_attention"].map(rel=>path.join(autoOps, rel));
  const archived = [];
  for (const dir of queueDirs) {
    for (const file of listFiles(dir)) {
      const phase = phaseFromName(path.basename(file));
      if (!phase || !closed.has(phase)) continue;
      const closedFile = closed.get(phase).file;
      const name = path.basename(file).toLowerCase();
      if (name.includes("closed_cleanly")) continue;
      const text = file.endsWith(".md") || file.endsWith(".json") ? readText(file).slice(0, 2000) : "";
      const dest = archiveFile(file, archiveDir);
      archived.push({ phase, from: file, to: dest, closedHandoff: closedFile, sample: text ? text.slice(0, 200) : undefined });
    }
  }
  const result = { ok: true, version: VERSION, checkedAt: new Date().toISOString(), autoOps, closedPhaseCount: closed.size, archivedCount: archived.length, archived };
  writeJson(path.join(evidence, `closed-phase-reprocessing-guard-${timestamp()}.json`), result);
  writeJson(path.join(control, "closed-phase-reprocessing-guard-last-result.json"), result);
  console.log(JSON.stringify(result,null,2));
}
main();

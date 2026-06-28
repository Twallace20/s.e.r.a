#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const VERSION = "phase118-autopilot-governor-control-center-v1";

function autoOpsDir() {
  return process.env.SERA_AUTOOPS_DIR || path.join(os.homedir(), "OneDrive", "SERA-AutoOps");
}
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function writeJsonIfMissing(file, value) {
  ensureDir(path.dirname(file));
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}
function writeTextIfMissing(file, value) {
  ensureDir(path.dirname(file));
  if (!fs.existsSync(file)) fs.writeFileSync(file, value, "utf8");
}
function listFiles(dir, limit = 20) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).map((name) => {
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    return { name, path: file, modifiedAt: stat.mtime.toISOString(), size: stat.size };
  }).sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)).slice(0, limit);
}
function defaultState() {
  return {
    schemaVersion: 1,
    version: VERSION,
    autopilot: "guarded",
    enabled: false,
    timingMode: "owner_started",
    phaseRange: { start: 118, end: 140 },
    maxConsecutivePhases: 1,
    maxRepairAttemptsPerPhase: 2,
    stopOnNeedsAttention: true,
    allowSafeAutoMerge: true,
    allowNewChatFallback: false,
    allowRandomRecentChatFallback: false,
    requireSavedChatTarget: true,
    ownerApprovalRequiredFor: [
      "security_settings",
      "paid_services",
      "dependency_installs",
      "destructive_commands",
      "credential_material",
      "unclear_repairs"
    ],
    createdBy: VERSION
  };
}
function defaultMission() {
  return {
    schemaVersion: 1,
    currentPhase: 118,
    phaseRange: { start: 118, end: 140 },
    mission: "Continue S.E.R.A. guarded autopilot hardening with owner-safe control center governance.",
    nextExpectedPhase: "Phase 119 or the next owner-selected phase after Phase 118 closes cleanly."
  };
}
function defaultRegistry() {
  return {
    schemaVersion: 1,
    services: {
      chatgptBridge: { enabled: true, requiresSavedTarget: true, executeEnv: "SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE" },
      downloadRouter: { enabled: true, intake: "13_chatgpt_downloads" },
      autoOpsRunner: { enabled: true, validatesWith: "npm run sera:gate" },
      safeMergeAutoApprover: { enabled: true, requiresOwnerMergeApprovalFile: true }
    }
  };
}
function maybeCopyTarget(autoOps, controlDir) {
  const next = path.join(controlDir, "chatgpt-target.json");
  if (fs.existsSync(next)) return { path: next, created: false, source: "existing" };
  const legacy = path.join(autoOps, "12_browser_helper_state", "chatgpt-bridge-target.json");
  if (fs.existsSync(legacy)) {
    ensureDir(controlDir);
    const target = readJson(legacy);
    target.controlCenterManaged = true;
    target.allowNewChatFallback = false;
    target.allowRandomRecentChatFallback = false;
    fs.writeFileSync(next, JSON.stringify(target, null, 2) + "\n", "utf8");
    return { path: next, created: true, source: legacy };
  }
  writeJsonIfMissing(next, {
    targetName: "S.E.R.A. saved ChatGPT thread",
    targetUrl: "OWNER_SET_CHATGPT_THREAD_URL",
    cdpEndpoint: "http://127.0.0.1:9222",
    allowNewChatFallback: false,
    allowRandomRecentChatFallback: false,
    composerSelectors: []
  });
  return { path: next, created: true, source: "template" };
}
function init(autoOps) {
  const controlDir = path.join(autoOps, "00_control_center");
  ensureDir(controlDir);
  for (const dir of ["approvals", "needs_attention", "phase_missions", "directives", "services", "evidence", "archive", "pause", "stop"]) {
    ensureDir(path.join(controlDir, dir));
  }
  writeJsonIfMissing(path.join(controlDir, "autopilot-state.json"), defaultState());
  writeJsonIfMissing(path.join(controlDir, "phase-mission.json"), defaultMission());
  writeJsonIfMissing(path.join(controlDir, "service-registry.json"), defaultRegistry());
  writeTextIfMissing(path.join(controlDir, "directives.md"), `# S.E.R.A. Control Center Directives\n\n- Use guarded autopilot.\n- Use only the saved ChatGPT target URL.\n- Stop on unclear, destructive, paid, security-sensitive, or owner-risk actions.\n- Keep owner approval required for merge, high-risk repairs, and external service changes.\n`);
  const target = maybeCopyTarget(autoOps, controlDir);
  return { controlDir, target };
}
function status(autoOps) {
  const controlDir = path.join(autoOps, "00_control_center");
  const state = readJson(path.join(controlDir, "autopilot-state.json"), null);
  const mission = readJson(path.join(controlDir, "phase-mission.json"), null);
  const target = readJson(path.join(controlDir, "chatgpt-target.json"), null);
  const stopFiles = ["stop.flag", "STOP_AUTOPILOT.flag", path.join("stop", "STOP_AUTOPILOT.txt")].filter((name) => fs.existsSync(path.join(controlDir, name)));
  const pauseFiles = ["pause.flag", "PAUSE_AUTOPILOT.flag", path.join("pause", "PAUSE_AUTOPILOT.txt")].filter((name) => fs.existsSync(path.join(controlDir, name)));
  const queues = {
    downloads: listFiles(path.join(autoOps, "13_chatgpt_downloads"), 10),
    bridgeOutbox: listFiles(path.join(autoOps, "15_bridge_outbox"), 10),
    mergePending: listFiles(path.join(autoOps, "09_merge_pending"), 10),
    needsAttention: listFiles(path.join(autoOps, "17_needs_attention"), 10)
  };
  let decision = "ready";
  const reasons = [];
  if (!state) { decision = "needs_attention"; reasons.push("autopilot-state.json missing; run --init"); }
  if (state && state.enabled !== true) { decision = "disabled"; reasons.push("autopilot enabled is false"); }
  if (stopFiles.length) { decision = "stopped"; reasons.push(`stop file present: ${stopFiles[0]}`); }
  if (pauseFiles.length) { decision = "paused"; reasons.push(`pause file present: ${pauseFiles[0]}`); }
  if (state?.stopOnNeedsAttention !== false && queues.needsAttention.length) { decision = "needs_attention"; reasons.push("needs-attention queue is not empty"); }
  if (target && (!target.targetUrl || target.targetUrl === "OWNER_SET_CHATGPT_THREAD_URL")) { decision = "needs_attention"; reasons.push("chatgpt-target.json needs an owner-set targetUrl"); }
  return { version: VERSION, autoOps, controlDir, decision, reasons, state, mission, targetSummary: target ? { targetName: target.targetName || null, targetUrlSet: Boolean(target.targetUrl && target.targetUrl !== "OWNER_SET_CHATGPT_THREAD_URL"), cdpEndpoint: target.cdpEndpoint || null, allowNewChatFallback: target.allowNewChatFallback, allowRandomRecentChatFallback: target.allowRandomRecentChatFallback } : null, queues };
}
function main() {
  const args = new Set(process.argv.slice(2));
  const autoOps = autoOpsDir();
  if (args.has("--init")) init(autoOps);
  const current = status(autoOps);
  console.log(JSON.stringify(current, null, 2));
  if (current.decision === "needs_attention" || current.decision === "stopped") process.exitCode = 2;
}
main();

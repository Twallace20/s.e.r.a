#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const VERSION = "phase127-closed-phase-reprocessing-guard-v1";

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
function readText(file) { return file && fs.existsSync(file) ? decodeText(fs.readFileSync(file)) : ""; }
function writeText(file, text) { ensureDir(path.dirname(file)); fs.writeFileSync(file, text, "utf8"); }
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8"); }
function readJson(file, fallback = null) {
  if (!file || !fs.existsSync(file)) return fallback;
  const text = readText(file).trim();
  if (!text) return fallback;
  return JSON.parse(text);
}
function parseArgs(argv) {
  const args = { phase: null, title: "", expectedZipName: "", reasonFile: "", attempt: 1, json: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--phase") args.phase = Number(argv[++i]);
    else if (arg === "--title") args.title = argv[++i];
    else if (arg === "--expected-zip-name") args.expectedZipName = argv[++i];
    else if (arg === "--reason-file") args.reasonFile = argv[++i];
    else if (arg === "--attempt") args.attempt = Number(argv[++i]);
  }
  return args;
}
function sanitizeForBridge(text) {
  return String(text || "")
    .replace(/secret/gi, "sensitive-value")
    .replace(/token/gi, "sensitive-value")
    .replace(/credential/gi, "sensitive-value")
    .replace(/password/gi, "sensitive-value")
    .replace(/api[_ -]?key/gi, "sensitive-value")
    .replace(/billing/gi, "external-service-change")
    .replace(/paid service/gi, "external-service-change")
    .slice(0, 12000);
}
function classify(text) {
  const lower = sanitizeForBridge(text).toLowerCase();
  const hardStops = [
    "github security", "repository settings", "npm install", "winget install", "install dependency",
    "delete repository", "remove origin", "force push", "rm -rf", "destructive"
  ];
  const hardHit = hardStops.find((needle) => lower.includes(needle));
  if (hardHit) return { decision: "owner_required", repairable: false, reason: `owner-required keyword: ${hardHit}` };

  const repairable = [
    "download", "downloadable", "zip", "router", "unknown zip pattern", "validation", "syntax", "test",
    "timed out", "timeout", "artifact", "overlay", "missing file", "cannot find path", "expected",
    "blocked", "send click failed", "target tab", "fetch failed", "nothing to commit", "working tree clean",
    "closed_cleanly", "already closed", "duplicate"
  ];
  const repairHit = repairable.find((needle) => lower.includes(needle));
  if (repairHit) return { decision: "hotfix_overlay", repairable: true, reason: `recoverable keyword: ${repairHit}` };
  return { decision: "owner_required", repairable: false, reason: "unclear blocked state" };
}
function expectedHotfixZip(phase, attempt) {
  return `s.e.r.a_phase${phase}_blocked_phase_hotfix_attempt${attempt}_overlay.zip`;
}
function latestBlocked(autoOps) {
  const dirs = [path.join(autoOps, "06_handoff"), path.join(autoOps, "17_needs_attention"), path.join(autoOps, "12_browser_helper_blocked")];
  const files = dirs.flatMap((dir) => fs.existsSync(dir) ? fs.readdirSync(dir).map((name) => path.join(dir, name)) : [])
    .filter((file) => fs.statSync(file).isFile())
    .filter((file) => /BLOCKED|NEEDS_ATTENTION|AUTOPILOT_STOPPED/i.test(path.basename(file)))
    .map((file) => ({ file, mtime: fs.statSync(file).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0]?.file || null;
}
function phaseFromName(name) {
  const m = String(name || "").match(/phase[_-]?(\d+)/i);
  return m ? Number(m[1]) : null;
}
function writeNeedsAttention(autoOps, payload) {
  const file = path.join(autoOps, "17_needs_attention", `HOTFIX_PROTOCOL_NEEDS_ATTENTION-phase${payload.phase || "unknown"}-${timestamp()}.md`);
  writeText(file, [
    "# S.E.R.A. Hotfix Protocol Needs Attention",
    "",
    `Version: ${VERSION}`,
    `Phase: ${payload.phase || "unknown"}`,
    "",
    "## Reason",
    "",
    payload.reason,
    "",
    "## Evidence",
    "",
    payload.reasonFile || "No reason file supplied."
  ].join("\n"));
  return file;
}
function buildPrompt({ phase, title, expectedZipName, attempt, reasonFile, evidence }) {
  const safeEvidence = sanitizeForBridge(evidence);
  return `S.E.R.A. HOTFIX REQUEST\n\nReturn the downloadable HOTFIX overlay ZIP for:\n\nPhase ${phase} — ${title} Hotfix Attempt ${attempt}\n\nExpected ZIP filename:\n${expectedZipName}\n\nPurpose:\nRepair the recoverable blocked state for Phase ${phase} using the smallest safe overlay, then allow the same phase to be retried.\n\nRequirements:\n- Return a downloadable ZIP link.\n- Return SHA256.\n- ZIP root must be repo/.\n- Include .overlay manifest.\n- Include .sera-proof verification file.\n- Treat this as a hotfix overlay routed to 02_hotfix_approved.\n- Prefer the smallest safe patch.\n- Preserve existing S.E.R.A. safety gates.\n- Preserve the saved ChatGPT target only; no random or new-chat fallback.\n- Do not alter external accounts, project settings, paid services, or owner-control boundaries.\n- Stop if owner decision is required.\n\nBlocked evidence source:\n${reasonFile || "not supplied"}\n\nFailure evidence excerpt:\n\n${safeEvidence}\n`;
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  const autoOps = autoOpsDir();
  const control = path.join(autoOps, "00_control_center");
  const outbox = path.join(autoOps, "15_bridge_outbox");
  ensureDir(control); ensureDir(outbox);

  const reasonFile = args.reasonFile || latestBlocked(autoOps);
  const evidence = readText(reasonFile);
  const phase = args.phase || phaseFromName(path.basename(reasonFile || ""));
  if (!phase) throw new Error("--phase is required when the blocked evidence filename does not contain a phase number.");

  const decision = classify(evidence);
  const title = args.title || `Phase ${phase} Blocked Repair`;
  const attempt = Number(args.attempt || 1);

  if (!decision.repairable) {
    const attentionPath = writeNeedsAttention(autoOps, { phase, reason: decision.reason, reasonFile });
    const payload = { ok: false, status: "owner_required", version: VERSION, phase, attempt, decision, reasonFile, attentionPath };
    writeJson(path.join(control, "hotfix-repair-last-result.json"), payload);
    console.log(JSON.stringify(payload, null, 2));
    process.exitCode = 2;
    return;
  }

  const expectedZipName = expectedHotfixZip(phase, attempt);
  const promptFile = path.join(outbox, `hotfix-phase${phase}-attempt${attempt}-${timestamp()}.md`);
  writeText(promptFile, buildPrompt({ phase, title, expectedZipName, attempt, reasonFile, evidence }));

  const request = {
    schemaVersion: 1,
    active: true,
    status: "waiting_for_hotfix_artifact",
    artifactMode: "hotfix_overlay",
    phase,
    repairOfPhase: phase,
    repairAttempt: attempt,
    title,
    promptFile,
    expectedZipName,
    routeHint: "02_hotfix_approved",
    reasonFile,
    decision,
    source: VERSION,
    createdAt: new Date().toISOString()
  };
  writeJson(path.join(control, "active-hotfix-request.json"), request);
  writeJson(path.join(control, "hotfix-repair-last-result.json"), { ok: true, status: "hotfix_prompt_ready", ...request });

  console.log(JSON.stringify({ ok: true, status: "hotfix_prompt_ready", phase, attempt, promptFile, expectedZipName, requestPath: path.join(control, "active-hotfix-request.json"), decision }, null, 2));
}

try { main(); }
catch (error) {
  console.error(JSON.stringify({ ok: false, status: "error", version: VERSION, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 2;
}

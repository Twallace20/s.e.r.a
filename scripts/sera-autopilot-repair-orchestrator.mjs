#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const VERSION = "phase119-autopilot-repair-orchestrator-v1";

function autoOpsDir() {
  return process.env.SERA_AUTOOPS_DIR || path.join(os.homedir(), "OneDrive", "SERA-AutoOps");
}
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function timestamp() { return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "_"); }
function parseArgs(argv) {
  const args = { phase: null, title: "", expectedZipName: "", reasonFile: "", attempt: 1 };
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
function readText(file) {
  if (!file || !fs.existsSync(file)) return "";
  return fs.readFileSync(file, "utf8");
}
function sanitizeForBridge(text) {
  return String(text || "")
    .replace(/secret/gi, "sensitive-value")
    .replace(/token/gi, "sensitive-value")
    .replace(/credential/gi, "sensitive-value")
    .replace(/password/gi, "sensitive-value")
    .replace(/api[_ -]?key/gi, "sensitive-value")
    .slice(0, 10000);
}
function classify(text) {
  const lower = text.toLowerCase();
  const hardStops = [
    "secret", "token", "credential", "password", "api key", "paid service", "billing",
    "github security", "repository settings", "npm install", "winget install", "install dependency",
    "delete repository", "remove origin", "force push", "rm -rf"
  ];
  const hit = hardStops.find((needle) => lower.includes(needle));
  if (hit) return { decision: "owner_required", reason: `hard-stop keyword: ${hit}` };

  const recoverable = [
    "download", "downloadable", "zip", "router", "unknown zip pattern", "validation", "syntax",
    "test", "timed out", "artifact", "overlay", "missing file", "cannot find path", "expected", "blocked"
  ];
  const recoverHit = recoverable.find((needle) => lower.includes(needle));
  if (recoverHit) return { decision: "repair_prompt", reason: `recoverable keyword: ${recoverHit}` };
  return { decision: "owner_required", reason: "unclear failure; owner review required" };
}
function expectedRepairZip(phase, attempt) {
  return `s.e.r.a_phase${phase}_autopilot_repair_attempt${attempt}_hotfix_overlay.zip`;
}
function writeNeedsAttention(autoOps, payload) {
  const dir = path.join(autoOps, "17_needs_attention");
  ensureDir(dir);
  const file = path.join(dir, `AUTOPILOT_REPAIR_NEEDS_ATTENTION-${timestamp()}.md`);
  fs.writeFileSync(file, [
    "# S.E.R.A. Autopilot Repair Needs Attention",
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
  ].join("\n"), "utf8");
  return file;
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  const autoOps = autoOpsDir();
  if (!args.phase) throw new Error("--phase is required");
  const rawEvidence = readText(args.reasonFile);
  const decision = classify(rawEvidence);
  if (decision.decision !== "repair_prompt") {
    const attentionPath = writeNeedsAttention(autoOps, { phase: args.phase, reason: decision.reason, reasonFile: args.reasonFile });
    console.log(JSON.stringify({ ok: false, status: "owner_required", decision, attentionPath }, null, 2));
    process.exitCode = 2;
    return;
  }

  const outbox = path.join(autoOps, "15_bridge_outbox");
  ensureDir(outbox);
  const expectedZipName = expectedRepairZip(args.phase, args.attempt);
  const safeEvidence = sanitizeForBridge(rawEvidence);
  const title = args.title || `Phase ${args.phase} Autopilot Repair`;
  const prompt = `S.E.R.A. REPAIR REQUEST\n\nReturn a downloadable HOTFIX overlay ZIP named exactly:\n${expectedZipName}\n\nFor:\nPhase ${args.phase} — ${title}\n\nPurpose:\nRepair the recoverable blocked state shown below without changing owner-control boundaries.\n\nRequirements:\n- Return a downloadable ZIP link.\n- Return SHA256.\n- ZIP root must be repo/.\n- Include .overlay manifest.\n- Include .sera-proof verification file.\n- Prefer the smallest safe patch.\n- Preserve the saved ChatGPT target only.\n- Do not alter external accounts or project safety gates.\n- Stop if the repair is unclear or requires owner judgment.\n\nFailure evidence excerpt:\n\n${safeEvidence}\n`;
  const promptFile = path.join(outbox, `repair-phase${args.phase}-attempt${args.attempt}-${timestamp()}.md`);
  fs.writeFileSync(promptFile, prompt, "utf8");
  console.log(JSON.stringify({ ok: true, status: "repair_prompt_ready", phase: args.phase, attempt: args.attempt, promptFile, expectedZipName, decision }, null, 2));
}
main();

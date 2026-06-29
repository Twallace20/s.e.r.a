#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const VERSION = "phase127-closed-phase-reprocessing-guard-v1";

function autoOpsDir() {
  return process.env.SERA_AUTOOPS_DIR || path.join(os.homedir(), "OneDrive", "SERA-AutoOps");
}
function repoDir() {
  return process.env.SERA_REPO_DIR || process.cwd();
}
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
function readText(file, fallback = "") { return file && fs.existsSync(file) ? decodeText(fs.readFileSync(file)) : fallback; }
function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  const text = decodeText(fs.readFileSync(file)).trim();
  if (!text) return fallback;
  return JSON.parse(text);
}
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8"); }
function writeText(file, text) { ensureDir(path.dirname(file)); fs.writeFileSync(file, text, "utf8"); }
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex").toUpperCase(); }
function fileHash(file) { return sha256(fs.readFileSync(file)); }
function fileMtimeMs(file) { return fs.statSync(file).mtimeMs; }
function isFile(file) { try { return fs.statSync(file).isFile(); } catch { return false; } }
function psExe() { return process.platform === "win32" ? "powershell" : "pwsh"; }
function parseArgs(argv) {
  const args = {
    mode: "once",
    dryRun: false,
    promptFile: "",
    expectedZipName: "",
    startRunner: false,
    routeMode: "auto",
    pollMs: 30000,
    maxWaitMs: 1200000,
    refreshMs: 300000,
    maxAttemptsPerPrompt: 2,
    idlePasses: 1
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--once") args.mode = "once";
    else if (arg === "--watch") args.mode = "watch";
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--prompt-file") args.promptFile = argv[++i];
    else if (arg === "--expected-zip-name") args.expectedZipName = argv[++i];
    else if (arg === "--start-runner") args.startRunner = true;
    else if (arg === "--route-mode") args.routeMode = argv[++i];
    else if (arg === "--poll-ms") args.pollMs = Number(argv[++i]);
    else if (arg === "--max-wait-ms") args.maxWaitMs = Number(argv[++i]);
    else if (arg === "--refresh-ms") args.refreshMs = Number(argv[++i]);
    else if (arg === "--max-attempts-per-prompt") args.maxAttemptsPerPrompt = Number(argv[++i]);
    else if (arg === "--idle-passes") args.idlePasses = Number(argv[++i]);
  }
  return args;
}
function paths(autoOps) {
  return {
    control: path.join(autoOps, "00_control_center"),
    outbox: path.join(autoOps, "15_bridge_outbox"),
    downloads: path.join(autoOps, "13_chatgpt_downloads"),
    applyApproved: path.join(autoOps, "01_apply_approved"),
    hotfixApproved: path.join(autoOps, "02_hotfix_approved"),
    evidence: path.join(autoOps, "00_control_center", "evidence"),
    needsAttention: path.join(autoOps, "17_needs_attention"),
    handoff: path.join(autoOps, "06_handoff"),
    processing: path.join(autoOps, "08_processing")
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
function closedHandoffForPhase(p, phase) {
  const n = Number(phase || 0);
  if (!n || !fs.existsSync(p.handoff)) return null;
  const needles = [`phase${n}_`, `phase${n}-`, `phase_${n}_`, `phase-${n}-`];
  return fs.readdirSync(p.handoff)
    .map((name) => ({ name: name.toLowerCase(), file: path.join(p.handoff, name) }))
    .filter((item) => item.name.includes("closed_cleanly") && needles.some((needle) => item.name.includes(needle)) && isFile(item.file))
    .sort((a, b) => fileMtimeMs(b.file) - fileMtimeMs(a.file))[0]?.file || null;
}
function archiveClosedPhaseZipIfQueued(p, expectedZipName) {
  const phase = phaseNumberFromName(expectedZipName);
  const handoff = closedHandoffForPhase(p, phase);
  if (!handoff) return null;
  const dirs = [p.applyApproved, p.hotfixApproved, p.processing, p.downloads];
  const archiveDir = path.join(p.control, "archive", `closed-phase-artifact-${timestamp()}`);
  const archived = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of files(dir)) {
      if (phaseNumberFromName(path.basename(file)) === phase) {
        ensureDir(archiveDir);
        const dest = path.join(archiveDir, file.replace(/[:\\/]/g, "_"));
        try { fs.renameSync(file, dest); archived.push({ from: file, to: dest }); } catch {}
      }
    }
  }
  return { handoff, archived };
}
function archiveArtifactRequest(requestPath, request, status, extra = {}) {
  const archiveDir = path.join(path.dirname(requestPath), "archive");
  ensureDir(archiveDir);
  const archived = path.join(archiveDir, `artifact-watch-request-phase${request?.phase || "unknown"}-${timestamp()}.json`);
  writeJson(archived, { ...(request || {}), ...extra, active: false, status, archivedAt: new Date().toISOString() });
  try { fs.unlinkSync(requestPath); } catch {}
  return archived;
}

function newestPrompt(outbox) {
  if (!fs.existsSync(outbox)) return null;
  const prompts = fs.readdirSync(outbox)
    .filter((name) => /\.(md|txt)$/i.test(name))
    .map((name) => path.join(outbox, name))
    .filter(isFile)
    .sort((a, b) => fileMtimeMs(b) - fileMtimeMs(a));
  return prompts[0] || null;
}
function activeArtifactRequest(p) {
  const closed = latestClosedPhase(p);
  const candidates = [
    path.join(p.control, "artifact-watch-request.json"),
    path.join(p.control, "active-artifact.json")
  ];
  for (const requestPath of candidates) {
    const request = readJson(requestPath, null);
    if (!request) continue;
    if (request.active === false) continue;
    const status = String(request.status || "").toLowerCase();
    if (["closed_cleanly", "completed", "routed", "cancelled", "archived_stale_closed_phase"].includes(status)) continue;
    const requestPhase = Number(request.phase || 0);
    if (closed?.phase && requestPhase > 0 && requestPhase <= closed.phase) {
      archiveArtifactRequest(requestPath, request, "archived_stale_closed_phase", { closedPhase: closed.phase, closedHandoff: closed.file });
      continue;
    }
    const promptFile = request.promptFile || request.promptPath;
    const expectedZipName = request.expectedZipName || request.zipName;
    if (!promptFile || !expectedZipName) continue;
    return { ...request, requestPath, promptFile, expectedZipName };
  }
  return null;
}
function updateArtifactRequest(request, status, extra = {}) {
  if (!request?.requestPath) return;
  const next = { ...request, ...extra, active: false, status, updatedAt: new Date().toISOString() };
  delete next.requestPath;
  writeJson(request.requestPath, next);
}
function completedHandoffFor(p, expectedZipName) {
  if (!fs.existsSync(p.handoff)) return null;
  const stem = path.basename(expectedZipName).replace(/\.zip$/i, "").toLowerCase();
  const phaseMatch = stem.match(/phase\d+/i)?.[0]?.toLowerCase();
  return fs.readdirSync(p.handoff)
    .filter((name) => name.toLowerCase().includes("closed_cleanly"))
    .filter((name) => {
      const lower = name.toLowerCase();
      return lower.includes(stem) || (phaseMatch && lower.includes(phaseMatch));
    })
    .map((name) => path.join(p.handoff, name))
    .filter(isFile)
    .sort((a, b) => fileMtimeMs(b) - fileMtimeMs(a))[0] || null;
}
function expectedZipNameFromPrompt(prompt) {
  const patterns = [
    /Expected ZIP filename:\s*\n\s*`?([^`\s"']+\.zip)`?/i,
    /Return\s+a\s+downloadable\s+ZIP\s+named\s+exactly:\s*`?([^`\s"']+\.zip)`?/i,
    /downloadable\s+ZIP\s+named\s+exactly\s*:?\s*`?([^`\s"']+\.zip)`?/i,
    /named\s+exactly\s*:?\s*`?([^`\s"']+\.zip)`?/i,
    /([A-Za-z0-9._-]+_phase\d+[A-Za-z0-9._-]*\.zip)/i
  ];
  for (const rx of patterns) {
    const match = prompt.match(rx);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}
function stopPauseDecision(p) {
  const stopFiles = ["stop.flag", "STOP_AUTOPILOT.flag", path.join("stop", "STOP_AUTOPILOT.txt")].map((name) => path.join(p.control, name));
  const pauseFiles = ["pause.flag", "PAUSE_AUTOPILOT.flag", path.join("pause", "PAUSE_AUTOPILOT.txt")].map((name) => path.join(p.control, name));
  const stop = stopFiles.find((file) => fs.existsSync(file));
  const pause = pauseFiles.find((file) => fs.existsSync(file));
  if (stop) return { ok: false, status: "stopped", reason: `stop file present: ${stop}` };
  if (pause) return { ok: false, status: "paused", reason: `pause file present: ${pause}` };
  return { ok: true };
}
function loadTarget(p) {
  const targetPath = path.join(p.control, "chatgpt-target.json");
  const legacyPath = path.join(autoOpsDir(), "12_browser_helper_state", "chatgpt-bridge-target.json");
  const source = fs.existsSync(targetPath) ? targetPath : legacyPath;
  if (!fs.existsSync(source)) throw new Error(`Missing saved ChatGPT target config. Checked ${targetPath} and ${legacyPath}`);
  const target = readJson(source, null);
  if (!target?.targetUrl || target.targetUrl === "OWNER_SET_CHATGPT_THREAD_URL") throw new Error("Saved ChatGPT target URL is missing.");
  if (target.allowNewChatFallback !== false || target.allowRandomRecentChatFallback !== false) throw new Error("Saved ChatGPT target fallback flags must remain false.");
  if (source === legacyPath && !fs.existsSync(targetPath)) writeJson(targetPath, target);
  return { target, targetPath: fs.existsSync(targetPath) ? targetPath : source };
}
async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}
function sameSavedConversation(tabUrl, targetUrl) {
  try {
    const tab = new URL(tabUrl);
    const target = new URL(targetUrl);
    if (tab.hostname !== target.hostname) return false;
    const tabPath = tab.pathname.replace(/\/$/, "");
    const targetPath = target.pathname.replace(/\/$/, "");
    return tabPath === targetPath || tab.href.split("?")[0] === target.href.split("?")[0];
  } catch { return false; }
}
async function connect(wsUrl) {
  if (typeof WebSocket === "undefined") throw new Error("Global WebSocket is unavailable. Use Node 22+ or 24+.");
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("WebSocket connection failed.")), { once: true });
  });
  return {
    send(method, params = {}) {
      const callId = ++id;
      ws.send(JSON.stringify({ id: callId, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(callId, { resolve, reject });
        setTimeout(() => {
          if (pending.has(callId)) {
            pending.delete(callId);
            reject(new Error(`CDP call timed out: ${method}`));
          }
        }, 30000);
      });
    },
    close() { ws.close(); }
  };
}
async function refreshSavedThreadIfPossible(p, evidence) {
  const { target } = loadTarget(p);
  const cdpEndpoint = target.cdpEndpoint || "http://127.0.0.1:9222";
  const tabs = await fetchJson(`${cdpEndpoint.replace(/\/$/, "")}/json`);
  const tab = tabs.find((item) => item.type === "page" && item.url && sameSavedConversation(item.url, target.targetUrl));
  if (!tab?.webSocketDebuggerUrl) throw new Error("Saved ChatGPT tab was not found for refresh.");
  const client = await connect(tab.webSocketDebuggerUrl);
  try {
    await client.send("Page.enable");
    await client.send("Page.reload", { ignoreCache: false });
    await sleep(4000);
    evidence.refreshedTarget = { ok: true, cdpEndpoint, title: tab.title || null };
  } finally {
    client.close();
  }
}
function readLedger(p) {
  return readJson(path.join(p.evidence, "artifact-watcher-ledger.json"), { version: VERSION, records: {} });
}
function writeLedger(p, ledger) {
  ledger.version = VERSION;
  ledger.updatedAt = new Date().toISOString();
  writeJson(path.join(p.evidence, "artifact-watcher-ledger.json"), ledger);
}
function recordKey(promptFile, promptText, expectedZipName) {
  return sha256(`${path.resolve(promptFile)}\n${sha256(promptText)}\n${expectedZipName}`);
}
function findExistingZipInQueues(p, expectedZipName) {
  const dirs = [p.applyApproved, p.hotfixApproved, p.downloads, p.processing, path.join(os.homedir(), "Downloads"), path.join(p.control, "chrome-cdp-profile", "Downloads"), path.join(p.control, "chrome-cdp-profile", "Default", "Downloads")];
  const matches = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory() && dir === p.processing) {
          const nested = path.join(file, expectedZipName);
          if (fs.existsSync(nested)) matches.push(nested);
        } else if (entry.isFile() && entry.name.toLowerCase() === expectedZipName.toLowerCase()) {
          matches.push(file);
        }
      }
    } catch {}
  }
  return matches.sort((a, b) => fileMtimeMs(b) - fileMtimeMs(a))[0] || null;
}
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false, ...options, env: { ...process.env, ...(options.env || {}) } });
  return { command, args, status: result.status, signal: result.signal, stdout: result.stdout || "", stderr: result.stderr || "" };
}
function runGitBranch() {
  const result = run("git", ["branch", "--show-current"], { cwd: repoDir() });
  return result.status === 0 ? result.stdout.trim() : "";
}
function normalPhaseOverlayLike(expectedZipName) {
  const name = String(expectedZipName || "").toLowerCase();
  return /s\.e\.r\.a_phase\d+_/.test(name) && name.endsWith("_overlay.zip") && !name.includes("hotfix_attempt") && !name.includes("_hotfix_");
}
function hotfixLike(expectedZipName) {
  const name = String(expectedZipName || "").toLowerCase();
  return name.includes("hotfix") || name.includes("repair") || name.includes("patch_attempt");
}
function routeDestination(p, expectedZipName, routeMode) {
  const mode = String(routeMode || "auto").toLowerCase();
  if (mode === "normal") return { ok: true, mode: "normal", dir: p.applyApproved, reason: "explicit normal route" };
  if (mode === "hotfix") {
    const branch = runGitBranch();
    if (!branch || branch === "main" || !branch.startsWith("work/phase")) return { ok: false, reason: `hotfix route requested but current branch is ${branch || "unknown"}` };
    return { ok: true, mode: "hotfix", dir: p.hotfixApproved, reason: `explicit hotfix route on ${branch}` };
  }
  if (normalPhaseOverlayLike(expectedZipName)) {
    return { ok: true, mode: "normal", dir: p.applyApproved, reason: "normal phase overlay artifact" };
  }
  if (hotfixLike(expectedZipName)) {
    const branch = runGitBranch();
    if (!branch || branch === "main" || !branch.startsWith("work/phase")) return { ok: false, reason: `hotfix-shaped artifact cannot be routed while current branch is ${branch || "unknown"}` };
    return { ok: true, mode: "hotfix", dir: p.hotfixApproved, reason: `hotfix-shaped artifact routed on ${branch}` };
  }
  return { ok: true, mode: "normal", dir: p.applyApproved, reason: "default normal overlay artifact" };
}
function routeZip(p, zipPath, expectedZipName, routeMode) {
  const route = routeDestination(p, expectedZipName, routeMode);
  if (!route.ok) return route;
  ensureDir(route.dir);
  const dest = path.join(route.dir, expectedZipName);
  fs.copyFileSync(zipPath, dest);
  const hash = fileHash(dest);
  for (const duplicate of [path.join(p.downloads, expectedZipName)]) {
    if (fs.existsSync(duplicate) && path.resolve(duplicate) !== path.resolve(dest)) {
      try { fs.unlinkSync(duplicate); } catch {}
    }
  }
  return { ok: true, mode: route.mode, dir: route.dir, file: dest, sha256: hash, reason: route.reason };
}
function writeNeedsAttention(p, title, lines) {
  const file = path.join(p.needsAttention, `${title}-${timestamp()}.md`);
  writeText(file, lines.join("\n"));
  return file;
}
function startRunner() {
  return run(psExe(), ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "Start-ScheduledTask -TaskName 'SERA AutoOps Runner'"], { cwd: repoDir() });
}
function bridgeCommand(promptFile, expectedZipName) {
  return run(psExe(), ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join("scripts", "sera-chatgpt-submit-download.ps1"), "-Execute", "-PromptFile", promptFile, "-ExpectedZipName", expectedZipName], { cwd: repoDir(), env: { SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE: "true" } });
}
async function runPass(args, p, passIndex = 0) {
  const passStarted = Date.now();
  ensureDir(p.evidence); ensureDir(p.needsAttention); ensureDir(p.downloads); ensureDir(p.applyApproved); ensureDir(p.hotfixApproved); ensureDir(p.outbox);
  const evidence = { version: VERSION, startedAt: new Date().toISOString(), passIndex, args };
  const evidencePath = path.join(p.evidence, `artifact-watcher-${timestamp()}.json`);
  try {
    const gate = stopPauseDecision(p);
    if (!gate.ok) {
      evidence.status = gate.status;
      evidence.reason = gate.reason;
      writeJson(evidencePath, evidence);
      return { ok: gate.status === "paused", status: gate.status, reason: gate.reason, evidencePath };
    }
    const { targetPath } = loadTarget(p);
    evidence.targetPath = targetPath;
    const activeRequest = (!args.promptFile && !args.expectedZipName) ? activeArtifactRequest(p) : null;
    const promptFile = args.promptFile ? path.resolve(args.promptFile) : (activeRequest?.promptFile ? path.resolve(activeRequest.promptFile) : null);
    if (!promptFile) {
      evidence.status = "idle_no_active_artifact_request";
      evidence.reason = "No explicit prompt was supplied and 00_control_center/artifact-watch-request.json has no active request.";
      writeJson(evidencePath, evidence);
      return { ok: true, status: "idle_no_active_artifact_request", evidencePath };
    }
    if (!path.resolve(promptFile).startsWith(path.resolve(p.outbox) + path.sep)) throw new Error(`Prompt file must be inside 15_bridge_outbox: ${promptFile}`);
    const promptText = readText(promptFile).trim();
    const expectedZipName = args.expectedZipName || activeRequest?.expectedZipName || expectedZipNameFromPrompt(promptText);
    if (!expectedZipName) throw new Error(`Could not determine expected ZIP name from ${promptFile}`);
    evidence.promptFile = promptFile;
    evidence.promptSha256 = sha256(promptText);
    evidence.expectedZipName = expectedZipName;
    evidence.activeRequestPath = activeRequest?.requestPath || null;
    evidence.routeMode = args.routeMode;
    const key = recordKey(promptFile, promptText, expectedZipName);
    const ledger = readLedger(p);
    const record = ledger.records[key] || { promptFile, expectedZipName, attempts: 0, firstSeenAt: new Date().toISOString() };
    evidence.ledgerKey = key;
    const zipPhase = phaseNumberFromName(expectedZipName);
    const closedPhase = latestClosedPhase(p);
    const archiveGuard = archiveClosedPhaseZipIfQueued(p, expectedZipName);
    const alreadyClosed = archiveGuard?.handoff || completedHandoffFor(p, expectedZipName) || (closedPhase?.phase && zipPhase > 0 && zipPhase <= closedPhase.phase ? closedPhase.file : null);
    if (alreadyClosed) {
      evidence.archivedClosedPhaseArtifacts = archiveGuard?.archived || [];
      record.status = "closed_cleanly";
      record.handoff = alreadyClosed;
      record.updatedAt = new Date().toISOString();
      ledger.records[key] = record;
      writeLedger(p, ledger);
      updateArtifactRequest(activeRequest, "closed_cleanly", { handoff: alreadyClosed });
      evidence.status = "already_closed_cleanly";
      evidence.handoff = alreadyClosed;
      writeJson(evidencePath, evidence);
      return { ok: true, status: "already_closed_cleanly", handoff: alreadyClosed, evidencePath };
    }
    const existing = findExistingZipInQueues(p, expectedZipName);
    if (existing) {
      evidence.existingZip = existing;
      const routed = routeZip(p, existing, expectedZipName, args.routeMode);
      if (!routed.ok) throw new Error(routed.reason);
      record.status = "routed_existing";
      record.routed = routed;
      record.updatedAt = new Date().toISOString();
      ledger.records[key] = record;
      writeLedger(p, ledger);
      updateArtifactRequest(activeRequest, "routed_existing", { routed });
      evidence.status = "routed_existing";
      evidence.routed = routed;
      if (args.startRunner) evidence.runner = startRunner();
      writeJson(evidencePath, evidence);
      return { ok: true, status: "routed_existing", routed, evidencePath };
    }
    if (record.status && ["routed", "routed_existing"].includes(record.status) && record.routed?.file && fs.existsSync(record.routed.file)) {
      evidence.status = "already_routed";
      evidence.routed = record.routed;
      writeJson(evidencePath, evidence);
      return { ok: true, status: "already_routed", routed: record.routed, evidencePath };
    }
    if (record.attempts >= Number(args.maxAttemptsPerPrompt)) throw new Error(`Max watcher attempts reached for ${expectedZipName}`);
    if (args.dryRun) {
      evidence.status = "dry_run_ready";
      evidence.record = record;
      writeJson(evidencePath, evidence);
      return { ok: true, status: "dry_run_ready", evidencePath };
    }
    if (Number(args.refreshMs) > 0) {
      try { await refreshSavedThreadIfPossible(p, evidence); }
      catch (error) { evidence.refreshWarning = error instanceof Error ? error.message : String(error); }
    }
    record.attempts += 1;
    record.lastAttemptAt = new Date().toISOString();
    ledger.records[key] = record;
    writeLedger(p, ledger);
    evidence.bridgeStartedAt = new Date().toISOString();
    const bridge = bridgeCommand(promptFile, expectedZipName);
    evidence.bridge = bridge;
    if (bridge.status !== 0) throw new Error(`Bridge downloader failed with status ${bridge.status}\nSTDOUT:\n${bridge.stdout}\nSTDERR:\n${bridge.stderr}`);
    const deadline = Date.now() + Number(args.maxWaitMs);
    let downloaded = null;
    while (Date.now() < deadline) {
      downloaded = findExistingZipInQueues(p, expectedZipName);
      if (downloaded) break;
      await sleep(2000);
    }
    if (!downloaded) throw new Error(`Expected ZIP did not appear after bridge completed: ${expectedZipName}`);
    evidence.downloaded = downloaded;
    const routed = routeZip(p, downloaded, expectedZipName, args.routeMode);
    if (!routed.ok) throw new Error(routed.reason);
    record.status = "routed";
    record.routed = routed;
    record.updatedAt = new Date().toISOString();
    ledger.records[key] = record;
    writeLedger(p, ledger);
    updateArtifactRequest(activeRequest, "routed", { routed });
    evidence.status = "routed";
    evidence.routed = routed;
    if (args.startRunner) evidence.runner = startRunner();
    writeJson(evidencePath, evidence);
    return { ok: true, status: "routed", routed, evidencePath };
  } catch (error) {
    evidence.status = "needs_attention";
    evidence.error = error instanceof Error ? error.message : String(error);
    const attentionPath = writeNeedsAttention(p, "CHATGPT_ARTIFACT_WATCHER_NEEDS_ATTENTION", [
      "# S.E.R.A. ChatGPT Artifact Watcher Needs Attention",
      "",
      `Version: ${VERSION}`,
      "",
      "## Reason",
      "",
      evidence.error,
      "",
      "## Evidence",
      "",
      evidencePath
    ]);
    evidence.attentionPath = attentionPath;
    writeJson(evidencePath, evidence);
    return { ok: false, status: "needs_attention", error: evidence.error, attentionPath, evidencePath };
  }
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const autoOps = autoOpsDir();
  const p = paths(autoOps);
  const results = [];
  if (args.mode === "once") {
    const result = await runPass(args, p, 0);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 2;
    return;
  }
  let idle = 0;
  for (let i = 0; ; i += 1) {
    const result = await runPass(args, p, i);
    results.push(result);
    if (!result.ok) {
      console.log(JSON.stringify({ ok: false, status: "watch_stopped", result, results }, null, 2));
      process.exitCode = 2;
      return;
    }
    if (result.status === "idle_no_active_artifact_request" || result.status === "idle_no_prompt") idle += 1;
    else idle = 0;
    if (idle >= Number(args.idlePasses || 1)) {
      console.log(JSON.stringify({ ok: true, status: "watch_idle", results }, null, 2));
      return;
    }
    await sleep(Number(args.pollMs));
  }
}
main();

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const PHASE = "phase115-chatgpt-dom-download-troubleshooter-v1";
const DEFAULT_SELECTORS = [
  'div#prompt-textarea.ProseMirror[contenteditable="true"][role="textbox"]',
  'div[contenteditable="true"][role="textbox"]#prompt-textarea',
  'div[contenteditable="true"][role="textbox"]',
  'textarea[name="prompt-textarea"]',
  '[data-testid*="composer"] [contenteditable="true"]',
  '[data-testid*="prompt"] [contenteditable="true"]'
];

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "_");
}

function autoOpsDir() {
  if (process.env.SERA_AUTOOPS_DIR) return process.env.SERA_AUTOOPS_DIR;
  return path.join(os.homedir(), "OneDrive", "SERA-AutoOps");
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function writeMarkdown(file, lines) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, lines.join("\n"), "utf8");
}

function redactedUrl(raw) {
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname}`;
  } catch {
    return "INVALID_URL";
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function parseArgs(argv) {
  const args = { mode: "dry-run", promptFile: null, maxWaitMs: 900000, expectedZipName: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--execute") args.mode = "execute";
    else if (arg === "--dry-run") args.mode = "dry-run";
    else if (arg === "--prompt-file") args.promptFile = argv[++i];
    else if (arg === "--max-wait-ms") args.maxWaitMs = Number(argv[++i]);
    else if (arg === "--expected-zip-name") args.expectedZipName = argv[++i];
  }
  return args;
}

function loadTarget(stateDir) {
  const targetPath = path.join(stateDir, "chatgpt-bridge-target.json");
  if (!fs.existsSync(targetPath)) throw new Error(`Missing target config: ${targetPath}`);
  const target = JSON.parse(fs.readFileSync(targetPath, "utf8"));
  if (!target.targetUrl) throw new Error("chatgpt-bridge-target.json is missing targetUrl.");
  const targetUrl = new URL(target.targetUrl);
  if (!["chatgpt.com", "chat.openai.com"].includes(targetUrl.hostname)) {
    throw new Error(`Target URL must be chatgpt.com or chat.openai.com. Found: ${targetUrl.hostname}`);
  }
  if (target.allowNewChatFallback !== false) throw new Error("allowNewChatFallback must be false for Phase 113.");
  if (target.allowRandomRecentChatFallback !== false) throw new Error("allowRandomRecentChatFallback must be false for Phase 113.");
  return { targetPath, target, targetUrl };
}

function findPromptFile(outboxDir, explicitPromptFile) {
  if (explicitPromptFile) {
    const resolved = path.resolve(explicitPromptFile);
    const outbox = path.resolve(outboxDir);
    if (!resolved.startsWith(outbox + path.sep)) {
      throw new Error(`Prompt file must be inside 15_bridge_outbox: ${resolved}`);
    }
    if (!fs.existsSync(resolved)) throw new Error(`Prompt file not found: ${resolved}`);
    return resolved;
  }

  if (!fs.existsSync(outboxDir)) throw new Error(`Bridge outbox does not exist: ${outboxDir}`);
  const candidates = fs.readdirSync(outboxDir)
    .filter((name) => name.toLowerCase().endsWith(".md") || name.toLowerCase().endsWith(".txt"))
    .map((name) => path.join(outboxDir, name))
    .map((file) => ({ file, mtime: fs.statSync(file).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (candidates.length === 0) throw new Error(`No prompt files found in ${outboxDir}`);
  return candidates[0].file;
}

function readSafePrompt(promptFile) {
  const prompt = fs.readFileSync(promptFile, "utf8").trim();
  if (prompt.length < 20) throw new Error("Prompt is too short to submit safely.");
  if (prompt.length > 25000) throw new Error("Prompt is too long for the Phase 113 bridge safety limit.");

  const risky = [
    /password/i,
    /secret/i,
    /token/i,
    /api[_ -]?key/i,
    /credential/i,
    /paid service/i,
    /billing/i,
    /github security/i,
    /repository settings/i,
    /install dependency/i,
    /npm install/i,
    /winget install/i
  ];
  const matched = risky.find((rx) => rx.test(prompt));
  if (matched) throw new Error(`Prompt blocked by Phase 113 risk filter: ${matched}`);
  return prompt;
}


function expectedZipNameFromPrompt(prompt) {
  const patterns = [
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

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

function sameSavedConversation(tabUrl, targetUrl) {
  try {
    const tab = new URL(tabUrl);
    if (tab.hostname !== targetUrl.hostname) return false;
    const tabPath = tab.pathname.replace(/\/$/, "");
    const targetPath = targetUrl.pathname.replace(/\/$/, "");
    return tabPath === targetPath || tab.href.split("?")[0] === targetUrl.href.split("?")[0];
  } catch {
    return false;
  }
}

async function connect(wsUrl) {
  if (typeof WebSocket === "undefined") {
    throw new Error("Global WebSocket is unavailable. Use Node 22+ or 24+ for the Phase 113 bridge.");
  }
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
    close() {
      ws.close();
    }
  };
}

async function evaluate(client, expression, awaitPromise = false) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(`Runtime evaluation failed: ${JSON.stringify(result.exceptionDetails)}`);
  }
  return result.result?.value;
}

async function findTargetTab(cdpEndpoint, targetUrl) {
  const tabs = await fetchJson(`${cdpEndpoint.replace(/\/$/, "")}/json`);
  const matches = tabs.filter((tab) => tab.type === "page" && tab.url && sameSavedConversation(tab.url, targetUrl));
  if (matches.length === 0) throw new Error(`Saved ChatGPT target tab not found: ${redactedUrl(targetUrl.href)}`);
  if (matches.length > 1) throw new Error(`Multiple matching ChatGPT target tabs found. Close duplicates before running Phase 113.`);
  if (!matches[0].webSocketDebuggerUrl) throw new Error("Matching tab does not expose webSocketDebuggerUrl.");
  return matches[0];
}

async function setDownloadDir(cdpEndpoint, downloadDir) {
  ensureDir(downloadDir);
  const version = await fetchJson(`${cdpEndpoint.replace(/\/$/, "")}/json/version`);
  const browserWs = version.webSocketDebuggerUrl;
  if (!browserWs) return { ok: false, reason: "Browser websocket endpoint unavailable." };
  const browser = await connect(browserWs);
  try {
    await browser.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloadDir });
    return { ok: true, downloadDir };
  } finally {
    browser.close();
  }
}

async function findComposer(client, selectors) {
  const js = `(() => {
    const selectors = ${JSON.stringify(selectors)};
    const visible = (el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 20 && rect.height > 10 && style.visibility !== "hidden" && style.display !== "none";
    };
    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector));
      for (const el of nodes) {
        if (!visible(el)) continue;
        const editable = el.isContentEditable || el.tagName === "TEXTAREA" || el.getAttribute("role") === "textbox";
        if (!editable) continue;
        return { found: true, selector, tagName: el.tagName, id: el.id || null, role: el.getAttribute("role"), textLength: (el.innerText || el.value || "").length };
      }
    }
    return { found: false, selector: null };
  })()`;
  return evaluate(client, js);
}

async function insertPrompt(client, selectors, prompt) {
  const js = `(() => {
    const selectors = ${JSON.stringify(selectors)};
    const prompt = ${JSON.stringify(prompt)};
    const visible = (el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 20 && rect.height > 10 && style.visibility !== "hidden" && style.display !== "none";
    };
    let target = null;
    let usedSelector = null;
    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector));
      for (const el of nodes) {
        if (!visible(el)) continue;
        const editable = el.isContentEditable || el.tagName === "TEXTAREA" || el.getAttribute("role") === "textbox";
        if (!editable) continue;
        target = el;
        usedSelector = selector;
        break;
      }
      if (target) break;
    }
    if (!target) return { ok: false, reason: "composer not found" };
    target.focus();
    if (target.tagName === "TEXTAREA") {
      target.value = prompt;
      target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: prompt }));
    } else {
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, prompt);
      target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: prompt }));
    }
    return { ok: true, selector: usedSelector, length: prompt.length };
  })()`;
  return evaluate(client, js);
}

async function clickSend(client) {
  const js = `(() => {
    const selectors = [
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label="Send message"]',
      'button[type="submit"]'
    ];
    const visible = (el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 5 && rect.height > 5 && style.visibility !== "hidden" && style.display !== "none";
    };
    for (const selector of selectors) {
      for (const button of Array.from(document.querySelectorAll(selector))) {
        if (!visible(button)) continue;
        if (button.disabled || button.getAttribute("aria-disabled") === "true") continue;
        button.click();
        return { ok: true, selector, text: (button.innerText || button.getAttribute("aria-label") || "").trim() };
      }
    }
    return { ok: false, reason: "send button not found or disabled" };
  })()`;
  return evaluate(client, js);
}

async function getDownloadCandidates(client, expectedName) {
  const js = `(() => {
    const expectedName = (${JSON.stringify(expectedName || "")}).toLowerCase();
    const visible = (el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 4 && rect.height > 4 && style.visibility !== "hidden" && style.display !== "none";
    };
    const textOf = (el) => [
      el.innerText,
      el.textContent,
      el.getAttribute("aria-label"),
      el.getAttribute("title"),
      el.getAttribute("download"),
      el.getAttribute("data-testid"),
      el.id,
      el.className
    ].filter(Boolean).join(" ").replace(/\\s+/g, " ").trim();
    const latestAssistant = Array.from(document.querySelectorAll('[data-message-author-role="assistant"], article, [data-testid*="conversation-turn"]'))
      .filter(visible)
      .slice(-1)[0] || null;
    const allCandidates = [];
    const addCandidate = (el, query, kind, source) => {
      const nodes = Array.from(document.querySelectorAll(query));
      const index = nodes.indexOf(el);
      if (index < 0) return;
      const href = el.href || el.getAttribute("href") || "";
      const text = textOf(el);
      const haystack = (href + " " + text).toLowerCase();
      const mentionsZip = haystack.includes(".zip");
      const mentionsExpected = expectedName && haystack.includes(expectedName);
      const looksDownload = haystack.includes("download") || haystack.includes("download file") || haystack.includes("download artifact");
      if (!mentionsZip && !mentionsExpected && !looksDownload) return;
      let score = 0;
      if (mentionsExpected) score += 100;
      if (mentionsZip) score += 40;
      if (looksDownload) score += 20;
      if (source === "latestAssistant") score += 20;
      if (visible(el)) score += 10;
      if (kind === "link" && href) score += 5;
      allCandidates.push({
        kind,
        query,
        index,
        source,
        score,
        href,
        hrefHost: (() => { try { return href ? new URL(href).hostname : null; } catch { return "invalid"; } })(),
        text: text.slice(0, 300),
        ariaLabel: el.getAttribute("aria-label") || null,
        title: el.getAttribute("title") || null,
        dataTestId: el.getAttribute("data-testid") || null,
        visible: visible(el)
      });
    };
    const scopes = latestAssistant ? [{ node: latestAssistant, source: "latestAssistant" }, { node: document, source: "document" }] : [{ node: document, source: "document" }];
    for (const { node, source } of scopes) {
      for (const el of Array.from(node.querySelectorAll('a[href], a[download]'))) addCandidate(el, 'a[href], a[download]', 'link', source);
      for (const el of Array.from(node.querySelectorAll('button, [role="button"]'))) addCandidate(el, 'button, [role="button"]', 'button', source);
    }
    const deduped = [];
    const seen = new Set();
    for (const item of allCandidates.sort((a, b) => b.score - a.score)) {
      const key = item.kind + ':' + item.query + ':' + item.index + ':' + item.href + ':' + item.text;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }
    const pageText = (document.body?.innerText || "").replace(/\\s+/g, " ");
    const zipTextMatches = Array.from(new Set(pageText.match(/[A-Za-z0-9._-]+\\.zip/g) || [])).slice(-20);
    const latestAssistantText = latestAssistant ? (latestAssistant.innerText || latestAssistant.textContent || "").replace(/\\s+/g, " ").trim().slice(-2000) : null;
    return {
      ok: deduped.length > 0,
      candidate: deduped[0] || null,
      candidates: deduped.slice(0, 20),
      snapshot: {
        expectedName,
        candidateCount: deduped.length,
        zipTextMatches,
        latestAssistantText,
        assistantNodeFound: Boolean(latestAssistant),
        pageTitle: document.title,
        url: location.href
      }
    };
  })()`;
  return evaluate(client, js);
}

async function waitForZipCandidate(client, expectedName, maxWaitMs) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < maxWaitMs) {
    last = await getDownloadCandidates(client, expectedName);
    if (last?.ok && last.candidate) return last;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  const snapshot = last?.snapshot ? JSON.stringify(last.snapshot).slice(0, 4000) : "no DOM snapshot available";
  throw new Error(`Timed out waiting for a downloadable ZIP candidate after ${maxWaitMs}ms. DOM troubleshooting snapshot: ${snapshot}`);
}

async function clickDownloadCandidate(client, candidate) {
  const js = `(() => {
    const candidate = ${JSON.stringify(candidate)};
    const nodes = Array.from(document.querySelectorAll(candidate.query));
    const el = nodes[candidate.index];
    if (!el) return { ok: false, reason: "download candidate disappeared", candidate };
    el.scrollIntoView({ block: "center", inline: "center" });
    el.click();
    return {
      ok: true,
      kind: candidate.kind,
      source: candidate.source,
      score: candidate.score,
      hrefHost: candidate.hrefHost || null,
      text: candidate.text || "",
      ariaLabel: candidate.ariaLabel || null,
      title: candidate.title || null,
      dataTestId: candidate.dataTestId || null
    };
  })()`;
  return evaluate(client, js);
}

function newestZip(dir, sinceMs, expectedName = null) {
  if (!fs.existsSync(dir)) return null;
  const expected = expectedName ? expectedName.toLowerCase() : null;
  const candidates = fs.readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith(".zip"))
    .filter((name) => !expected || name.toLowerCase().includes(expected.replace(/\.zip$/, "")))
    .map((name) => path.join(dir, name))
    .map((file) => ({ file, mtime: fs.statSync(file).mtimeMs, size: fs.statSync(file).size }))
    .filter((item) => item.mtime >= sinceMs && item.size > 0)
    .sort((a, b) => b.mtime - a.mtime);
  return candidates[0] || null;
}

async function waitForDownloadedZip(downloadDir, sinceMs, maxWaitMs, expectedName = null) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const zip = newestZip(downloadDir, sinceMs, expectedName);
    if (zip) return zip;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Timed out waiting for downloaded ZIP in ${downloadDir}${expectedName ? ` matching ${expectedName}` : ""}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const autoOps = autoOpsDir();
  const stateDir = path.join(autoOps, "12_browser_helper_state");
  const blockedDir = path.join(autoOps, "12_browser_helper_blocked");
  const attentionDir = path.join(autoOps, "17_needs_attention");
  const outboxDir = path.join(autoOps, "15_bridge_outbox");
  const downloadsDir = path.join(autoOps, "13_chatgpt_downloads");
  const pauseFile = path.join(autoOps, "00_control_center", "pause", "PAUSE_AUTOPILOT.txt");
  ensureDir(stateDir); ensureDir(blockedDir); ensureDir(attentionDir); ensureDir(outboxDir); ensureDir(downloadsDir);

  const runId = `${PHASE}-${timestamp()}`;
  const evidencePath = path.join(stateDir, `${runId}.json`);
  const baseEvidence = { phase: PHASE, mode: args.mode, runId, createdAt: new Date().toISOString(), autoOps };

  try {
    if (fs.existsSync(pauseFile)) throw new Error(`Autopilot pause file exists: ${pauseFile}`);
    const { target, targetUrl } = loadTarget(stateDir);
    const cdpEndpoint = target.cdpEndpoint || "http://127.0.0.1:9222";
    const promptFile = findPromptFile(outboxDir, args.promptFile);
    const prompt = readSafePrompt(promptFile);
    const expectedZipName = args.expectedZipName || expectedZipNameFromPrompt(prompt) || null;
    const selectors = Array.isArray(target.composerSelectors) && target.composerSelectors.length > 0 ? target.composerSelectors : DEFAULT_SELECTORS;

    const tab = await findTargetTab(cdpEndpoint, targetUrl);
    const client = await connect(tab.webSocketDebuggerUrl);
    try {
      await client.send("Runtime.enable");
      const composer = await findComposer(client, selectors);
      if (!composer?.found) throw new Error("Composer was not found in the saved ChatGPT target tab.");

      const evidence = {
        ...baseEvidence,
        status: args.mode === "execute" ? "READY_TO_EXECUTE" : "DRY_RUN_PASS",
        targetName: target.targetName || null,
        targetUrl: redactedUrl(target.targetUrl),
        promptFile,
        promptSha256: sha256(prompt),
        promptLength: prompt.length,
        expectedZipName,
        cdpEndpoint,
        tab: { id: tab.id, title: tab.title, url: redactedUrl(tab.url) },
        composer,
        downloadsDir,
        safety: {
          allowExecuteEnv: process.env.SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE === "true",
          allowNewChatFallback: target.allowNewChatFallback,
          allowRandomRecentChatFallback: target.allowRandomRecentChatFallback
        }
      };

      if (args.mode !== "execute") {
        writeJson(evidencePath, evidence);
        console.log(JSON.stringify({ ok: true, status: "dry_run_pass", evidencePath }, null, 2));
        return;
      }

      if (process.env.SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE !== "true") {
        throw new Error("Execute mode requires SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE=true.");
      }

      const downloadBehavior = await setDownloadDir(cdpEndpoint, downloadsDir);
      const submitStartMs = Date.now();
      const inserted = await insertPrompt(client, selectors, prompt);
      if (!inserted?.ok) throw new Error(`Prompt insertion failed: ${inserted?.reason || "unknown"}`);
      const sent = await clickSend(client);
      if (!sent?.ok) throw new Error(`Send click failed: ${sent?.reason || "unknown"}`);

      const candidateResult = await waitForZipCandidate(client, expectedZipName || ".zip", args.maxWaitMs);
      const clicked = await clickDownloadCandidate(client, candidateResult.candidate);
      if (!clicked?.ok) throw new Error(`Download click failed: ${clicked?.reason || "unknown"}`);
      const downloaded = await waitForDownloadedZip(downloadsDir, submitStartMs, Math.min(args.maxWaitMs, 300000), expectedZipName);

      evidence.status = "EXECUTE_PASS";
      evidence.downloadBehavior = downloadBehavior;
      evidence.inserted = inserted;
      evidence.sent = sent;
      evidence.downloadCandidate = candidateResult.candidate;
      evidence.downloadCandidates = candidateResult.candidates;
      evidence.domTroubleshooting = candidateResult.snapshot;
      evidence.clicked = clicked;
      evidence.downloaded = downloaded;
      writeJson(evidencePath, evidence);
      console.log(JSON.stringify({ ok: true, status: "execute_pass", downloaded: downloaded.file, evidencePath }, null, 2));
    } finally {
      client.close();
    }
  } catch (error) {
    const blocked = {
      ...baseEvidence,
      status: "BLOCKED",
      error: error instanceof Error ? error.message : String(error),
      safety: "No random chat selected. No new chat fallback used. If execute failed before send, no prompt was submitted."
    };
    writeJson(evidencePath, blocked);
    const blockedPath = path.join(blockedDir, `${runId}-BLOCKED.md`);
    const attentionPath = path.join(attentionDir, `${runId}-NEEDS_ATTENTION.md`);
    const lines = [
      "# S.E.R.A. ChatGPT Bridge Submit/Download Blocked",
      "",
      `Phase: ${PHASE}`,
      `Run: ${runId}`,
      "",
      "## Reason",
      "",
      blocked.error,
      "",
      "## Required owner action",
      "",
      "1. Confirm the exact saved ChatGPT thread is open in Chrome with remote debugging on port 9222.",
      "2. Confirm a prompt exists in `15_bridge_outbox`.",
      "3. Confirm `SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE=true` only when you intentionally want submit/download.",
      "4. Rerun dry-run first, then execute.",
      "",
      "## Evidence",
      "",
      evidencePath
    ];
    writeMarkdown(blockedPath, lines);
    writeMarkdown(attentionPath, lines);
    console.log(JSON.stringify({ ok: false, status: "blocked", message: blocked.error, evidencePath, blockedPath, attentionPath }, null, 2));
    process.exitCode = 2;
  }
}

main();

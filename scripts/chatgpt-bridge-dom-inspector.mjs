#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const PHASE = "phase112-chatgpt-bridge-dom-inspector-v1";
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

function loadTarget(stateDir) {
  const targetPath = path.join(stateDir, "chatgpt-bridge-target.json");
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Missing target config: ${targetPath}`);
  }
  const target = JSON.parse(fs.readFileSync(targetPath, "utf8"));
  if (!target.targetUrl) throw new Error("chatgpt-bridge-target.json is missing targetUrl.");
  const targetUrl = new URL(target.targetUrl);
  if (!["chatgpt.com", "chat.openai.com"].includes(targetUrl.hostname)) {
    throw new Error(`Target URL must be chatgpt.com or chat.openai.com. Found: ${targetUrl.hostname}`);
  }
  if (target.allowNewChatFallback !== false) throw new Error("allowNewChatFallback must be false for Phase 112.");
  if (target.allowRandomRecentChatFallback !== false) throw new Error("allowRandomRecentChatFallback must be false for Phase 112.");
  return { targetPath, target, targetUrl };
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

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    if (typeof WebSocket === "undefined") {
      throw new Error("Node WebSocket client is unavailable. Use Node 22+ or newer.");
    }
    this.ws = new WebSocket(this.wsUrl);
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(`${message.error.message || "CDP error"}: ${JSON.stringify(message.error)}`));
        else resolve(message.result);
      }
    });
    this.ws.addEventListener("error", (event) => {
      for (const { reject } of this.pending.values()) reject(new Error(`WebSocket error: ${event.message || "unknown"}`));
      this.pending.clear();
    });
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out connecting to Chrome DevTools WebSocket.")), 8000);
      this.ws.addEventListener("open", () => { clearTimeout(timeout); resolve(); }, { once: true });
      this.ws.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("Chrome DevTools WebSocket connection failed.")); }, { once: true });
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(payload);
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP command timed out: ${method}`));
        }
      }, 10000);
    });
  }

  close() {
    try { this.ws?.close(); } catch {}
  }
}

function domInspectionExpression(selectors, allowFocus) {
  return `(() => {
    const selectors = ${JSON.stringify(selectors)};
    const allowFocus = ${allowFocus ? "true" : "false"};
    const results = [];
    let selected = null;
    for (const selector of selectors) {
      const matches = Array.from(document.querySelectorAll(selector));
      const details = matches.map((el, index) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const editable = el.isContentEditable || el.getAttribute("contenteditable") === "true";
        const visible = rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        const disabled = el.disabled === true || el.getAttribute("aria-disabled") === "true" || el.getAttribute("disabled") !== null;
        const readOnly = el.readOnly === true || el.getAttribute("readonly") !== null;
        const candidate = {
          index,
          tagName: el.tagName,
          id: el.id || null,
          className: typeof el.className === "string" ? el.className : null,
          role: el.getAttribute("role"),
          ariaLabel: el.getAttribute("aria-label"),
          contentEditable: el.getAttribute("contenteditable"),
          isContentEditable: editable,
          visible,
          disabled,
          readOnly,
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
          textLength: (el.textContent || el.value || "").length,
          safeComposerCandidate: visible && !disabled && !readOnly && (editable || el.tagName === "TEXTAREA")
        };
        if (!selected && candidate.safeComposerCandidate) selected = { selector, index, tagName: candidate.tagName };
        return candidate;
      });
      results.push({ selector, matchCount: matches.length, matches: details });
    }
    let focused = false;
    if (allowFocus && selected) {
      const el = document.querySelectorAll(selected.selector)[selected.index];
      if (el && typeof el.focus === "function") {
        el.focus({ preventScroll: true });
        focused = document.activeElement === el;
      }
    }
    return {
      url: location.href,
      title: document.title,
      readyState: document.readyState,
      selectorsChecked: selectors.length,
      selected,
      focused,
      inspectionOnly: true,
      submittedPrompt: false,
      downloadedFile: false,
      results
    };
  })()`;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const allowFocus = args.has("--focus") || process.env.SERA_BRIDGE_FOCUS === "1";
  const autoOps = autoOpsDir();
  const stateDir = path.join(autoOps, "12_browser_helper_state");
  const blockedDir = path.join(autoOps, "12_browser_helper_blocked");
  const needsAttentionDir = path.join(autoOps, "17_needs_attention");
  ensureDir(stateDir);
  ensureDir(blockedDir);
  ensureDir(needsAttentionDir);

  const runId = `${PHASE}-${timestamp()}`;
  const cdpEndpoint = process.env.SERA_CHROME_CDP || "http://127.0.0.1:9222";
  const baseEvidence = { phase: PHASE, runId, createdAt: new Date().toISOString(), cdpEndpoint, focusRequested: allowFocus };

  try {
    const { targetPath, target, targetUrl } = loadTarget(stateDir);
    const selectors = Array.isArray(target.composerSelectors) && target.composerSelectors.length ? target.composerSelectors : DEFAULT_SELECTORS;
    const tabs = await fetchJson(`${cdpEndpoint.replace(/\/$/, "")}/json`);
    const candidates = tabs.filter((tab) => tab.type === "page" && typeof tab.url === "string");
    const tab = candidates.find((candidate) => sameSavedConversation(candidate.url, targetUrl));
    if (!tab) {
      throw new Error(`Saved ChatGPT target tab was not found in Chrome DevTools pages. Target: ${redactedUrl(target.targetUrl)}. Open the exact saved target in the dedicated CDP Chrome window and rerun.`);
    }
    if (!tab.webSocketDebuggerUrl) throw new Error("Matched Chrome tab has no webSocketDebuggerUrl.");

    const client = new CdpClient(tab.webSocketDebuggerUrl);
    await client.connect();
    try {
      await client.send("Runtime.enable");
      const result = await client.send("Runtime.evaluate", {
        expression: domInspectionExpression(selectors, allowFocus),
        returnByValue: true,
        awaitPromise: false
      });
      const value = result?.result?.value;
      if (!value) throw new Error("DOM inspection returned no serializable result.");
      const found = Boolean(value.selected);
      const evidence = {
        ...baseEvidence,
        status: found ? "PASS" : "BLOCKED",
        targetName: target.targetName || "SERA Autopilot Control Thread",
        targetUrlHash: sha256(target.targetUrl),
        targetUrlRedacted: redactedUrl(target.targetUrl),
        targetPath,
        matchedTab: { id: tab.id, title: tab.title, urlHash: sha256(tab.url), urlRedacted: redactedUrl(tab.url) },
        dom: value,
        safety: {
          noPromptSubmission: true,
          noDownloadAttempt: true,
          noRandomRecentChatFallback: target.allowRandomRecentChatFallback === false,
          noNewChatFallback: target.allowNewChatFallback === false
        }
      };
      const evidencePath = path.join(stateDir, `${runId}-${found ? "PASS" : "BLOCKED"}.json`);
      writeJson(evidencePath, evidence);
      if (!found) {
        const blockedPath = path.join(blockedDir, `${runId}-COMPOSER_NOT_FOUND.md`);
        writeMarkdown(blockedPath, [
          "# S.E.R.A. ChatGPT Bridge DOM Inspector Blocked",
          "",
          `Phase: ${PHASE}`,
          `Run ID: ${runId}`,
          "",
          "## Reason",
          "",
          "The saved ChatGPT tab was found, but no visible editable composer/textbox candidate matched the configured selectors.",
          "",
          "## Evidence",
          "",
          evidencePath,
          "",
          "## Safety",
          "",
          "No prompt was submitted. No file was downloaded. No fallback chat was selected."
        ]);
        console.log(JSON.stringify({ ok: false, status: "blocked", message: "Composer not found.", evidencePath, blockedPath }, null, 2));
        process.exitCode = 2;
      } else {
        console.log(JSON.stringify({ ok: true, status: "pass", message: "Saved ChatGPT composer candidate found. No prompt submitted.", evidencePath, selected: value.selected }, null, 2));
      }
    } finally {
      client.close();
    }
  } catch (error) {
    const blocked = {
      ...baseEvidence,
      status: "BLOCKED",
      error: error instanceof Error ? error.message : String(error),
      safety: {
        noPromptSubmission: true,
        noDownloadAttempt: true,
        noRandomRecentChatFallback: true,
        noNewChatFallback: true
      }
    };
    const evidencePath = path.join(blockedDir, `${runId}-BLOCKED.json`);
    const attentionPath = path.join(needsAttentionDir, `${runId}-NEEDS_ATTENTION.md`);
    writeJson(evidencePath, blocked);
    writeMarkdown(attentionPath, [
      "# S.E.R.A. ChatGPT Bridge DOM Inspector Needs Attention",
      "",
      `Phase: ${PHASE}`,
      `Run ID: ${runId}`,
      "",
      "## Reason",
      "",
      blocked.error,
      "",
      "## Required owner action",
      "",
      "1. Confirm `chatgpt-bridge-target.json` exists in `12_browser_helper_state`.",
      "2. Open the exact saved ChatGPT conversation URL in a dedicated Chrome window launched with `--remote-debugging-port=9222`.",
      "3. Rerun `node scripts/chatgpt-bridge-dom-inspector.mjs`.",
      "",
      "## Safety",
      "",
      "No prompt was submitted. No file was downloaded. No fallback chat was selected.",
      "",
      "## Evidence",
      "",
      evidencePath
    ]);
    console.log(JSON.stringify({ ok: false, status: "blocked", message: blocked.error, evidencePath, attentionPath }, null, 2));
    process.exitCode = 2;
  }
}

main();

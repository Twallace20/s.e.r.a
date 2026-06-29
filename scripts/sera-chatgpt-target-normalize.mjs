#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const VERSION = "phase123-safe-autopilot-continuation-v1";

function autoOpsDir() { return process.env.SERA_AUTOOPS_DIR || path.join(os.homedir(), "OneDrive", "SERA-AutoOps"); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").trim();
  return text ? JSON.parse(text) : fallback;
}
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8"); }
function conversationIdFromUrl(value) {
  try {
    const url = value instanceof URL ? value : new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const cIndex = parts.indexOf("c");
    if (cIndex >= 0 && parts[cIndex + 1]) return parts[cIndex + 1];
    return null;
  } catch { return null; }
}
function sameSavedConversation(tabUrl, targetUrl) {
  try {
    const tab = new URL(tabUrl);
    const target = new URL(targetUrl);
    if (tab.hostname !== target.hostname) return false;
    const tabPath = tab.pathname.replace(/\/$/, "");
    const targetPath = target.pathname.replace(/\/$/, "");
    if (tabPath === targetPath || tab.href.split("?")[0] === target.href.split("?")[0]) return true;
    const tabConversationId = conversationIdFromUrl(tab);
    const targetConversationId = conversationIdFromUrl(target);
    return !!tabConversationId && !!targetConversationId && tabConversationId === targetConversationId;
  } catch { return false; }
}
async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}
function loadTarget(autoOps) {
  const controlPath = path.join(autoOps, "00_control_center", "chatgpt-target.json");
  const legacyPath = path.join(autoOps, "12_browser_helper_state", "chatgpt-bridge-target.json");
  const source = fs.existsSync(controlPath) ? controlPath : legacyPath;
  if (!fs.existsSync(source)) throw new Error(`Missing saved ChatGPT target. Checked ${controlPath} and ${legacyPath}`);
  const target = readJson(source, null);
  if (!target?.targetUrl) throw new Error("Saved ChatGPT target missing targetUrl.");
  if (target.allowNewChatFallback !== false || target.allowRandomRecentChatFallback !== false) throw new Error("Saved ChatGPT fallback flags must remain false.");
  return { target, controlPath, legacyPath };
}
async function main() {
  const autoOps = autoOpsDir();
  const { target, controlPath, legacyPath } = loadTarget(autoOps);
  const cdpEndpoint = (target.cdpEndpoint || "http://127.0.0.1:9222").replace(/\/$/, "");
  const tabs = await fetchJson(`${cdpEndpoint}/json/list`);
  const matches = tabs.filter((tab) => tab.type === "page" && tab.url && sameSavedConversation(tab.url, target.targetUrl));
  const evidence = {
    ok: matches.length === 1,
    version: VERSION,
    cdpEndpoint,
    expectedTargetUrl: target.targetUrl,
    expectedConversationId: conversationIdFromUrl(target.targetUrl),
    matches: matches.map((tab) => ({ id: tab.id, title: tab.title || null, url: tab.url })),
    updatedAt: new Date().toISOString()
  };
  if (matches.length !== 1) {
    console.log(JSON.stringify({ ...evidence, status: "needs_attention", reason: `Expected exactly one saved ChatGPT target tab, found ${matches.length}.` }, null, 2));
    process.exitCode = 2;
    return;
  }
  const normalized = {
    ...target,
    targetUrl: matches[0].url,
    cdpEndpoint,
    allowNewChatFallback: false,
    allowRandomRecentChatFallback: false,
    normalizedBy: VERSION,
    normalizedAt: new Date().toISOString()
  };
  writeJson(controlPath, normalized);
  writeJson(legacyPath, normalized);
  console.log(JSON.stringify({ ...evidence, status: "normalized", targetUrl: normalized.targetUrl, wrote: [controlPath, legacyPath] }, null, 2));
}
main().catch((error) => {
  console.log(JSON.stringify({ ok: false, version: VERSION, status: "error", error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 2;
});

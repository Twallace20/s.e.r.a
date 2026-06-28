#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const required = [
  "docs/phases/PHASE_117A_CHATGPT_ARTIFACT_DOWNLOAD_HARDENING_V1.md",
  "docs/autopilot/CHATGPT_ARTIFACT_DOWNLOAD_SELECTOR_CONTRACT.md",
  "scripts/chatgpt-bridge-submit-download.mjs",
  "scripts/phase117a-verify.mjs",
  ".overlay/phase117a-manifest.json",
  ".sera-proof/phase117a/phase117a-verify.json"
];

const results = [];
function sha(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function check(name, ok, detail = "") {
  results.push({ check: name, ok, detail });
  if (!ok) process.exitCode = 1;
}
for (const file of required) check(`exists:${file}`, fs.existsSync(file), fs.existsSync(file) ? sha(file) : "missing");
try {
  execFileSync(process.execPath, ["--check", "scripts/chatgpt-bridge-submit-download.mjs"], { stdio: "pipe" });
  check("node_syntax:chatgpt-bridge-submit-download", true, "syntax ok");
} catch (error) {
  check("node_syntax:chatgpt-bridge-submit-download", false, String(error));
}
const bridge = fs.existsSync("scripts/chatgpt-bridge-submit-download.mjs") ? fs.readFileSync("scripts/chatgpt-bridge-submit-download.mjs", "utf8") : "";
for (const needle of [
  "ancestorText",
  "matchingAssistant",
  "contextText",
  "visibleClickableText",
  "downloadSearchDirs",
  "moveZipIntoDownloadDir",
  "chrome-cdp-profile",
  "PointerEvent",
  "Browser.setDownloadBehavior",
  "No random chat selected"
]) check(`contains:${needle}`, bridge.includes(needle), bridge.includes(needle) ? "found" : "missing");
console.log(JSON.stringify({ phase: "phase117a-chatgpt-artifact-download-hardening-v1", status: process.exitCode ? "FAIL" : "PASS", results }, null, 2));

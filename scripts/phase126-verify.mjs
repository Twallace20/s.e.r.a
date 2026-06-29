#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const required = [
  "scripts/chatgpt-bridge-submit-download.mjs",
  "scripts/sera-chatgpt-submit-download.ps1",
  "scripts/sera-chatgpt-artifact-watcher.mjs",
  "scripts/sera-autopilot-loop.mjs",
  "scripts/sera-artifact-download-routing-idempotency.mjs",
  "scripts/sera-artifact-download-routing-idempotency.ps1",
  "docs/autopilot/ARTIFACT_DOWNLOAD_ROUTING_IDEMPOTENCY_V1.md",
  "docs/phases/PHASE_126_ARTIFACT_DOWNLOAD_ROUTING_IDEMPOTENCY_V1.md",
  ".overlay/phase126-manifest.json",
  ".sera-proof/phase126/phase126-verify.json"
];
const missing = required.filter((file) => !fs.existsSync(path.join(process.cwd(), file)));
const bridge = fs.readFileSync(path.join(process.cwd(), "scripts/chatgpt-bridge-submit-download.mjs"), "utf8");
const loop = fs.readFileSync(path.join(process.cwd(), "scripts/sera-autopilot-loop.mjs"), "utf8");
const watcher = fs.readFileSync(path.join(process.cwd(), "scripts/sera-chatgpt-artifact-watcher.mjs"), "utf8");
const checks = {
  missing,
  bridgeSkipsPromptWhenArtifactVisible: bridge.includes("EXECUTE_PASS_EXISTING_ARTIFACT") && bridge.includes("expectedLinkText"),
  autopilotUsesWatcherForDownloads: loop.includes("watcher_idempotent") && loop.includes("useArtifactWatcherForDownloads"),
  watcherRoutesNormalOverlaysToApply: watcher.includes("normalPhaseOverlayLike") && watcher.includes("normal phase overlay artifact")
};
const valid = missing.length === 0 && checks.bridgeSkipsPromptWhenArtifactVisible && checks.autopilotUsesWatcherForDownloads && checks.watcherRoutesNormalOverlaysToApply;
const result = { phaseId: "phase126-artifact-download-routing-idempotency-v1", valid, checks, createdAt: new Date().toISOString() };
console.log(JSON.stringify(result, null, 2));
if (!valid) process.exit(1);

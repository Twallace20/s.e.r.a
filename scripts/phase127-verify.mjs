#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const checks = [];
function has(file, needles) {
  const text = fs.readFileSync(file, "utf8");
  return needles.every((needle) => text.includes(needle));
}
function check(name, ok) { checks.push({ name, ok }); }
check("autopilot-loop-has-phase127-version", has(path.join("scripts", "sera-autopilot-loop.mjs"), ["phase127-closed-phase-reprocessing-guard-v1", "already_closed_cleanly", "archiveClosedPhaseQueueArtifacts"]));
check("artifact-watcher-has-closed-phase-guard", has(path.join("scripts", "sera-chatgpt-artifact-watcher.mjs"), ["phase127-closed-phase-reprocessing-guard-v1", "archiveClosedPhaseZipIfQueued", "archivedClosedPhaseArtifacts"]));
check("repair-orchestrator-sanitized", has(path.join("scripts", "sera-autopilot-repair-orchestrator.mjs"), ["phase127-closed-phase-reprocessing-guard-v1", "sanitizeForBridge", "Stop if owner decision is required"]));
check("closed-phase-guard-helper-exists", has(path.join("scripts", "sera-closed-phase-reprocessing-guard.mjs"), ["closedPhaseCount", "archivedCount", "closed-phase-reprocessing-guard-last-result.json"]));
check("overlay-manifest-exists", fs.existsSync(path.join(".overlay", "phase127-manifest.json")));
check("proof-exists", fs.existsSync(path.join(".sera-proof", "phase127", "phase127-verify.json")));
const ok = checks.every((item) => item.ok);
const result = { phaseId: "phase127-closed-phase-reprocessing-guard-v1", ok, checks, createdAt: new Date().toISOString() };
fs.mkdirSync(path.join(".sera-proof", "phase127"), { recursive: true });
fs.writeFileSync(path.join(".sera-proof", "phase127", "phase127-verify-runtime.json"), JSON.stringify(result, null, 2)+"\n", "utf8");
console.log(JSON.stringify(result, null, 2));
if (!ok) process.exitCode = 1;

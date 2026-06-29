#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const required = [
  "scripts/sera-control-center-reconcile.mjs",
  "scripts/sera-control-center-reconcile.ps1",
  "scripts/sera-autopilot-loop.mjs",
  "scripts/sera-autopilot-continue.ps1",
  "scripts/sera-chatgpt-artifact-watcher.mjs",
  "docs/autopilot/CONTROL_CENTER_HANDOFF_RECONCILER_NEXT_PHASE_RESOLVER.md",
  "docs/phases/PHASE_122_CONTROL_CENTER_HANDOFF_RECONCILER_NEXT_PHASE_RESOLVER_V1.md",
  ".overlay/phase122-manifest.json",
  ".sera-proof/phase122/phase122-verify.json"
];
const failures = [];
for (const file of required) {
  if (!fs.existsSync(path.join(process.cwd(), file))) failures.push(`missing ${file}`);
}
for (const file of ["scripts/sera-control-center-reconcile.mjs", "scripts/sera-autopilot-loop.mjs", "scripts/sera-chatgpt-artifact-watcher.mjs"]) {
  if (fs.existsSync(file)) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) failures.push(`${file} syntax failed: ${result.stderr || result.stdout}`);
  }
}
const output = { phaseId: "phase122-control-center-handoff-reconciler-next-phase-resolver-v1", valid: failures.length === 0, failures, createdAt: new Date().toISOString() };
console.log(JSON.stringify(output, null, 2));
if (failures.length) process.exitCode = 1;

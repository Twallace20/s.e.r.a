#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repo = process.cwd();
const required = [
  "scripts/sera-autopilot-loop.mjs",
  "scripts/sera-autopilot-continue.ps1",
  "scripts/sera-autopilot-directive.mjs",
  "scripts/sera-autopilot-directive.ps1",
  "docs/autopilot/AUTOPILOT_DIRECTIVE_CONTROL_CENTER_V1.md",
  "docs/phases/PHASE_124_AUTOPILOT_DIRECTIVE_CONTROL_CENTER_V1.md",
  ".overlay/phase124-manifest.json",
  ".sera-proof/phase124/phase124-verify.json"
];
const missing = required.filter((rel) => !fs.existsSync(path.join(repo, rel)));
const checks = [];
for (const rel of ["scripts/sera-autopilot-loop.mjs", "scripts/sera-autopilot-directive.mjs"]) {
  const result = spawnSync(process.execPath, ["--check", path.join(repo, rel)], { encoding: "utf8" });
  checks.push({ rel, status: result.status, stderr: result.stderr });
}
const ok = missing.length === 0 && checks.every((check) => check.status === 0);
const result = {
  ok,
  phase: 124,
  version: "phase124-autopilot-directive-control-center-v1",
  requiredCount: required.length,
  missing,
  checks,
  verifiedAt: new Date().toISOString()
};
console.log(JSON.stringify(result, null, 2));
if (!ok) process.exitCode = 2;

#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const mapped = [];
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--latest-blocked") continue;
  mapped.push(arg);
}
const result = spawnSync(process.execPath, [path.join("scripts", "sera-autopilot-repair-orchestrator.mjs"), ...mapped], { encoding: "utf8", shell: false });
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exitCode = result.status || 0;

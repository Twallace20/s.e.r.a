#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, "scripts", "sera-phone-control-job.mjs");
const source = fs.readFileSync(target, "utf8");
const check = spawnSync(process.execPath, ["--check", target], { cwd: root, encoding: "utf8" });
const result = {
  phaseId: "phase134-phone-control-job-syntax-hotfix-v1",
  status: check.status === 0 ? "ready" : "blocked",
  targetExists: fs.existsSync(target),
  nodeSyntaxCheckPassed: check.status === 0,
  runnerDetailJoinEscaped: source.includes('join("\\r\\n")') || source.includes("join('\\r\\n')"),
  noLiteralNewlineJoinRegression: !source.includes('join("\n")'),
  stderrTail: String(check.stderr || "").slice(-2000),
  createdAt: new Date().toISOString()
};
const proofDir = path.join(root, ".sera-proof", "phase134");
fs.mkdirSync(proofDir, { recursive: true });
fs.writeFileSync(path.join(proofDir, "phase134-verify-runtime.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.nodeSyntaxCheckPassed || !result.runnerDetailJoinEscaped) process.exit(1);

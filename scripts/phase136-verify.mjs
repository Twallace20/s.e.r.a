#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, "scripts", "chatgpt-bridge-submit-download.mjs");
const source = fs.readFileSync(target, "utf8");
const check = spawnSync(process.execPath, ["--check", target], { cwd: root, encoding: "utf8" });
const splitLineReady = source.includes('const lines = String(prompt || "").split(/\\r?\\n/);');
const phaseMarkerReady = source.includes('phase136-chatgpt-bridge-regex-syntax-hotfix-v1');
const result = {
  phaseId: "phase136-chatgpt-bridge-regex-syntax-hotfix-v1",
  status: check.status === 0 && splitLineReady && phaseMarkerReady ? "ready" : "blocked",
  targetExists: fs.existsSync(target),
  nodeSyntaxCheckPassed: check.status === 0,
  regexSplitEscaped: splitLineReady,
  phaseMarkerReady,
  stderrTail: String(check.stderr || "").slice(-2000),
  createdAt: new Date().toISOString()
};
const proofDir = path.join(root, ".sera-proof", "phase136");
fs.mkdirSync(proofDir, { recursive: true });
fs.writeFileSync(path.join(proofDir, "phase136-verify-runtime.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (result.status !== "ready") process.exit(1);

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
function check(name, ok, detail = "") {
  checks.push({ name, ok: Boolean(ok), detail });
  if (!ok) process.exitCode = 1;
}
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const watcher = read("scripts/sera-phone-control-scheduled-watcher.mjs");
const job = read("scripts/sera-phone-control-job.mjs");

check("watcher uses fileURLToPath for Windows-safe repoRoot", watcher.includes("fileURLToPath(import.meta.url)"));
check("job uses fileURLToPath for Windows-safe repoRoot", job.includes("fileURLToPath(import.meta.url)"));
check("watcher no longer uses URL pathname repoRoot", !watcher.includes("new URL(import.meta.url).pathname"));
check("job no longer uses URL pathname repoRoot", !job.includes("new URL(import.meta.url).pathname"));
check("watcher quarantines invalid command files instead of blocking queue", watcher.includes("quarantineInvalidCommands") && watcher.includes("invalid_json_quarantined"));
check("watcher converts job-launch exceptions into blocked command outcomes", watcher.includes("try {") && watcher.includes("runPhoneControlJob(selected.file)") && watcher.includes("exitCode: 2"));
check("phase132 version marker present", watcher.includes("phase132-phone-autopilot-real-life-proof-harness-v1") && job.includes("phase132-phone-autopilot-real-life-proof-harness-v1"));

const result = {
  ok: checks.every(c => c.ok),
  phase: 132,
  version: "phase132-phone-autopilot-real-life-proof-harness-v1",
  checks,
  verifiedAt: new Date().toISOString()
};
fs.mkdirSync(path.join(root, ".sera-proof", "phase132"), { recursive: true });
fs.writeFileSync(path.join(root, ".sera-proof", "phase132", "phase132-verify-runtime.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

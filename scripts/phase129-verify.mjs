#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const checks = [];
function text(file) { return fs.readFileSync(file, "utf8"); }
function has(file, needles) { const t = text(file); return needles.every((needle) => t.includes(needle)); }
function check(name, ok) { checks.push({ name, ok }); }

check("scheduled-watcher-mjs-exists", fs.existsSync(path.join("scripts", "sera-phone-control-scheduled-watcher.mjs")));
check("scheduled-watcher-ps-wrapper-exists", fs.existsSync(path.join("scripts", "sera-phone-control-scheduled-watcher.ps1")));
check("scheduled-watcher-task-name", has(path.join("scripts", "sera-phone-control-scheduled-watcher.mjs"), ["SERA Phone Control Watcher", "phone-control-watcher.lock.json"]));
check("scheduled-watcher-calls-phase128-job", has(path.join("scripts", "sera-phone-control-scheduled-watcher.mjs"), ["sera-phone-control-job.mjs", "--run", "--json"]));
check("scheduled-watcher-status-file", has(path.join("scripts", "sera-phone-control-scheduled-watcher.mjs"), ["AUTOPILOT_STATUS.md", "autopilot-command.json"]));
check("scheduled-watcher-stop-controls", has(path.join("scripts", "sera-phone-control-scheduled-watcher.mjs"), ["EMERGENCY_STOP_AUTOPILOT.flag", "STOP_AUTOPILOT.flag", "PAUSE_AUTOPILOT.flag"]));
check("scheduled-task-installer", has(path.join("scripts", "sera-phone-control-scheduled-watcher.ps1"), ["Register-ScheduledTask", "-MultipleInstances IgnoreNew", "-EveryMinutes"]));
check("docs-exist", fs.existsSync(path.join("docs", "autopilot", "PHONE_CONTROL_SCHEDULED_WATCHER_V1.md")));
check("manifest-exists", fs.existsSync(path.join(".overlay", "phase129-manifest.json")));
check("proof-exists", fs.existsSync(path.join(".sera-proof", "phase129", "phase129-verify.json")));

const ok = checks.every((item) => item.ok);
const result = { phaseId: "phase129-phone-control-scheduled-watcher-v1", ok, checks, createdAt: new Date().toISOString() };
fs.mkdirSync(path.join(".sera-proof", "phase129"), { recursive: true });
fs.writeFileSync(path.join(".sera-proof", "phase129", "phase129-verify-runtime.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
console.log(JSON.stringify(result, null, 2));
if (!ok) process.exitCode = 1;

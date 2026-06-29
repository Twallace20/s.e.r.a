#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const checks = [];
function text(file) { return fs.readFileSync(file, "utf8"); }
function has(file, needles) { const t = text(file); return needles.every((needle) => t.includes(needle)); }
function check(name, ok) { checks.push({ name, ok }); }

check("phone-control-job-script-exists", fs.existsSync(path.join("scripts", "sera-phone-control-job.mjs")));
check("phone-control-ps-wrapper-exists", fs.existsSync(path.join("scripts", "sera-phone-control-job.ps1")));
check("phone-control-validates-range", has(path.join("scripts", "sera-phone-control-job.mjs"), ["validateRange", "maxPhases may not exceed 5", "phaseStart"]));
check("phone-control-writes-command-file", has(path.join("scripts", "sera-phone-control-job.mjs"), ["autopilot-command.json", "AUTOPILOT_STATUS.md", "autopilot-command-state.json"]));
check("phone-control-calls-existing-autopilot", has(path.join("scripts", "sera-phone-control-job.mjs"), ["sera-autopilot-continue.ps1", "-StartPhase", "-EndPhase", "-EnableAutopilotForThisRun"]));
check("template-exists", fs.existsSync(path.join("00_control_center_templates", "autopilot-command.example.json")));
check("docs-exist", fs.existsSync(path.join("docs", "autopilot", "PHONE_CONTROL_CENTER_JOB_FILE_V1.md")));
check("manifest-exists", fs.existsSync(path.join(".overlay", "phase128-manifest.json")));
check("proof-exists", fs.existsSync(path.join(".sera-proof", "phase128", "phase128-verify.json")));

const ok = checks.every((item) => item.ok);
const result = { phaseId: "phase128-phone-control-center-job-file-v1", ok, checks, createdAt: new Date().toISOString() };
fs.mkdirSync(path.join(".sera-proof", "phase128"), { recursive: true });
fs.writeFileSync(path.join(".sera-proof", "phase128", "phase128-verify-runtime.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
console.log(JSON.stringify(result, null, 2));
if (!ok) process.exitCode = 1;

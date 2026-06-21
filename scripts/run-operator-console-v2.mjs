#!/usr/bin/env node
import { writeOperatorTerminalDashboard } from "./lib/operator-console-v2.mjs";

function fail(message, detail) {
  console.error(`S.E.R.A. phase22 operator console v2: FAIL ${message}`);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

const rootDir = process.cwd();
const result = writeOperatorTerminalDashboard(rootDir);
if (!result.ok) fail("dashboard generation failed", result);
if (!result.jsonPath || !result.markdownPath || !result.historyPath) fail("dashboard evidence paths were not written", result);
if (!result.dashboard.panels.some((panel) => panel.id === "research")) fail("research panel missing", result.dashboard);
if (!result.dashboard.panels.some((panel) => panel.id === "certification")) fail("certification panel missing", result.dashboard);
if (!result.dashboard.guardrails.some((item) => item.includes("does not add mutation authority"))) fail("mutation-authority guardrail missing", result.dashboard);
if (!result.dashboard.nextActions.some((item) => item.includes("phase22:verify"))) fail("phase22 verification next action missing", result.dashboard);

console.log(result.terminalText.trim());
console.log("S.E.R.A. phase22 operator console v2: PASS");
console.log(JSON.stringify({
  ok: true,
  status: "completed",
  certifiedLevel: result.dashboard.certification.certifiedLevel,
  freeCoreThroughPhase: result.dashboard.certification.freeCoreThroughPhase,
  panelCount: result.dashboard.panels.length,
  currentPhase: result.dashboard.phase.current,
  nextPhase: result.dashboard.phase.next,
  jsonPath: result.jsonPath,
  markdownPath: result.markdownPath,
  historyPath: result.historyPath
}, null, 2));

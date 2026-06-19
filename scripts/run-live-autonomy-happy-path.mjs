#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { SeraKernel } = require("../packages/kernel/dist/index.js");

const rootDir = process.cwd();
const targetRelativePath = ".sera-local/phase16-happy-path/target.md";
const targetPath = path.join(rootDir, targetRelativePath);
const phaseDocPath = "docs/phases/PHASE_16_LIVE_AUTONOMOUS_DEV_HAPPY_PATH_V1.md";

function fail(message, detail) {
  console.error(`S.E.R.A. phase16 live autonomy: FAIL ${message}`);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

function ensureTarget() {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(
    targetPath,
    [
      "# Phase 16 Live Autonomous Dev Happy Path Target",
      "",
      "phase16_status: pending",
      "phase16_guardrail: local ignored target only",
      ""
    ].join("\n"),
    "utf8"
  );
}

function readTarget() {
  return fs.readFileSync(targetPath, "utf8");
}

if (!fs.existsSync(path.join(rootDir, "packages", "kernel", "dist", "index.js"))) {
  fail("kernel dist is missing; run npm run build before phase16:demo");
}

if (!fs.existsSync(path.join(rootDir, phaseDocPath))) {
  fail(`missing Phase 16 documentation: ${phaseDocPath}`);
}

ensureTarget();

const kernel = new SeraKernel({ rootDir });

const knowledge = kernel.ingestKnowledgeFile({
  relativePath: phaseDocPath,
  title: "Phase 16 Live Autonomous Dev Happy Path"
});

if (!knowledge.ok) {
  fail("could not ingest Phase 16 knowledge evidence", knowledge);
}

const proposal = kernel.runAutonomousDevLoop({
  mode: "propose",
  goal: "Propose a bounded Phase 16 local ignored target update.",
  relativePath: targetRelativePath,
  operations: [
    {
      kind: "replace",
      find: "phase16_status: pending",
      replaceWith: "phase16_status: proposed",
      expectedOccurrences: 1
    }
  ]
});

if (
  !proposal.ok ||
  proposal.status !== "completed" ||
  proposal.autonomy?.loop?.mode !== "propose" ||
  proposal.autonomy?.patch?.totalOccurrences !== 1 ||
  !proposal.autonomy?.patch?.patchArtifactPath
) {
  fail("proposal loop did not complete as expected", proposal);
}

if (!readTarget().includes("phase16_status: pending")) {
  fail("proposal mode mutated the target; proposal must only write patch evidence");
}

const task = kernel.createQueuedTask({
  title: "Phase 16 live autonomous dev happy path",
  prompt: "Apply a bounded validation-gated autonomous demo change to a local ignored target.",
  priority: "high"
});

if (!task.ok || !task.task?.id) {
  fail("could not create queued task", task);
}

const apply = kernel.runAutonomousDevLoop({
  mode: "apply",
  taskId: task.task.id,
  goal: "Apply a bounded Phase 16 local ignored target update behind validation.",
  relativePath: targetRelativePath,
  operations: [
    {
      kind: "replace",
      find: "phase16_status: pending",
      replaceWith: "phase16_status: completed",
      expectedOccurrences: 1
    }
  ],
  validationDescription: "phase16 local ignored target marker validation",
  validate: ({ after }) => ({
    ok: after.includes("phase16_status: completed") && after.includes("phase16_guardrail: local ignored target only"),
    message: "Phase 16 local target marker and guardrail verified."
  })
});

if (
  !apply.ok ||
  apply.status !== "completed_with_changes" ||
  apply.autonomy?.loop?.mode !== "apply" ||
  apply.autonomy?.patch?.totalOccurrences !== 1 ||
  apply.autonomy?.patch?.restored === true
) {
  fail("apply loop did not complete with validated changes", apply);
}

const inspectedTask = kernel.inspectQueuedTask(task.task.id);
if (inspectedTask.task?.status !== "completed") {
  fail("queued task was not completed by the autonomous loop", inspectedTask);
}

const memory = kernel.getMemorySummary();
if ((memory.summary?.runCount ?? 0) < 1) {
  fail("memory evidence was not recorded", memory);
}

const autonomy = kernel.getAutonomousDevLoopSummary();
if ((autonomy.summary?.loopCount ?? 0) < 2 || (autonomy.summary?.appliedCount ?? 0) < 1) {
  fail("autonomy evidence was not recorded", autonomy);
}

const report = kernel.writeOperatorConsoleReport();
if (!report.ok || !report.markdownPath || !report.jsonPath) {
  fail("operator report was not written", report);
}

console.log("S.E.R.A. phase16 live autonomy: PASS");
console.log(JSON.stringify({
  ok: true,
  status: "completed",
  target: targetRelativePath,
  taskId: task.task.id,
  taskStatus: inspectedTask.task.status,
  proposalLoopId: proposal.autonomy.loop.id,
  applyLoopId: apply.autonomy.loop.id,
  memorySummary: memory.summary,
  autonomySummary: autonomy.summary,
  operatorReport: {
    markdownPath: report.markdownPath,
    jsonPath: report.jsonPath
  }
}, null, 2));

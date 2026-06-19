#!/usr/bin/env node
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { SeraKernel } = require("../packages/kernel/dist/index.js");

const rootDir = process.cwd();
const kernelDist = path.join(rootDir, "packages", "kernel", "dist", "index.js");

function fail(message, detail) {
  console.error(`S.E.R.A. phase19 recursive learning: FAIL ${message}`);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

if (!kernelDist) {
  fail("kernel dist path could not be resolved");
}

const kernel = new SeraKernel({ rootDir });

const created = kernel.createQueuedTask({
  title: "Phase 19 recursive learning sample",
  prompt: "Create local evidence for the recursive learning cycle without approving or activating lessons.",
  priority: "normal",
  requestedBy: "phase19-demo",
  tags: ["phase19", "recursive-learning", "local-only"]
});
if (!created.ok || !created.task) fail("could not create recursive learning sample task", created);

const blocked = kernel.blockQueuedTask(
  created.task.id,
  "Phase 19 synthetic blocked task used to prove report-only recursive learning recommendations.",
  "phase19-demo"
);
if (!blocked.ok || !blocked.lessonCandidatePath) fail("could not create lesson candidate evidence", blocked);

const beforeCandidates = kernel.listLessons("candidates").candidates.filter((candidate) => candidate.status === "candidate").length;
const beforeApproved = kernel.listLessons("approved").approved.length;
const beforeActive = kernel.listLessons("active").active.filter((lesson) => lesson.active && lesson.status === "active").length;

const result = kernel.runRecursiveLearningCycle();
if (!result.ok) fail("recursive learning cycle did not complete", result);
if (!result.cyclePath || !result.summaryPath) fail("recursive learning cycle did not write evidence paths", result);
if (result.cycle.pendingCandidateCount < beforeCandidates) fail("recursive learning cycle lost pending candidate visibility", result);
if (!result.cycle.recommendations.some((item) => item.requiredHumanDecision)) fail("recursive learning cycle did not require human decision for pending evidence", result);
if (!result.cycle.guardrails.some((item) => item.includes("does not approve"))) fail("recursive learning guardrails are missing approval boundary", result);
if (!result.cycle.guardrails.some((item) => item.includes("paid APIs"))) fail("recursive learning guardrails are missing free-core boundary", result);

const afterApproved = kernel.listLessons("approved").approved.length;
const afterActive = kernel.listLessons("active").active.filter((lesson) => lesson.active && lesson.status === "active").length;
if (afterApproved !== beforeApproved) fail("recursive learning must not approve lessons", { beforeApproved, afterApproved });
if (afterActive !== beforeActive) fail("recursive learning must not activate lessons", { beforeActive, afterActive });

const history = kernel.listRecursiveLearningCycles();
if (!history.ok || history.cycles.length < 1) fail("recursive learning history did not record cycle", history);

console.log("S.E.R.A. phase19 recursive learning: PASS");
console.log(JSON.stringify({
  ok: true,
  status: "completed",
  cycleId: result.cycle.id,
  cycleStatus: result.cycle.status,
  pendingCandidateCount: result.cycle.pendingCandidateCount,
  recommendationCount: result.cycle.recommendations.length,
  cyclePath: result.cyclePath,
  summaryPath: result.summaryPath,
  preservedReviewBoundary: afterApproved === beforeApproved,
  preservedActivationBoundary: afterActive === beforeActive,
  historyCount: history.cycles.length
}, null, 2));

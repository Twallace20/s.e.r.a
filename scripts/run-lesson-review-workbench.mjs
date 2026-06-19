#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { SeraKernel } = require("../packages/kernel/dist/index.js");

const rootDir = process.cwd();
const phaseDocPath = "docs/phases/PHASE_17_LESSON_REVIEW_WORKBENCH_V1.md";

function fail(message, detail) {
  console.error(`S.E.R.A. phase17 lesson workbench: FAIL ${message}`);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

if (!fs.existsSync(path.join(rootDir, "packages", "kernel", "dist", "index.js"))) {
  fail("kernel dist is missing; run npm run build before phase17:demo");
}

if (!fs.existsSync(path.join(rootDir, phaseDocPath))) {
  fail(`missing Phase 17 documentation: ${phaseDocPath}`);
}

const kernel = new SeraKernel({ rootDir });

const blocked = kernel.runDeveloperPatchTask({
  mode: "direct",
  relativePath: "../phase17-outside-workbench-proof.txt",
  operations: [
    {
      kind: "replace",
      find: "phase17_status: missing",
      replaceWith: "phase17_status: should_not_write",
      expectedOccurrences: 1
    }
  ]
});

if (blocked.ok || blocked.status !== "blocked") {
  fail("expected a safe blocked run to generate lesson-candidate evidence", blocked);
}

const workbench = kernel.writeLessonReviewWorkbench();
if (!workbench.ok || !workbench.report || !workbench.jsonPath || !workbench.markdownPath) {
  fail("workbench report was not written", workbench);
}

if (workbench.report.summary.pendingCandidateCount < 1) {
  fail("workbench did not surface pending lesson candidates", workbench.report.summary);
}

if (workbench.report.summary.activeLessonCount !== workbench.report.activeLessons.length) {
  fail("active lesson summary does not match workbench records", workbench.report.summary);
}

if (!fs.existsSync(workbench.jsonPath) || !fs.existsSync(workbench.markdownPath)) {
  fail("workbench report paths do not exist", { jsonPath: workbench.jsonPath, markdownPath: workbench.markdownPath });
}

const markdown = fs.readFileSync(workbench.markdownPath, "utf8");
if (!markdown.includes("# S.E.R.A. Lesson Review Workbench") || !markdown.includes("Manual Review Guardrails")) {
  fail("workbench markdown is missing required review sections", { markdownPath: workbench.markdownPath });
}

const candidates = kernel.listLessons("candidates").candidates ?? [];
const approved = kernel.listLessons("approved").approved ?? [];
const active = kernel.listLessons("active").active ?? [];
const reviewedCandidate = candidates.find((candidate) => candidate.id === workbench.report.pendingCandidates[0]?.candidateId);

if (reviewedCandidate && reviewedCandidate.status !== "candidate") {
  fail("workbench changed a pending candidate status; it must be review-only", reviewedCandidate);
}

console.log("S.E.R.A. phase17 lesson workbench: PASS");
console.log(JSON.stringify({
  ok: true,
  status: "completed",
  pendingCandidateCount: workbench.report.summary.pendingCandidateCount,
  approvedLessonCount: approved.length,
  activeLessonCount: active.filter((lesson) => lesson.active && lesson.status === "active").length,
  jsonPath: workbench.jsonPath,
  markdownPath: workbench.markdownPath,
  guardrails: workbench.report.guardrails,
  nextActions: workbench.report.nextActions
}, null, 2));

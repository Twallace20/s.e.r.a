import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SeraKernel } from "@sera/kernel";
import { MemoryStore } from "@sera/memory";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-lesson-workbench-test-"));
}

function createLessonCandidate(root: string) {
  const kernel = new SeraKernel({ rootDir: root });
  const blocked = kernel.runDeveloperPatchTask({
    mode: "direct",
    relativePath: "../outside.txt",
    operations: [{ kind: "replace", find: "x", replaceWith: "y", expectedOccurrences: 1 }]
  });
  const memory = new MemoryStore(root);
  const candidate = memory.listLessonCandidates()[0];
  return { kernel, memory, blocked, candidate };
}

describe("S.E.R.A. Lesson Review Workbench v1", () => {
  it("writes a review packet for pending lesson candidates without making review decisions", () => {
    const root = tmpRoot();
    const { kernel, memory, blocked, candidate } = createLessonCandidate(root);

    const workbench = kernel.writeLessonReviewWorkbench();
    const candidatesAfter = memory.listLessonCandidates();
    const decisionsAfter = memory.listLessonDecisions();
    const approvedAfter = memory.listApprovedLessons();
    const activeAfter = memory.listActiveLessons();

    expect(blocked.ok).toBe(false);
    expect(workbench.ok).toBe(true);
    expect(workbench.status).toBe("completed");
    expect(workbench.report.summary.pendingCandidateCount).toBe(1);
    expect(workbench.report.pendingCandidates[0].candidateId).toBe(candidate.id);
    expect(workbench.report.pendingCandidates[0].recommendation).toBe("review-required");
    expect(workbench.report.guardrails.join(" ")).toContain("does not approve");
    expect(workbench.jsonPath && fs.existsSync(workbench.jsonPath)).toBe(true);
    expect(workbench.markdownPath && fs.existsSync(workbench.markdownPath)).toBe(true);
    expect(fs.readFileSync(workbench.markdownPath!, "utf8")).toContain("# S.E.R.A. Lesson Review Workbench");
    expect(candidatesAfter[0].status).toBe("candidate");
    expect(decisionsAfter).toHaveLength(0);
    expect(approvedAfter).toHaveLength(0);
    expect(activeAfter).toHaveLength(0);
  });

  it("shows approved lessons as inactive until explicit activation", () => {
    const root = tmpRoot();
    const { kernel, memory, candidate } = createLessonCandidate(root);

    const approval = kernel.reviewLessonCandidate({
      candidateId: candidate.id,
      decision: "approved",
      reviewer: "test-reviewer",
      rationale: "Valid reusable guardrail, but still requires explicit activation."
    });
    const workbench = kernel.getLessonReviewWorkbench();
    const approved = memory.listApprovedLessons();
    const active = memory.listActiveLessons();

    expect(approval.ok).toBe(true);
    expect(workbench.ok).toBe(true);
    expect(workbench.report.summary.pendingCandidateCount).toBe(0);
    expect(workbench.report.summary.approvedLessonCount).toBe(1);
    expect(workbench.report.summary.approvedInactiveCount).toBe(1);
    expect(workbench.report.summary.activeLessonCount).toBe(0);
    expect(workbench.report.approvedInactive[0].id).toBe(approved[0].id);
    expect(workbench.report.nextActions.join(" ")).toContain("manual activation");
    expect(approved[0].active).toBe(false);
    expect(approved[0].activation).toBe("manual-activation-required");
    expect(active).toHaveLength(0);
  });
});

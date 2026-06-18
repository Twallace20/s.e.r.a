import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SeraKernel } from "@sera/kernel";
import { MemoryStore } from "@sera/memory";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-lesson-review-test-"));
}

function createLessonCandidate(root: string) {
  const kernel = new SeraKernel({ rootDir: root });
  kernel.runDeveloperPatchTask({
    mode: "direct",
    relativePath: "../outside.txt",
    operations: [{ kind: "replace", find: "x", replaceWith: "y", expectedOccurrences: 1 }]
  });
  const memory = new MemoryStore(root);
  return { kernel, memory, candidate: memory.listLessonCandidates()[0] };
}

describe("S.E.R.A. Lesson Review + Approval v1", () => {
  it("lists and inspects lesson candidates before review", () => {
    const root = tmpRoot();
    const { kernel, candidate } = createLessonCandidate(root);

    const listed = kernel.listLessons("candidates");
    const inspected = kernel.inspectLessonCandidate(candidate.id);

    expect(listed.ok).toBe(true);
    expect(listed.candidates).toHaveLength(1);
    expect(inspected.ok).toBe(true);
    expect(inspected.candidate?.id).toBe(candidate.id);
    expect(inspected.candidate?.status).toBe("candidate");
  });

  it("approves a candidate while keeping the approved lesson inactive", () => {
    const root = tmpRoot();
    const { kernel, memory, candidate } = createLessonCandidate(root);

    const approval = kernel.reviewLessonCandidate({
      candidateId: candidate.id,
      decision: "approved",
      reviewer: "test-reviewer",
      rationale: "This is a valid reusable guardrail."
    });
    const candidates = memory.listLessonCandidates();
    const approved = memory.listApprovedLessons();
    const decisions = memory.listLessonDecisions();
    const summary = memory.summarize();

    expect(approval.ok).toBe(true);
    expect(candidates[0].status).toBe("approved");
    expect(approved).toHaveLength(1);
    expect(approved[0].candidateId).toBe(candidate.id);
    expect(approved[0].active).toBe(false);
    expect(approved[0].activation).toBe("manual-activation-required");
    expect(decisions).toHaveLength(1);
    expect(decisions[0].decision).toBe("approved");
    expect(summary.lessonCandidateCount).toBe(0);
    expect(summary.approvedLessonCount).toBe(1);
  });

  it("rejects a candidate and writes a rejected lesson record", () => {
    const root = tmpRoot();
    const { kernel, memory, candidate } = createLessonCandidate(root);

    const rejection = kernel.reviewLessonCandidate({
      candidateId: candidate.id,
      decision: "rejected",
      reviewer: "test-reviewer",
      rationale: "This failure is too specific to become a lesson."
    });
    const candidates = memory.listLessonCandidates();
    const rejected = memory.listRejectedLessons();
    const decisions = memory.listLessonDecisions();
    const summary = memory.summarize();

    expect(rejection.ok).toBe(true);
    expect(candidates[0].status).toBe("rejected");
    expect(rejected).toHaveLength(1);
    expect(rejected[0].candidateId).toBe(candidate.id);
    expect(rejected[0].active).toBe(false);
    expect(decisions).toHaveLength(1);
    expect(decisions[0].decision).toBe("rejected");
    expect(summary.lessonCandidateCount).toBe(0);
    expect(summary.rejectedLessonCount).toBe(1);
  });

  it("blocks duplicate review decisions", () => {
    const root = tmpRoot();
    const { kernel, memory, candidate } = createLessonCandidate(root);

    const first = kernel.reviewLessonCandidate({
      candidateId: candidate.id,
      decision: "approved",
      reviewer: "test-reviewer",
      rationale: "Approved once."
    });
    const second = kernel.reviewLessonCandidate({
      candidateId: candidate.id,
      decision: "rejected",
      reviewer: "test-reviewer",
      rationale: "Attempt to change the decision."
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.status).toBe("blocked");
    expect(memory.listApprovedLessons()).toHaveLength(1);
    expect(memory.listRejectedLessons()).toHaveLength(0);
    expect(memory.listLessonDecisions()).toHaveLength(1);
  });

  it("blocks missing candidates and missing rationales", () => {
    const root = tmpRoot();
    const { kernel, candidate } = createLessonCandidate(root);

    const missing = kernel.inspectLessonCandidate("lesson_candidate_missing");
    const noRationale = kernel.reviewLessonCandidate({
      candidateId: candidate.id,
      decision: "approved",
      reviewer: "test-reviewer",
      rationale: ""
    });

    expect(missing.ok).toBe(false);
    expect(missing.status).toBe("blocked");
    expect(noRationale.ok).toBe(false);
    expect(noRationale.status).toBe("blocked");
  });
});

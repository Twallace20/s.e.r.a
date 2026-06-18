import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SeraKernel } from "@sera/kernel";
import { MemoryStore } from "@sera/memory";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-active-lessons-test-"));
}

function createApprovedLesson(root: string) {
  const kernel = new SeraKernel({ rootDir: root });
  kernel.runDeveloperPatchTask({
    mode: "direct",
    relativePath: "../outside.txt",
    operations: [{ kind: "replace", find: "x", replaceWith: "y", expectedOccurrences: 1 }]
  });
  const memory = new MemoryStore(root);
  const candidate = memory.listLessonCandidates()[0];
  const approval = kernel.reviewLessonCandidate({
    candidateId: candidate.id,
    decision: "approved",
    reviewer: "test-reviewer",
    rationale: "Valid reusable guardrail."
  });
  return { kernel, memory, candidate, approval, approvedLesson: memory.listApprovedLessons()[0] };
}

describe("S.E.R.A. Active Lessons + Regression Rules v1", () => {
  it("activates an approved lesson as an auditable regression rule", () => {
    const root = tmpRoot();
    const { kernel, memory, approvedLesson } = createApprovedLesson(root);

    const activation = kernel.activateApprovedLesson({
      approvedLessonId: approvedLesson.id,
      reviewer: "test-reviewer",
      rationale: "Use this approved lesson as a certified regression guardrail."
    });
    const approved = memory.listApprovedLessons()[0];
    const active = memory.listActiveLessons();
    const rules = memory.listRegressionRules();
    const decisions = memory.listLessonActivationDecisions();
    const summary = memory.summarize();

    expect(activation.ok).toBe(true);
    expect(approved.active).toBe(true);
    expect(approved.activation).toBe("activated-as-regression-rule");
    expect(active).toHaveLength(1);
    expect(active[0].approvedLessonId).toBe(approvedLesson.id);
    expect(active[0].active).toBe(true);
    expect(rules).toHaveLength(1);
    expect(rules[0].status).toBe("active");
    expect(decisions).toHaveLength(1);
    expect(decisions[0].decision).toBe("activated");
    expect(summary.activeLessonCount).toBe(1);
    expect(summary.regressionRuleCount).toBe(1);
  });

  it("blocks activation of missing or duplicate approved lessons", () => {
    const root = tmpRoot();
    const { kernel, memory, approvedLesson } = createApprovedLesson(root);

    const missing = kernel.activateApprovedLesson({
      approvedLessonId: "approved_lesson_missing",
      reviewer: "test-reviewer",
      rationale: "Should not work."
    });
    const first = kernel.activateApprovedLesson({
      approvedLessonId: approvedLesson.id,
      reviewer: "test-reviewer",
      rationale: "Activate once."
    });
    const duplicate = kernel.activateApprovedLesson({
      approvedLessonId: approvedLesson.id,
      reviewer: "test-reviewer",
      rationale: "Attempt duplicate activation."
    });

    expect(missing.ok).toBe(false);
    expect(missing.status).toBe("blocked");
    expect(first.ok).toBe(true);
    expect(duplicate.ok).toBe(false);
    expect(duplicate.status).toBe("blocked");
    expect(memory.listActiveLessons()).toHaveLength(1);
    expect(memory.listRegressionRules()).toHaveLength(1);
  });

  it("deactivates an active lesson and marks its regression rule inactive", () => {
    const root = tmpRoot();
    const { kernel, memory, approvedLesson } = createApprovedLesson(root);
    const activation = kernel.activateApprovedLesson({
      approvedLessonId: approvedLesson.id,
      reviewer: "test-reviewer",
      rationale: "Activate for regression coverage."
    });

    const deactivation = kernel.deactivateActiveLesson({
      activeLessonId: activation.activeLesson?.id,
      reviewer: "test-reviewer",
      rationale: "No longer valid as an active rule."
    });
    const approved = memory.listApprovedLessons()[0];
    const active = memory.listActiveLessons()[0];
    const rule = memory.listRegressionRules()[0];
    const decisions = memory.listLessonActivationDecisions();
    const summary = memory.summarize();

    expect(deactivation.ok).toBe(true);
    expect(approved.active).toBe(false);
    expect(approved.activation).toBe("deactivated");
    expect(active.active).toBe(false);
    expect(active.status).toBe("inactive");
    expect(rule.status).toBe("inactive");
    expect(decisions).toHaveLength(2);
    expect(decisions[1].decision).toBe("deactivated");
    expect(summary.activeLessonCount).toBe(0);
    expect(summary.regressionRuleCount).toBe(0);
  });

  it("checks active regression rules without mutating behavior", () => {
    const root = tmpRoot();
    const { kernel, approvedLesson } = createApprovedLesson(root);
    kernel.activateApprovedLesson({
      approvedLessonId: approvedLesson.id,
      reviewer: "test-reviewer",
      rationale: "Activate for traceability check."
    });

    const check = kernel.checkLessonRegressionRules();

    expect(check.ok).toBe(true);
    expect(check.status).toBe("completed");
    expect(check.activeRuleCount).toBe(1);
    expect(check.checks).toHaveLength(1);
    expect(check.checks[0].pass).toBe(true);
  });

  it("blocks activation and deactivation without rationales", () => {
    const root = tmpRoot();
    const { kernel, approvedLesson } = createApprovedLesson(root);

    const activation = kernel.activateApprovedLesson({
      approvedLessonId: approvedLesson.id,
      reviewer: "test-reviewer",
      rationale: ""
    });
    const deactivation = kernel.deactivateActiveLesson({
      activeLessonId: "active_lesson_missing",
      reviewer: "test-reviewer",
      rationale: ""
    });

    expect(activation.ok).toBe(false);
    expect(activation.status).toBe("blocked");
    expect(deactivation.ok).toBe(false);
    expect(deactivation.status).toBe("blocked");
  });
});

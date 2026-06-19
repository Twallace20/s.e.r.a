import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SeraKernel } from "@sera/kernel";
import { MemoryStore } from "@sera/memory";

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-recursive-learning-test-"));
}

function seedBlockedRun(store: MemoryStore, root: string): void {
  store.recordRun({
    runId: "run_recursive_seed",
    taskId: "task_recursive_seed",
    prompt: "Seed blocked evidence for recursive learning.",
    status: "blocked",
    summary: "Seeded blocked run for recursive learning cycle.",
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    runDir: root,
    artifacts: ["seed-artifact.json"],
    source: "kernel-finalize"
  });
}

describe("Recursive Learning v1", () => {
  it("creates a report-only recursive learning cycle from memory evidence", () => {
    const root = tempRoot();
    const store = new MemoryStore(root);
    seedBlockedRun(store, root);

    const beforePending = store.listLessonCandidates().filter((candidate) => candidate.status === "candidate").length;
    const beforeApproved = store.listApprovedLessons().length;
    const beforeActive = store.listActiveLessons().filter((lesson) => lesson.active && lesson.status === "active").length;
    const result = store.runRecursiveLearningCycle();

    expect(result.ok).toBe(true);
    expect(result.cycle.pendingCandidateCount).toBe(beforePending);
    expect(result.cycle.recommendations.some((item) => item.requiredHumanDecision)).toBe(true);
    expect(result.cycle.recommendations.every((item) => item.blockedAutomation)).toBe(true);
    expect(result.cycle.guardrails.some((item) => item.includes("does not approve"))).toBe(true);
    expect(result.cycle.guardrails.some((item) => item.includes("paid APIs"))).toBe(true);
    expect(fs.existsSync(result.cyclePath)).toBe(true);
    expect(fs.existsSync(result.summaryPath)).toBe(true);
    expect(store.listApprovedLessons()).toHaveLength(beforeApproved);
    expect(store.listActiveLessons().filter((lesson) => lesson.active && lesson.status === "active")).toHaveLength(beforeActive);
  });

  it("records recursive learning history through the kernel without changing lesson states", () => {
    const root = tempRoot();
    const kernel = new SeraKernel({ rootDir: root });
    const task = kernel.createQueuedTask({
      title: "Seed recursive learning task",
      prompt: "Generate blocked local evidence for recursive learning.",
      priority: "normal",
      requestedBy: "test"
    });
    expect(task.ok).toBe(true);
    expect(task.task).toBeDefined();

    const blocked = kernel.blockQueuedTask(task.task!.id, "Blocked to create a candidate for recursive learning.", "test");
    expect(blocked.ok).toBe(true);

    const beforePending = kernel.listLessons("candidates").candidates.filter((candidate) => candidate.status === "candidate").length;
    const result = kernel.runRecursiveLearningCycle();
    const history = kernel.listRecursiveLearningCycles();
    const afterPending = kernel.listLessons("candidates").candidates.filter((candidate) => candidate.status === "candidate").length;

    expect(result.ok).toBe(true);
    expect(result.cycle.pendingCandidateCount).toBe(beforePending);
    expect(history.ok).toBe(true);
    expect(history.cycles).toHaveLength(1);
    expect(afterPending).toBe(beforePending);
    expect(kernel.listLessons("approved").approved).toHaveLength(0);
    expect(kernel.listLessons("active").active.filter((lesson) => lesson.active && lesson.status === "active")).toHaveLength(0);
  });

  it("produces a stable report when no learning evidence exists", () => {
    const store = new MemoryStore(tempRoot());
    const result = store.runRecursiveLearningCycle();

    expect(result.ok).toBe(true);
    expect(result.cycle.status).toBe("stable");
    expect(result.cycle.pendingCandidateCount).toBe(0);
    expect(result.cycle.recommendations.some((item) => item.action === "continue_monitoring")).toBe(true);
  });
});

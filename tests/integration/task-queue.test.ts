import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MemoryStore } from "@sera/memory";
import { SeraKernel } from "@sera/kernel";

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-task-queue-test-"));
}

describe("Planner Task Queue v1", () => {
  it("creates, lists, and inspects queued tasks", () => {
    const root = tempRoot();
    const kernel = new SeraKernel({ rootDir: root });

    const created = kernel.createQueuedTask({
      title: "Draft task plan",
      prompt: "Create a bounded task plan for testing.",
      priority: "high"
    });
    const listed = kernel.listQueuedTasks("queued");
    const inspected = kernel.inspectQueuedTask(created.task?.id ?? "missing");

    expect(created.ok).toBe(true);
    expect(created.task?.status).toBe("queued");
    expect(created.task?.priority).toBe("high");
    expect(listed.tasks).toHaveLength(1);
    expect(inspected.ok).toBe(true);
    expect(inspected.task?.id).toBe(created.task?.id);
  });

  it("starts and completes a task while recording memory history", () => {
    const root = tempRoot();
    const kernel = new SeraKernel({ rootDir: root });
    const memory = new MemoryStore(root);

    const created = kernel.createQueuedTask({ title: "Complete flow", prompt: "Validate start and completion." });
    const started = kernel.startQueuedTask(created.task?.id ?? "missing", "Begin execution.");
    const completed = kernel.completeQueuedTask(created.task?.id ?? "missing", "Finished successfully.");

    expect(started.ok).toBe(true);
    expect(started.task?.status).toBe("in_progress");
    expect(completed.ok).toBe(true);
    expect(completed.task?.status).toBe("completed");
    expect(memory.listRuns().some((run) => run.taskId === created.task?.id && run.status === "completed")).toBe(true);
  });

  it("blocks invalid task transitions without mutating status", () => {
    const root = tempRoot();
    const kernel = new SeraKernel({ rootDir: root });

    const created = kernel.createQueuedTask({ title: "Invalid transition", prompt: "Should not complete before start." });
    const completedTooEarly = kernel.completeQueuedTask(created.task?.id ?? "missing", "Attempt invalid completion.");
    const inspected = kernel.inspectQueuedTask(created.task?.id ?? "missing");
    const missing = kernel.startQueuedTask("queued_task_missing", "Should not start.");

    expect(completedTooEarly.ok).toBe(false);
    expect(completedTooEarly.status).toBe("blocked");
    expect(inspected.task?.status).toBe("queued");
    expect(missing.ok).toBe(false);
    expect(missing.status).toBe("blocked");
  });

  it("blocked tasks create failure journal entries and lesson candidates", () => {
    const root = tempRoot();
    const kernel = new SeraKernel({ rootDir: root });
    const memory = new MemoryStore(root);

    const created = kernel.createQueuedTask({ title: "Blocked flow", prompt: "Validate blocked task memory." });
    const blocked = kernel.blockQueuedTask(created.task?.id ?? "missing", "Blocked by missing requirements.");

    expect(blocked.ok).toBe(true);
    expect(blocked.task?.status).toBe("blocked");
    expect(memory.listFailures().some((failure) => failure.taskId === created.task?.id)).toBe(true);
    expect(memory.listLessonCandidates()).toHaveLength(1);
    expect(blocked.lessonCandidatePath).toBeTruthy();
  });

  it("summarizes queued, active, completed, blocked, and cancelled tasks", () => {
    const root = tempRoot();
    const kernel = new SeraKernel({ rootDir: root });

    const queued = kernel.createQueuedTask({ title: "Queued", prompt: "Remain queued." });
    const completed = kernel.createQueuedTask({ title: "Completed", prompt: "Will complete." });
    kernel.startQueuedTask(completed.task?.id ?? "missing", "Start completion task.");
    kernel.completeQueuedTask(completed.task?.id ?? "missing", "Complete completion task.");
    const blocked = kernel.createQueuedTask({ title: "Blocked", prompt: "Will block." });
    kernel.blockQueuedTask(blocked.task?.id ?? "missing", "Block intentionally.");
    const cancelled = kernel.createQueuedTask({ title: "Cancelled", prompt: "Will cancel." });
    kernel.cancelQueuedTask(cancelled.task?.id ?? "missing", "Cancel intentionally.");

    const summary = kernel.getTaskQueueSummary().summary;

    expect(queued.ok).toBe(true);
    expect(summary.totalCount).toBe(4);
    expect(summary.queuedCount).toBe(1);
    expect(summary.completedCount).toBe(1);
    expect(summary.blockedCount).toBe(1);
    expect(summary.cancelledCount).toBe(1);
  });
});

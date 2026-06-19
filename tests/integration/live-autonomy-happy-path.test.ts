import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SeraKernel } from "@sera/kernel";

function makeRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-live-autonomy-test-"));
}

function seedLiveRoot(root: string): void {
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.mkdirSync(path.join(root, "scratch"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "phase16-context.md"), [
    "# Phase 16 Context",
    "The live autonomous happy path must create a queued task, propose a bounded change, apply it with validation, complete the task, and preserve operator evidence.",
    ""
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(root, "scratch", "phase16-target.md"), "phase16_status: pending\n", "utf8");
}

describe("Phase 16 Live Autonomous Dev Happy Path v1", () => {
  it("runs a complete proposal to validation-gated apply path with operator evidence", () => {
    const root = makeRoot();
    seedLiveRoot(root);
    const targetPath = path.join(root, "scratch", "phase16-target.md");
    const kernel = new SeraKernel({ rootDir: root });

    const knowledge = kernel.ingestKnowledgeFile({ relativePath: "docs/phase16-context.md", title: "Phase 16 Context" });
    const task = kernel.createQueuedTask({
      title: "Phase 16 live happy path",
      prompt: "Apply a bounded, validation-gated autonomous change.",
      priority: "high",
      requestedBy: "phase16-test"
    });

    const proposal = kernel.runAutonomousDevLoop({
      mode: "propose",
      goal: "Propose the Phase 16 bounded happy-path change from local evidence.",
      relativePath: "scratch/phase16-target.md",
      operations: [{ kind: "replace", find: "phase16_status: pending", replaceWith: "phase16_status: proposed", expectedOccurrences: 1 }]
    });

    expect(knowledge.ok).toBe(true);
    expect(task.ok).toBe(true);
    expect(proposal.ok).toBe(true);
    expect(proposal.autonomy.loop.mode).toBe("propose");
    expect(fs.readFileSync(targetPath, "utf8")).toBe("phase16_status: pending\n");

    const applied = kernel.runAutonomousDevLoop({
      mode: "apply",
      taskId: task.task?.id,
      goal: "Apply the Phase 16 bounded happy-path change with validation.",
      relativePath: "scratch/phase16-target.md",
      operations: [{ kind: "replace", find: "phase16_status: pending", replaceWith: "phase16_status: completed", expectedOccurrences: 1 }],
      validate: ({ after }) => ({ ok: after.includes("phase16_status: completed"), message: "phase16 completion marker exists" })
    });

    const inspectedTask = kernel.inspectQueuedTask(task.task?.id ?? "missing");
    const loops = kernel.listAutonomousDevLoops("loops").loops ?? [];
    const events = kernel.listAutonomousDevLoops("events").events ?? [];
    const consoleReport = kernel.writeOperatorConsoleReport();

    expect(applied.ok).toBe(true);
    expect(applied.status).toBe("completed_with_changes");
    expect(fs.readFileSync(targetPath, "utf8")).toBe("phase16_status: completed\n");
    expect(inspectedTask.task?.status).toBe("completed");
    expect(applied.autonomy.taskResult?.memoryRunRecordPath).toBeTruthy();
    expect(loops.some((loop) => loop.mode === "propose")).toBe(true);
    expect(loops.some((loop) => loop.mode === "apply" && loop.status === "completed_with_changes")).toBe(true);
    expect(events.some((event) => event.eventType === "task_completed")).toBe(true);
    expect(consoleReport.ok).toBe(true);
    expect(fs.existsSync(consoleReport.markdownPath)).toBe(true);
    expect(fs.existsSync(consoleReport.jsonPath)).toBe(true);
  });

  it("keeps failed validation from counting as the live happy path", () => {
    const root = makeRoot();
    seedLiveRoot(root);
    const targetPath = path.join(root, "scratch", "phase16-target.md");
    const kernel = new SeraKernel({ rootDir: root });
    const task = kernel.createQueuedTask({ title: "Phase 16 failed path", prompt: "This should block when validation fails." });

    const failed = kernel.runAutonomousDevLoop({
      mode: "apply",
      taskId: task.task?.id,
      goal: "Attempt a Phase 16 change that fails validation.",
      relativePath: "scratch/phase16-target.md",
      operations: [{ kind: "replace", find: "phase16_status: pending", replaceWith: "phase16_status: invalid", expectedOccurrences: 1 }],
      validate: () => ({ ok: false, message: "simulated Phase 16 validation failure" })
    });
    const inspectedTask = kernel.inspectQueuedTask(task.task?.id ?? "missing");

    expect(failed.ok).toBe(false);
    expect(failed.status).toBe("blocked");
    expect(failed.autonomy.patch?.restored).toBe(true);
    expect(fs.readFileSync(targetPath, "utf8")).toBe("phase16_status: pending\n");
    expect(inspectedTask.task?.status).toBe("blocked");
    expect(failed.autonomy.taskResult?.lessonCandidatePath).toBeTruthy();
  });
});

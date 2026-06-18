import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SeraKernel } from "@sera/kernel";

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-autonomy-test-"));
}

function seedRoot(root: string): void {
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "guardrails.md"), "Autonomous development must be bounded, local, validated, and recorded.\n", "utf8");
}

describe("Autonomous Dev Loop v1", () => {
  it("proposes bounded developer changes without source mutation", () => {
    const root = tempRoot();
    seedRoot(root);
    const filePath = path.join(root, "src", "feature.ts");
    fs.writeFileSync(filePath, "export const value = 'legacy';\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });
    kernel.ingestKnowledgeFile({ relativePath: "docs/guardrails.md" });
    const result = kernel.runAutonomousDevLoop({ mode: "propose", goal: "Propose a bounded safe feature update.", relativePath: "src/feature.ts", operations: [{ kind: "replace", find: "legacy", replaceWith: "proposed", expectedOccurrences: 1 }] });
    expect(result.ok).toBe(true);
    expect(result.autonomy.loop.mode).toBe("propose");
    expect(result.autonomy.patch?.totalOccurrences).toBe(1);
    expect(result.autonomy.patch?.patchArtifactPath).toBeTruthy();
    expect(fs.readFileSync(filePath, "utf8")).toBe("export const value = 'legacy';\n");
  });

  it("blocks apply mode without a validation gate", () => {
    const root = tempRoot();
    seedRoot(root);
    const filePath = path.join(root, "src", "feature.ts");
    fs.writeFileSync(filePath, "export const value = 'legacy';\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });
    const result = kernel.runAutonomousDevLoop({ mode: "apply", goal: "Apply without validation should fail.", relativePath: "src/feature.ts", operations: [{ kind: "replace", find: "legacy", replaceWith: "unsafe", expectedOccurrences: 1 }] });
    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(fs.readFileSync(filePath, "utf8")).toBe("export const value = 'legacy';\n");
  });

  it("applies certified bounded changes and completes a queued task", () => {
    const root = tempRoot();
    seedRoot(root);
    const filePath = path.join(root, "src", "feature.ts");
    fs.writeFileSync(filePath, "export const value = 'legacy';\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });
    kernel.ingestKnowledgeFile({ relativePath: "docs/guardrails.md" });
    const task = kernel.createQueuedTask({ title: "Autonomous apply", prompt: "Apply bounded validated change." });
    const result = kernel.runAutonomousDevLoop({ mode: "apply", taskId: task.task?.id, goal: "Apply a validated autonomous change.", relativePath: "src/feature.ts", operations: [{ kind: "replace", find: "legacy", replaceWith: "autonomous", expectedOccurrences: 1 }], validate: ({ after }) => ({ ok: after.includes("autonomous"), message: "autonomous marker exists" }) });
    const inspected = kernel.inspectQueuedTask(task.task?.id ?? "missing");
    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed_with_changes");
    expect(fs.readFileSync(filePath, "utf8")).toContain("autonomous");
    expect(inspected.task?.status).toBe("completed");
    expect(result.autonomy.taskResult?.memoryRunRecordPath).toBeTruthy();
  });

  it("rolls back failed validation and blocks the queued task", () => {
    const root = tempRoot();
    seedRoot(root);
    const filePath = path.join(root, "src", "feature.ts");
    fs.writeFileSync(filePath, "export const value = 'legacy';\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });
    const task = kernel.createQueuedTask({ title: "Autonomous rollback", prompt: "Failed validation should rollback." });
    const result = kernel.runAutonomousDevLoop({ mode: "apply", taskId: task.task?.id, goal: "Attempt a change that should fail validation.", relativePath: "src/feature.ts", operations: [{ kind: "replace", find: "legacy", replaceWith: "invalid", expectedOccurrences: 1 }], validate: () => ({ ok: false, message: "simulated validation failure" }) });
    const inspected = kernel.inspectQueuedTask(task.task?.id ?? "missing");
    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.autonomy.patch?.restored).toBe(true);
    expect(fs.readFileSync(filePath, "utf8")).toBe("export const value = 'legacy';\n");
    expect(inspected.task?.status).toBe("blocked");
    expect(result.autonomy.taskResult?.lessonCandidatePath).toBeTruthy();
  });

  it("summarizes autonomous loop records and events", () => {
    const root = tempRoot();
    seedRoot(root);
    fs.writeFileSync(path.join(root, "src", "feature.ts"), "export const value = 'legacy';\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });
    kernel.runAutonomousDevLoop({ mode: "propose", goal: "Propose one change.", relativePath: "src/feature.ts", operations: [{ kind: "replace", find: "legacy", replaceWith: "next", expectedOccurrences: 1 }] });
    const loops = kernel.listAutonomousDevLoops("loops");
    const events = kernel.listAutonomousDevLoops("events");
    const summary = kernel.getAutonomousDevLoopSummary().summary;
    expect(loops.loops).toHaveLength(1);
    expect(events.events?.length).toBeGreaterThanOrEqual(4);
    expect(summary.loopCount).toBe(1);
    expect(summary.proposedCount).toBe(1);
  });
});

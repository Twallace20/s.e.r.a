import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SeraKernel } from "@sera/kernel";
import { MemoryStore } from "@sera/memory";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-memory-test-"));
}

describe("S.E.R.A. Task Memory + Failure Journal v1", () => {
  it("records completed runs in run history without creating a failure lesson", () => {
    const root = tmpRoot();
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runTask("create hello file");
    const memory = new MemoryStore(root);
    const runs = memory.listRuns();
    const failures = memory.listFailures();
    const lessons = memory.listLessonCandidates();

    expect(result.ok).toBe(true);
    expect(runs).toHaveLength(1);
    expect(runs[0].runId).toBe(result.run.id);
    expect(runs[0].status).toBe("completed_with_changes");
    expect(failures).toHaveLength(0);
    expect(lessons).toHaveLength(0);
    expect(fs.existsSync(path.join(result.run.runDir, "artifacts", "memory", "record.json"))).toBe(true);
  });

  it("records blocked runs in the failure journal and creates manual lesson candidates", () => {
    const root = tmpRoot();
    fs.writeFileSync(path.join(root, "demo.txt"), "safe\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runDeveloperPatchTask({
      mode: "direct",
      relativePath: "../outside.txt",
      operations: [{ kind: "replace", find: "safe", replaceWith: "unsafe", expectedOccurrences: 1 }]
    });
    const memory = new MemoryStore(root);
    const failures = memory.listFailures();
    const lessons = memory.listLessonCandidates();

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(failures).toHaveLength(1);
    expect(failures[0].runId).toBe(result.run.id);
    expect(failures[0].status).toBe("blocked");
    expect(lessons).toHaveLength(1);
    expect(lessons[0].status).toBe("candidate");
    expect(lessons[0].activation).toBe("manual-approval-required");
    expect(lessons[0].sourceFailureId).toBe(failures[0].id);
  });

  it("records failed validation runs and keeps lesson candidates inactive", () => {
    const root = tmpRoot();
    const target = path.join(root, "src", "bad.ts");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "export const value = 'safe';\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runSelfImprovementTask({
      mode: "apply",
      goal: "Reject unsafe self-improvement.",
      relativePath: "src/bad.ts",
      operations: [{ kind: "replace", find: "safe", replaceWith: "unsafe", expectedOccurrences: 1 }],
      validate: () => ({ ok: false, message: "simulated validation failure" })
    });
    const memory = new MemoryStore(root);
    const summary = memory.summarize();
    const lessons = memory.listLessonCandidates();

    expect(result.ok).toBe(false);
    expect(result.status).toBe("failed");
    expect(summary.runCount).toBe(1);
    expect(summary.failureCount).toBe(1);
    expect(summary.lessonCandidateCount).toBe(1);
    expect(summary.approvedLessonCount).toBe(0);
    expect(lessons[0].status).toBe("candidate");
    expect(fs.readFileSync(target, "utf8")).toBe("export const value = 'safe';\n");
  });

  it("provides kernel memory summary and list APIs", () => {
    const root = tmpRoot();
    const kernel = new SeraKernel({ rootDir: root });
    kernel.runTask("create hello file");
    kernel.runDeveloperPatchTask({
      mode: "direct",
      relativePath: "../outside.txt",
      operations: [{ kind: "replace", find: "x", replaceWith: "y", expectedOccurrences: 1 }]
    });

    const summary = kernel.getMemorySummary();
    const runs = kernel.listMemory("runs");
    const failures = kernel.listMemory("failures");
    const lessons = kernel.listMemory("lessons");

    expect(summary.ok).toBe(true);
    expect(summary.summary.runCount).toBe(2);
    expect(summary.summary.failureCount).toBe(1);
    expect(runs.runs).toHaveLength(2);
    expect(failures.failures).toHaveLength(1);
    expect(lessons.lessons).toHaveLength(1);
    expect(lessons.lessons![0].status).toBe("candidate");
  });
});

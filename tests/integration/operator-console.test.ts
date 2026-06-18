import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SeraKernel } from "@sera/kernel";

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-console-test-"));
}

function seedRoot(root: string): SeraKernel {
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "operator.md"), "Operator console evidence should stay local and auditable.\n", "utf8");
  fs.writeFileSync(path.join(root, "src", "demo.ts"), "export const mode = 'legacy';\n", "utf8");
  const kernel = new SeraKernel({ rootDir: root });
  kernel.runTask("create hello file");
  kernel.ingestKnowledgeFile({ relativePath: "docs/operator.md", title: "Operator Console Notes" });
  kernel.invokeModelProvider({ providerId: "mock-local", prompt: "Operator console test prompt." });
  kernel.runAutonomousDevLoop({ mode: "propose", goal: "Propose a console test update.", relativePath: "src/demo.ts", operations: [{ kind: "replace", find: "legacy", replaceWith: "next", expectedOccurrences: 1 }] });
  return kernel;
}

describe("Operator Console v1", () => {
  it("creates a status snapshot across certified subsystems", () => {
    const root = tempRoot();
    const kernel = seedRoot(root);
    const task = kernel.createQueuedTask({ title: "Console task", prompt: "Track console task count." });

    const result = kernel.getOperatorConsoleStatus();

    expect(result.ok).toBe(true);
    expect(result.snapshot.subsystems).toHaveLength(5);
    expect(result.snapshot.subsystems.find((system) => system.name === "memory")?.counts.runs).toBeGreaterThanOrEqual(1);
    expect(result.snapshot.subsystems.find((system) => system.name === "tasks")?.counts.queued).toBeGreaterThanOrEqual(task.task ? 1 : 0);
    expect(result.snapshot.subsystems.find((system) => system.name === "knowledge")?.counts.documents).toBeGreaterThanOrEqual(1);
    expect(result.snapshot.subsystems.find((system) => system.name === "models")?.counts.responses).toBeGreaterThanOrEqual(1);
    expect(result.snapshot.subsystems.find((system) => system.name === "autonomy")?.counts.loops).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(result.snapshotPath)).toBe(true);
  });

  it("runs health checks for local boundaries and model guardrails", () => {
    const kernel = seedRoot(tempRoot());
    const result = kernel.getOperatorConsoleHealth();

    expect(result.ok).toBe(true);
    expect(result.health.checks.find((check) => check.id === "console_external_models_disabled")?.pass).toBe(true);
    expect(result.health.checks.find((check) => check.id === "console_mock_model_available")?.pass).toBe(true);
    expect(fs.existsSync(result.healthPath)).toBe(true);
  });

  it("writes an auditable markdown and JSON report", () => {
    const kernel = seedRoot(tempRoot());
    const result = kernel.writeOperatorConsoleReport();

    expect(result.ok).toBe(true);
    expect(fs.existsSync(result.markdownPath)).toBe(true);
    expect(fs.existsSync(result.jsonPath)).toBe(true);
    expect(fs.readFileSync(result.markdownPath, "utf8")).toContain("S.E.R.A. Operator Console Report");
  });

  it("lists console snapshots, events, and report history", () => {
    const kernel = seedRoot(tempRoot());
    kernel.getOperatorConsoleStatus();
    kernel.getOperatorConsoleHealth();
    kernel.writeOperatorConsoleReport();
    const history = kernel.listOperatorConsoleHistory();

    expect(history.ok).toBe(true);
    expect(history.snapshots.length).toBeGreaterThanOrEqual(2);
    expect(history.events.length).toBeGreaterThanOrEqual(3);
    expect(history.reports.length).toBeGreaterThanOrEqual(1);
  });

  it("summarizes console activity", () => {
    const kernel = seedRoot(tempRoot());
    kernel.getOperatorConsoleStatus();
    kernel.writeOperatorConsoleReport();
    const summary = kernel.getOperatorConsoleSummary().summary;

    expect(summary.snapshotCount).toBeGreaterThanOrEqual(2);
    expect(summary.eventCount).toBeGreaterThanOrEqual(3);
    expect(summary.reportCount).toBeGreaterThanOrEqual(1);
    expect(summary.lastStatus).not.toBe("none");
  });
});

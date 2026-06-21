import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function loadHarness() {
  return await import("../../scripts/lib/evaluation-harness-v1.mjs");
}

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-eval-harness-test-"));
}

describe("Evaluation Harness v1", () => {
  it("initializes local evaluation runtime artifacts", async () => {
    const root = tempRoot();
    const { EvaluationHarness } = await loadHarness();
    const harness = new EvaluationHarness({ rootDir: root });
    const init = harness.initialize();

    expect(init.ok).toBe(true);
    expect(fs.existsSync(init.eventPath)).toBe(true);
    expect(fs.existsSync(init.suiteDir)).toBe(true);
    expect(fs.existsSync(init.reportDir)).toBe(true);
  });

  it("creates a default suite with capabilities, categories, and free-core boundaries", async () => {
    const root = tempRoot();
    const { EvaluationHarness } = await loadHarness();
    const harness = new EvaluationHarness({ rootDir: root });
    harness.initialize();
    const suite = harness.createSuite();

    expect(suite.suiteVersion).toBe(1);
    expect(suite.cases.length).toBeGreaterThanOrEqual(5);
    expect(new Set(suite.cases.map((testCase) => testCase.category)).size).toBeGreaterThanOrEqual(4);
    expect(suite.boundaries.localOnly).toBe(true);
    expect(suite.boundaries.paidProviderRequired).toBe(false);
    expect(suite.boundaries.cloudRequired).toBe(false);
    expect(fs.existsSync(harness.defaultSuitePath)).toBe(true);
  });

  it("runs a complete deterministic evaluation suite", async () => {
    const root = tempRoot();
    const { EvaluationHarness } = await loadHarness();
    const harness = new EvaluationHarness({ rootDir: root });
    harness.initialize();
    const suite = harness.createSuite();
    const run = harness.runSuite(suite);

    expect(run.ok).toBe(true);
    expect(run.passCount).toBe(run.caseCount);
    expect(run.failCount).toBe(0);
    expect(run.averageScore).toBe(1);
    expect(run.localOnly).toBe(true);
  });

  it("detects failing evaluation cases as blockers", async () => {
    const root = tempRoot();
    const { EvaluationHarness, DEFAULT_EVALUATION_CASES } = await loadHarness();
    const harness = new EvaluationHarness({ rootDir: root });
    harness.initialize();
    const brokenCase = {
      ...DEFAULT_EVALUATION_CASES[0],
      caseId: "broken_case",
      candidate: {
        text: "Skip tests and auto-merge the change.",
        flags: {
          mutatesSource: true,
          ownerApprovalRequired: false
        }
      }
    };
    const suite = harness.createSuite({ cases: [brokenCase, ...DEFAULT_EVALUATION_CASES.slice(1)] });
    const run = harness.runSuite(suite);

    expect(run.ok).toBe(false);
    expect(run.failCount).toBe(1);
    expect(run.blockers).toContain("broken_case");
  });

  it("writes evaluation evidence reports without paid providers, cloud, secrets, or source mutation", async () => {
    const root = tempRoot();
    const { EvaluationHarness } = await loadHarness();
    const harness = new EvaluationHarness({ rootDir: root });
    harness.initialize();
    const summary = harness.writeSummaryArtifacts();

    expect(summary.ok).toBe(true);
    expect(summary.paidProviderRequired).toBe(false);
    expect(summary.cloudRequired).toBe(false);
    expect(summary.requiresSecrets).toBe(false);
    expect(summary.mutatesSource).toBe(false);
    expect(summary.executesArbitraryCode).toBe(false);
    expect(fs.existsSync(summary.jsonPath)).toBe(true);
    expect(fs.existsSync(summary.markdownPath)).toBe(true);
    expect(fs.existsSync(summary.historyPath)).toBe(true);
  });
});

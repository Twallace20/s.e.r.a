import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function loadRegistry() {
  return await import("../../scripts/lib/regression-baseline-registry-v1.mjs");
}

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-regression-baseline-test-"));
}

describe("Regression Baseline Registry v1", () => {
  it("initializes local regression baseline runtime artifacts", async () => {
    const root = tempRoot();
    const { RegressionBaselineRegistry } = await loadRegistry();
    const registry = new RegressionBaselineRegistry({ rootDir: root });
    const init = registry.initialize();

    expect(init.ok).toBe(true);
    expect(fs.existsSync(init.eventPath)).toBe(true);
    expect(fs.existsSync(init.registryDir)).toBe(true);
    expect(fs.existsSync(init.reportDir)).toBe(true);
  });

  it("creates locked default baselines across core evaluation categories", async () => {
    const root = tempRoot();
    const { RegressionBaselineRegistry } = await loadRegistry();
    const registry = new RegressionBaselineRegistry({ rootDir: root });
    registry.initialize();
    const baselineRegistry = registry.createDefaultRegistry();

    expect(baselineRegistry.registryVersion).toBe(1);
    expect(baselineRegistry.baselines.length).toBeGreaterThanOrEqual(5);
    expect(new Set(baselineRegistry.baselines.map((baseline) => baseline.category)).size).toBeGreaterThanOrEqual(5);
    expect(baselineRegistry.baselines.every((baseline) => baseline.locked === true)).toBe(true);
    expect(fs.existsSync(registry.defaultRegistryPath)).toBe(true);
  });

  it("validates registry boundaries and owner approval requirements", async () => {
    const root = tempRoot();
    const { RegressionBaselineRegistry } = await loadRegistry();
    const registry = new RegressionBaselineRegistry({ rootDir: root });
    registry.initialize();
    const baselineRegistry = registry.createDefaultRegistry();
    const validation = registry.validateRegistry(baselineRegistry);

    expect(validation.ok).toBe(true);
    expect(baselineRegistry.boundaries.localOnly).toBe(true);
    expect(baselineRegistry.boundaries.paidProviderRequired).toBe(false);
    expect(baselineRegistry.boundaries.cloudRequired).toBe(false);
    expect(baselineRegistry.boundaries.requiresSecrets).toBe(false);
    expect(baselineRegistry.boundaries.mutatesSource).toBe(false);
    expect(baselineRegistry.boundaries.executesArbitraryCode).toBe(false);
    expect(baselineRegistry.boundaries.ownerApprovalRequiredForBaselineChanges).toBe(true);
  });

  it("detects evaluation regressions against known-good baselines", async () => {
    const root = tempRoot();
    const { RegressionBaselineRegistry, DEFAULT_EVALUATION_SUMMARY } = await loadRegistry();
    const registry = new RegressionBaselineRegistry({ rootDir: root });
    registry.initialize();
    const baselineRegistry = registry.createDefaultRegistry();
    const brokenSummary = {
      ...DEFAULT_EVALUATION_SUMMARY,
      passCount: 4,
      failCount: 1,
      averageScore: 0.8,
      categoryScores: {
        ...DEFAULT_EVALUATION_SUMMARY.categoryScores,
        safety: 0
      },
      signals: DEFAULT_EVALUATION_SUMMARY.signals.filter((signal) => signal !== "emergencyStopRequired")
    };
    const comparison = registry.compareEvaluationSummary(baselineRegistry, brokenSummary);

    expect(comparison.ok).toBe(false);
    expect(comparison.status).toBe("regression_detected");
    expect(comparison.blockers.length).toBeGreaterThan(0);
  });

  it("writes baseline evidence reports without paid providers, cloud, secrets, arbitrary execution, or source mutation", async () => {
    const root = tempRoot();
    const { RegressionBaselineRegistry } = await loadRegistry();
    const registry = new RegressionBaselineRegistry({ rootDir: root });
    const summary = registry.writeSummaryArtifacts();

    expect(summary.ok).toBe(true);
    expect(summary.paidProviderRequired).toBe(false);
    expect(summary.cloudRequired).toBe(false);
    expect(summary.requiresSecrets).toBe(false);
    expect(summary.mutatesSource).toBe(false);
    expect(summary.executesArbitraryCode).toBe(false);
    expect(summary.ownerApprovalRequiredForBaselineChanges).toBe(true);
    expect(fs.existsSync(summary.jsonPath)).toBe(true);
    expect(fs.existsSync(summary.markdownPath)).toBe(true);
    expect(fs.existsSync(summary.historyPath)).toBe(true);
  });
});

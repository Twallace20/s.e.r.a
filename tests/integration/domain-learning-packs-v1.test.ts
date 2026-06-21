import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function loadPacks() {
  return await import("../../scripts/lib/domain-learning-packs-v1.mjs");
}

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-domain-learning-packs-test-"));
}

describe("Domain Learning Packs v1", () => {
  it("initializes local domain pack runtime artifacts", async () => {
    const root = tempRoot();
    const { DomainLearningPacks } = await loadPacks();
    const packs = new DomainLearningPacks({ rootDir: root });
    const init = packs.initialize();

    expect(init.ok).toBe(true);
    expect(fs.existsSync(init.eventPath)).toBe(true);
    expect(fs.existsSync(init.packDir)).toBe(true);
    expect(fs.existsSync(init.reportDir)).toBe(true);
  });

  it("creates domain packs connected to curriculum and regression baselines", async () => {
    const root = tempRoot();
    const { DomainLearningPacks } = await loadPacks();
    const packs = new DomainLearningPacks({ rootDir: root });
    packs.initialize();
    const registry = packs.createDefaultRegistry();

    expect(registry.registryVersion).toBe(1);
    expect(registry.packs.length).toBeGreaterThanOrEqual(5);
    expect(registry.curriculum.moduleCount).toBeGreaterThanOrEqual(5);
    expect(registry.regressionBaselines.baselineCount).toBeGreaterThanOrEqual(5);
    expect(fs.existsSync(packs.defaultRegistryPath)).toBe(true);
  });

  it("validates pack objectives, source requirements, evaluation hooks, and approval boundaries", async () => {
    const root = tempRoot();
    const { DomainLearningPacks } = await loadPacks();
    const packs = new DomainLearningPacks({ rootDir: root });
    packs.initialize();
    const registry = packs.createDefaultRegistry();
    const validation = packs.validateRegistry(registry);

    expect(validation.ok).toBe(true);
    expect(validation.failedCount).toBe(0);
    expect(registry.packs.every((pack) => pack.learningObjectives.length >= 3)).toBe(true);
    expect(registry.packs.every((pack) => pack.sourceRequirements.length >= 3)).toBe(true);
    expect(registry.packs.every((pack) => pack.evaluationHooks.length >= 2)).toBe(true);
    expect(registry.packs.every((pack) => pack.ownerApprovalRequiredForActivation === true)).toBe(true);
  });

  it("summarizes domain packs as planned, not activated", async () => {
    const root = tempRoot();
    const { DomainLearningPacks } = await loadPacks();
    const packs = new DomainLearningPacks({ rootDir: root });
    packs.initialize();
    const registry = packs.createDefaultRegistry();
    const summary = packs.summarizeRegistry(registry);

    expect(summary.ok).toBe(true);
    expect(summary.categories.length).toBeGreaterThanOrEqual(5);
    expect(summary.plannedPackCount).toBe(registry.packs.length);
    expect(summary.missingCurriculumPackIds).toEqual([]);
    expect(summary.missingBaselinePackIds).toEqual([]);
  });

  it("writes domain pack evidence reports without paid providers, cloud, secrets, arbitrary execution, activation, or source mutation", async () => {
    const root = tempRoot();
    const { DomainLearningPacks } = await loadPacks();
    const packs = new DomainLearningPacks({ rootDir: root });
    const summary = packs.writeSummaryArtifacts();

    expect(summary.ok).toBe(true);
    expect(summary.packCount).toBeGreaterThanOrEqual(5);
    expect(summary.paidProviderRequired).toBe(false);
    expect(summary.cloudRequired).toBe(false);
    expect(summary.requiresSecrets).toBe(false);
    expect(summary.mutatesSource).toBe(false);
    expect(summary.executesArbitraryCode).toBe(false);
    expect(summary.packActivationAllowed).toBe(false);
    expect(summary.ownerApprovalRequiredForPackChanges).toBe(true);
    expect(summary.ownerApprovalRequiredForPackActivation).toBe(true);
    expect(fs.existsSync(summary.jsonPath)).toBe(true);
    expect(fs.existsSync(summary.markdownPath)).toBe(true);
    expect(fs.existsSync(summary.historyPath)).toBe(true);
  });
});

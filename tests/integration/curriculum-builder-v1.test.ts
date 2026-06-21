import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function loadBuilder() {
  return await import("../../scripts/lib/curriculum-builder-v1.mjs");
}

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-curriculum-builder-test-"));
}

describe("Curriculum Builder v1", () => {
  it("initializes local curriculum runtime artifacts", async () => {
    const root = tempRoot();
    const { CurriculumBuilder } = await loadBuilder();
    const builder = new CurriculumBuilder({ rootDir: root });
    const init = builder.initialize();

    expect(init.ok).toBe(true);
    expect(fs.existsSync(init.eventPath)).toBe(true);
    expect(fs.existsSync(init.planDir)).toBe(true);
    expect(fs.existsSync(init.reportDir)).toBe(true);
  });

  it("ranks capability gaps by priority and score distance", async () => {
    const root = tempRoot();
    const { CurriculumBuilder, DEFAULT_CAPABILITY_GAPS } = await loadBuilder();
    const builder = new CurriculumBuilder({ rootDir: root });
    const ranked = builder.rankGaps(DEFAULT_CAPABILITY_GAPS);

    expect(ranked.length).toBeGreaterThanOrEqual(5);
    expect(ranked[0].priority).toBe("critical");
    expect(ranked.every((gap) => typeof gap.priorityScore === "number")).toBe(true);
  });

  it("creates a local curriculum connected to regression baselines", async () => {
    const root = tempRoot();
    const { CurriculumBuilder } = await loadBuilder();
    const builder = new CurriculumBuilder({ rootDir: root });
    builder.initialize();
    const plan = builder.createDefaultCurriculum();

    expect(plan.curriculumVersion).toBe(1);
    expect(plan.gaps.length).toBeGreaterThanOrEqual(5);
    expect(plan.modules.length).toBeGreaterThanOrEqual(5);
    expect(plan.baselineRegistry.baselineCount).toBeGreaterThanOrEqual(5);
    expect(fs.existsSync(builder.defaultPlanPath)).toBe(true);
  });

  it("validates curriculum safety boundaries and owner approval requirements", async () => {
    const root = tempRoot();
    const { CurriculumBuilder } = await loadBuilder();
    const builder = new CurriculumBuilder({ rootDir: root });
    builder.initialize();
    const plan = builder.createDefaultCurriculum();
    const validation = builder.validateCurriculum(plan);

    expect(validation.ok).toBe(true);
    expect(plan.boundaries.localOnly).toBe(true);
    expect(plan.boundaries.paidProviderRequired).toBe(false);
    expect(plan.boundaries.cloudRequired).toBe(false);
    expect(plan.boundaries.requiresSecrets).toBe(false);
    expect(plan.boundaries.mutatesSource).toBe(false);
    expect(plan.boundaries.executesArbitraryCode).toBe(false);
    expect(plan.boundaries.ownerApprovalRequiredForCurriculumChanges).toBe(true);
    expect(plan.boundaries.ownerApprovalRequiredForLearningActivation).toBe(true);
  });

  it("writes curriculum evidence reports without paid providers, cloud, secrets, arbitrary execution, or source mutation", async () => {
    const root = tempRoot();
    const { CurriculumBuilder } = await loadBuilder();
    const builder = new CurriculumBuilder({ rootDir: root });
    const summary = builder.writeSummaryArtifacts();

    expect(summary.ok).toBe(true);
    expect(summary.moduleCount).toBeGreaterThanOrEqual(5);
    expect(summary.paidProviderRequired).toBe(false);
    expect(summary.cloudRequired).toBe(false);
    expect(summary.requiresSecrets).toBe(false);
    expect(summary.mutatesSource).toBe(false);
    expect(summary.executesArbitraryCode).toBe(false);
    expect(summary.ownerApprovalRequiredForCurriculumChanges).toBe(true);
    expect(fs.existsSync(summary.jsonPath)).toBe(true);
    expect(fs.existsSync(summary.markdownPath)).toBe(true);
    expect(fs.existsSync(summary.historyPath)).toBe(true);
  });
});

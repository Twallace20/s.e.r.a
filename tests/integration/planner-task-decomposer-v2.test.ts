import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function loadPlanner() {
  return await import("../../scripts/lib/planner-task-decomposer-v2.mjs");
}

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-planner-v2-test-"));
}

describe("Planner / Task Decomposer v2", () => {
  it("initializes local planner v2 runtime artifacts", async () => {
    const root = tempRoot();
    const { PlannerTaskDecomposerV2 } = await loadPlanner();
    const planner = new PlannerTaskDecomposerV2({ rootDir: root });
    const init = planner.initialize();

    expect(init.ok).toBe(true);
    expect(fs.existsSync(init.eventPath)).toBe(true);
    expect(fs.existsSync(init.planDir)).toBe(true);
    expect(fs.existsSync(init.reportDir)).toBe(true);
  });

  it("creates a default phase plan from trusted source context", async () => {
    const root = tempRoot();
    const { PlannerTaskDecomposerV2 } = await loadPlanner();
    const planner = new PlannerTaskDecomposerV2({ rootDir: root });
    planner.initialize();
    const plan = planner.createDefaultPlan();

    expect(plan.planVersion).toBe(2);
    expect(plan.objective.phaseId).toBe("phase-31-planner-task-decomposer-v2");
    expect(plan.sourceTrust.trustedSourceCount).toBeGreaterThanOrEqual(7);
    expect(plan.tasks.length).toBeGreaterThanOrEqual(6);
    expect(fs.existsSync(planner.defaultPlanPath)).toBe(true);
  });

  it("validates dependencies, evidence requirements, gates, and owner approval boundaries", async () => {
    const root = tempRoot();
    const { PlannerTaskDecomposerV2 } = await loadPlanner();
    const planner = new PlannerTaskDecomposerV2({ rootDir: root });
    planner.initialize();
    const plan = planner.createDefaultPlan();
    const validation = planner.validatePlan(plan);

    expect(validation.ok).toBe(true);
    expect(validation.failedCount).toBe(0);
    expect(plan.tasks.every((task) => task.evidenceRequired.length > 0)).toBe(true);
    expect(plan.tasks.every((task) => task.validationGates.length > 0)).toBe(true);
    expect(plan.tasks.some((task) => task.ownerApprovalRequired === true)).toBe(true);
    expect(plan.boundaries.ownerApprovalRequiredForExecution).toBe(true);
  });

  it("decomposes a plan into ordered tasks, commands, categories, and evidence requirements", async () => {
    const root = tempRoot();
    const { PlannerTaskDecomposerV2 } = await loadPlanner();
    const planner = new PlannerTaskDecomposerV2({ rootDir: root });
    planner.initialize();
    const plan = planner.createDefaultPlan();
    const decomposition = planner.decomposePlan(plan);

    expect(decomposition.ok).toBe(true);
    expect(decomposition.orderedTaskIds[0]).toBe("task_source_review");
    expect(decomposition.ownerApprovalTaskIds).toContain("task_owner_closeout");
    expect(decomposition.validationCommands).toContain("npm run verify");
    expect(decomposition.categories).toContain("phase_execution");
  });

  it("writes planner evidence reports without execution, paid providers, cloud, secrets, network refresh, self-approval, or source mutation", async () => {
    const root = tempRoot();
    const { PlannerTaskDecomposerV2 } = await loadPlanner();
    const planner = new PlannerTaskDecomposerV2({ rootDir: root });
    const summary = planner.writeSummaryArtifacts();

    expect(summary.ok).toBe(true);
    expect(summary.taskCount).toBeGreaterThanOrEqual(6);
    expect(summary.paidProviderRequired).toBe(false);
    expect(summary.cloudRequired).toBe(false);
    expect(summary.requiresSecrets).toBe(false);
    expect(summary.mutatesSource).toBe(false);
    expect(summary.executesArbitraryCode).toBe(false);
    expect(summary.performsNetworkRefresh).toBe(false);
    expect(summary.executesTasks).toBe(false);
    expect(summary.selfApprovesPlan).toBe(false);
    expect(fs.existsSync(summary.jsonPath)).toBe(true);
    expect(fs.existsSync(summary.markdownPath)).toBe(true);
    expect(fs.existsSync(summary.historyPath)).toBe(true);
  });
});

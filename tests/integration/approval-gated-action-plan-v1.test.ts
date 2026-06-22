import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createDefaultApprovalGatedActionPlanV1,
  inspectApprovalGatedActionPlanV1,
} from "../../scripts/lib/approval-gated-action-plan-v1.mjs";

function createTempRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase42-"));
  for (const declaredPath of createDefaultApprovalGatedActionPlanV1().declaredPaths) {
    const fullPath = path.join(rootDir, declaredPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, "phase42 fixture\n", "utf8");
  }
  return rootDir;
}

describe("Phase 42 Approval-Gated Action Plan v1", () => {
  it("passes the default Phase 42 approval-gated action plan", () => {
    const rootDir = createTempRoot();
    const result = inspectApprovalGatedActionPlanV1(createDefaultApprovalGatedActionPlanV1(), { rootDir });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("passed");
    expect(result.approvalGatedActionPlanStatus).toBe("ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.blockers).toEqual([]);
    expect(result.declaredFileCount).toBe(4);
    expect(result.validationCommandCount).toBe(7);
    expect(result.actionPlanItemCount).toBeGreaterThanOrEqual(8);
    expect(result.safeActionPlanItemCount).toBe(result.actionPlanItemCount);
    expect(result.unsafeActionPlanItemCount).toBe(0);
    expect(result.blockedActionPlanItemCount).toBeGreaterThanOrEqual(2);
    expect(result.executableActionPlanItemCount).toBe(0);
    expect(result.evidenceRequirementCount).toBeGreaterThanOrEqual(12);
    expect(result.riskCheckCount).toBeGreaterThanOrEqual(12);
    expect(result.ownerApprovalGateCount).toBeGreaterThanOrEqual(8);
    expect(result.mapsOwnerDecisionsToActionPlan).toBe(true);
    expect(result.actionCanAuthorizeExecution).toBe(false);
    expect(result.executionAllowedAfterApproval).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.remoteExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.requiresSecrets).toBe(false);
    expect(result.mutatesSource).toBe(false);
    expect(result.recordsOwnerDecision).toBe(false);
    expect(result.decisionRecordingAllowed).toBe(false);
    expect(result.acceptsEvidenceAsOwnerApproved).toBe(false);
    expect(result.selfApprovesPlan).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.ownerDecisionRecorderBindingRequired).toBe(true);
    expect(result.approvalQueueBindingRequired).toBe(true);
    expect(result.evidenceBundleBindingRequired).toBe(true);
    expect(result.commandAllowlistRequired).toBe(true);
    expect(result.nonApprovedDecisionMustBlockAction).toBe(true);
  });

  it("writes local action plan reports without activating execution", () => {
    const rootDir = createTempRoot();
    const result = inspectApprovalGatedActionPlanV1(createDefaultApprovalGatedActionPlanV1(), { rootDir });

    expect(fs.existsSync(result.jsonPath)).toBe(true);
    expect(fs.existsSync(result.markdownPath)).toBe(true);
    expect(fs.existsSync(result.historyPath)).toBe(true);
    expect(result.jsonPath).toContain(".sera-approval-gated-action-plan");
    expect(result.markdownPath).toContain(".sera-approval-gated-action-plan");
    expect(result.mapsOwnerDecisionsToActionPlan).toBe(true);
    expect(result.actionCanAuthorizeExecution).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
  });

  it("blocks unsafe action plan items that try to execute after a gate", () => {
    const rootDir = createTempRoot();
    const plan = createDefaultApprovalGatedActionPlanV1();
    plan.actionPlanItems = [
      {
        ...plan.actionPlanItems[0],
        selfApproved: true,
        executesAfterGate: true,
        mutatesSourceAfterGate: true,
        createsBranchesAfterGate: true,
        evidenceBundleReferences: [],
      },
    ];
    const result = inspectApprovalGatedActionPlanV1(plan, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.unsafeActionPlanItemCount).toBe(1);
    expect(result.blockers.join(" ")).toContain("self approval must be blocked");
    expect(result.blockers.join(" ")).toContain("execution after gate must remain disabled");
    expect(result.blockers.join(" ")).toContain("evidence bundle reference is required");
  });

  it("blocks boundaries that try to make action plans executable", () => {
    const rootDir = createTempRoot();
    const plan = {
      ...createDefaultApprovalGatedActionPlanV1(),
      boundaries: {
        ...createDefaultApprovalGatedActionPlanV1().boundaries,
        actionCanAuthorizeExecution: true,
        executionAllowedAfterApproval: true,
        commandExecutionAllowed: true,
        mutatesSource: true,
        selfApprovalAllowed: true,
      },
    };
    const result = inspectApprovalGatedActionPlanV1(plan, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.actionCanAuthorizeExecution).toBe(true);
    expect(result.executionAllowedAfterApproval).toBe(true);
    expect(result.commandExecutionAllowed).toBe(true);
    expect(result.mutatesSource).toBe(true);
    expect(result.selfApprovalAllowed).toBe(true);
    expect(result.blockers.join(" ")).toContain("actionCanAuthorizeExecution must remain false");
    expect(result.blockers.join(" ")).toContain("executionAllowedAfterApproval must remain false");
    expect(result.blockers.join(" ")).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("mutatesSource must remain false");
    expect(result.blockers.join(" ")).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks incomplete validation command sets and unsafe paths", () => {
    const rootDir = createTempRoot();
    const plan = {
      ...createDefaultApprovalGatedActionPlanV1(),
      declaredPaths: [
        ...createDefaultApprovalGatedActionPlanV1().declaredPaths,
        "../outside.txt",
      ],
      validationCommands: ["npm run phase42:demo"],
    };
    const result = inspectApprovalGatedActionPlanV1(plan, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.blockers.join(" ")).toContain("safe and relative");
    expect(result.blockers.join(" ")).toContain("npm run verify");
  });
});

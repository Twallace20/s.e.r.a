import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerCommandDryRunSimulatorV1, inspectLocalWorkerCommandDryRunSimulatorV1 } from "../../scripts/lib/local-worker-command-dry-run-simulator-v1.mjs";

describe("local worker command dry-run simulator v1", () => {
  it("passes when the command dry-run simulator is policy-only and app-bound", () => {
    const result = inspectLocalWorkerCommandDryRunSimulatorV1();
    expect(result.ok).toBe(true);
    expect(result.localWorkerCommandDryRunSimulatorStatus).toBe("command-dry-run-simulator-policy-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.commandDryRunSimulatorRequirementCount).toBe(15);
    expect(result.commandDryRunSimulatorFieldCount).toBe(18);
    expect(result.dryRunScenarioCount).toBe(8);
    expect(result.dryRunOutcomePolicyCount).toBe(9);
    expect(result.commandDryRunSimulatorEvidenceCount).toBe(14);
    expect(result.commandDryRunSimulatorSignalCount).toBe(20);
    expect(result.safetyGateCount).toBe(860);
    expect(result.appBindingCount).toBe(6);
    expect(result.phase87CommandScopeLockReady).toBe(true);
    expect(result.phase86CommandApprovalPacketReady).toBe(true);
    expect(result.phase85CommandRiskClassifierReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.dryRunPreviewRequired).toBe(true);
    expect(result.simulatedImpactRequired).toBe(true);
    expect(result.simulatedCommandPlanRequired).toBe(true);
    expect(result.simulatedFileImpactRequired).toBe(true);
    expect(result.simulatedArtifactImpactRequired).toBe(true);
    expect(result.simulatedRiskImpactRequired).toBe(true);
    expect(result.simulatedRollbackPreviewRequired).toBe(true);
    expect(result.dryRunFailureFailsClosed).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.processSpawnAllowed).toBe(false);
    expect(result.dryRunToExecutionPromotionAllowed).toBe(false);
    expect(result.sourceMutationAllowed).toBe(false);
    expect(result.phaseZipAutoApplyAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
  });

  it("writes local command dry-run simulator reports without mutating source", () => {
    const result = inspectLocalWorkerCommandDryRunSimulatorV1(createDefaultLocalWorkerCommandDryRunSimulatorV1(), { writeArtifacts: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), ".sera-local-worker-command-dry-run-simulator", "phase88-local-worker-command-dry-run-simulator-status.json"))).toBe(true);
    expect(result.mutatesSource).toBe(false);
    expect(result.fileMutationAllowed).toBe(false);
    expect(result.recordPersistenceAllowed).toBe(false);
  });

  it("fails closed if required dry-run scenarios or outcome policies are missing", () => {
    const config = createDefaultLocalWorkerCommandDryRunSimulatorV1();
    config.dryRunScenarios = config.dryRunScenarios.filter((item) => item.id !== "phase-zip-apply-preview");
    config.dryRunOutcomePolicies = config.dryRunOutcomePolicies.filter((item) => item.id !== "no-process-spawn");
    const result = inspectLocalWorkerCommandDryRunSimulatorV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Dry-run scenario missing: phase-zip-apply-preview");
    expect(result.blockers).toContain("Dry-run outcome policy missing: no-process-spawn");
  });

  it("fails closed if execution, process spawn, source mutation, or dry-run promotion is enabled", () => {
    const config = createDefaultLocalWorkerCommandDryRunSimulatorV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.processSpawnAllowed = true;
    config.boundaries.sourceMutationAllowed = true;
    config.boundaries.dryRunToExecutionPromotionAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    const result = inspectLocalWorkerCommandDryRunSimulatorV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("processSpawnAllowed must remain false");
    expect(result.blockers).toContain("sourceMutationAllowed must remain false");
    expect(result.blockers).toContain("dryRunToExecutionPromotionAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });
});

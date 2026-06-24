import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerCommandRiskClassifierV1, inspectLocalWorkerCommandRiskClassifierV1 } from "../../scripts/lib/local-worker-command-risk-classifier-v1.mjs";

describe("local worker command risk classifier v1", () => {
  it("passes when the command risk classifier is policy-only and app-bound", () => {
    const result = inspectLocalWorkerCommandRiskClassifierV1();
    expect(result.ok).toBe(true);
    expect(result.localWorkerCommandRiskClassifierStatus).toBe("command-risk-classifier-policy-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.commandRiskClassifierRequirementCount).toBe(12);
    expect(result.commandRiskClassifierFieldCount).toBe(14);
    expect(result.commandRiskClassCount).toBe(5);
    expect(result.workerCapabilityRiskProfileCount).toBe(7);
    expect(result.commandRiskClassifierEvidenceCount).toBe(11);
    expect(result.commandRiskClassifierSignalCount).toBe(17);
    expect(result.safetyGateCount).toBe(800);
    expect(result.appBindingCount).toBe(6);
    expect(result.phase84CommandRetryBoundaryReady).toBe(true);
    expect(result.phase83CommandTimeoutBoundaryReady).toBe(true);
    expect(result.phase82RoadmapOperatorControlPlaneReady).toBe(true);
    expect(result.commandRiskInventoryRequired).toBe(true);
    expect(result.riskClassTaxonomyRequired).toBe(true);
    expect(result.prohibitedCommandClassRequired).toBe(true);
    expect(result.ownerOnlyCommandClassRequired).toBe(true);
    expect(result.workerCapabilityRiskMappingRequired).toBe(true);
    expect(result.fleetModeRiskInheritanceRequired).toBe(true);
    expect(result.riskClassifierRemainsPolicyOnlyRequired).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.riskAutoRouteAllowed).toBe(false);
    expect(result.distributedFleetExecutionAllowed).toBe(false);
    expect(result.multiWorkerTaskLeaseExecutionAllowed).toBe(false);
    expect(result.failureClassifierExecutionAllowed).toBe(false);
    expect(result.retryExecutionAllowed).toBe(false);
    expect(result.powershellExecutionAllowed).toBe(false);
    expect(result.schtasksExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.awayModeExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
  });

  it("writes local command risk classifier reports without mutating source", () => {
    const result = inspectLocalWorkerCommandRiskClassifierV1(createDefaultLocalWorkerCommandRiskClassifierV1(), { writeArtifacts: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), ".sera-local-worker-command-risk-classifier", "phase85-local-worker-command-risk-classifier-status.json"))).toBe(true);
    expect(result.mutatesSource).toBe(false);
    expect(result.fileMutationAllowed).toBe(false);
    expect(result.recordPersistenceAllowed).toBe(false);
  });

  it("fails closed if risk classes or fleet worker profiles are missing", () => {
    const config = createDefaultLocalWorkerCommandRiskClassifierV1();
    config.riskClasses = config.riskClasses.filter((item) => item.id !== "prohibited");
    config.workerCapabilityRiskProfiles = config.workerCapabilityRiskProfiles.filter((item) => item.workerRole !== "fleet-coordinator");
    const result = inspectLocalWorkerCommandRiskClassifierV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Risk class missing: prohibited");
    expect(result.blockers).toContain("Worker capability risk profile missing: fleet-coordinator");
  });

  it("fails closed if any execution, fleet, or approval boundary is enabled", () => {
    const config = createDefaultLocalWorkerCommandRiskClassifierV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.distributedFleetExecutionAllowed = true;
    config.boundaries.riskAutoRouteAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    const result = inspectLocalWorkerCommandRiskClassifierV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("distributedFleetExecutionAllowed must remain false");
    expect(result.blockers).toContain("riskAutoRouteAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });
});

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerCommandApprovalPacketV1, inspectLocalWorkerCommandApprovalPacketV1 } from "../../scripts/lib/local-worker-command-approval-packet-v1.mjs";

describe("local worker command approval packet v1", () => {
  it("passes when the command approval packet is policy-only and app-bound", () => {
    const result = inspectLocalWorkerCommandApprovalPacketV1();
    expect(result.ok).toBe(true);
    expect(result.localWorkerCommandApprovalPacketStatus).toBe("command-approval-packet-policy-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.commandApprovalPacketRequirementCount).toBe(13);
    expect(result.commandApprovalPacketFieldCount).toBe(15);
    expect(result.approvalPacketSectionCount).toBe(9);
    expect(result.automationAccelerationLaneCount).toBe(7);
    expect(result.commandApprovalPacketEvidenceCount).toBe(12);
    expect(result.commandApprovalPacketSignalCount).toBe(18);
    expect(result.safetyGateCount).toBe(820);
    expect(result.appBindingCount).toBe(6);
    expect(result.phase85CommandRiskClassifierReady).toBe(true);
    expect(result.phase84CommandRetryBoundaryReady).toBe(true);
    expect(result.phase83CommandTimeoutBoundaryReady).toBe(true);
    expect(result.commandIdentityRequired).toBe(true);
    expect(result.commandScopeSummaryRequired).toBe(true);
    expect(result.riskClassificationSummaryRequired).toBe(true);
    expect(result.workspaceAndBranchBoundaryRequired).toBe(true);
    expect(result.timeoutRetryResultRecordBoundariesRequired).toBe(true);
    expect(result.automationSourceContextRequired).toBe(true);
    expect(result.approvalPacketRemainsPolicyOnlyRequired).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.approvalAutoRouteAllowed).toBe(false);
    expect(result.autoApprovalAllowed).toBe(false);
    expect(result.schedulerCreationAllowed).toBe(false);
    expect(result.githubWorkflowMutationAllowed).toBe(false);
    expect(result.iphoneAutomationMutationAllowed).toBe(false);
    expect(result.phaseZipAutoGenerationAllowed).toBe(false);
    expect(result.phaseZipAutoApplyAllowed).toBe(false);
    expect(result.distributedFleetExecutionAllowed).toBe(false);
    expect(result.multiWorkerTaskLeaseExecutionAllowed).toBe(false);
    expect(result.powershellExecutionAllowed).toBe(false);
    expect(result.schtasksExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.awayModeExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
  });

  it("writes local command approval packet reports without mutating source", () => {
    const result = inspectLocalWorkerCommandApprovalPacketV1(createDefaultLocalWorkerCommandApprovalPacketV1(), { writeArtifacts: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), ".sera-local-worker-command-approval-packet", "phase86-local-worker-command-approval-packet-status.json"))).toBe(true);
    expect(result.mutatesSource).toBe(false);
    expect(result.fileMutationAllowed).toBe(false);
    expect(result.recordPersistenceAllowed).toBe(false);
  });

  it("fails closed if required approval sections or automation lanes are missing", () => {
    const config = createDefaultLocalWorkerCommandApprovalPacketV1();
    config.approvalPacketSections = config.approvalPacketSections.filter((item) => item.id !== "automation-source-context");
    config.automationAccelerationLanes = config.automationAccelerationLanes.filter((item) => item.id !== "phase-zip-factory");
    const result = inspectLocalWorkerCommandApprovalPacketV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Approval packet section missing: automation-source-context");
    expect(result.blockers).toContain("Automation acceleration lane missing: phase-zip-factory");
  });

  it("fails closed if any execution, automation, or approval boundary is enabled", () => {
    const config = createDefaultLocalWorkerCommandApprovalPacketV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.phaseZipAutoGenerationAllowed = true;
    config.boundaries.autoApprovalAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    const result = inspectLocalWorkerCommandApprovalPacketV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("phaseZipAutoGenerationAllowed must remain false");
    expect(result.blockers).toContain("autoApprovalAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });
});

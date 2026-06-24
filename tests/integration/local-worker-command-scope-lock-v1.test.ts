import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerCommandScopeLockV1, inspectLocalWorkerCommandScopeLockV1 } from "../../scripts/lib/local-worker-command-scope-lock-v1.mjs";

describe("local worker command scope lock v1", () => {
  it("passes when the command scope lock is policy-only and app-bound", () => {
    const result = inspectLocalWorkerCommandScopeLockV1();
    expect(result.ok).toBe(true);
    expect(result.localWorkerCommandScopeLockStatus).toBe("command-scope-lock-policy-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.commandScopeLockRequirementCount).toBe(14);
    expect(result.commandScopeLockFieldCount).toBe(17);
    expect(result.commandScopeDimensionCount).toBe(10);
    expect(result.scopeViolationPolicyCount).toBe(8);
    expect(result.commandScopeLockEvidenceCount).toBe(13);
    expect(result.commandScopeLockSignalCount).toBe(19);
    expect(result.safetyGateCount).toBe(840);
    expect(result.appBindingCount).toBe(6);
    expect(result.phase86CommandApprovalPacketReady).toBe(true);
    expect(result.phase85CommandRiskClassifierReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.scopeLockRequired).toBe(true);
    expect(result.approvedPurposeRequired).toBe(true);
    expect(result.approvedActorRequired).toBe(true);
    expect(result.allowedPathSetRequired).toBe(true);
    expect(result.deniedPathSetRequired).toBe(true);
    expect(result.approvedWorkspaceRequired).toBe(true);
    expect(result.approvedBranchRequired).toBe(true);
    expect(result.allowedCommandFamilyRequired).toBe(true);
    expect(result.prohibitedCommandFamilyRequired).toBe(true);
    expect(result.scopeExpansionRequiresNewApproval).toBe(true);
    expect(result.scopeViolationFailsClosed).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.scopeAutoExpansionAllowed).toBe(false);
    expect(result.autoScopeRepairAllowed).toBe(false);
    expect(result.unapprovedPathAccessAllowed).toBe(false);
    expect(result.unapprovedBranchAccessAllowed).toBe(false);
    expect(result.approvalPacketBypassAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
  });

  it("writes local command scope lock reports without mutating source", () => {
    const result = inspectLocalWorkerCommandScopeLockV1(createDefaultLocalWorkerCommandScopeLockV1(), { writeArtifacts: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), ".sera-local-worker-command-scope-lock", "phase87-local-worker-command-scope-lock-status.json"))).toBe(true);
    expect(result.mutatesSource).toBe(false);
    expect(result.fileMutationAllowed).toBe(false);
    expect(result.recordPersistenceAllowed).toBe(false);
  });

  it("fails closed if required scope dimensions or violation policies are missing", () => {
    const config = createDefaultLocalWorkerCommandScopeLockV1();
    config.scopeDimensions = config.scopeDimensions.filter((item) => item.id !== "path");
    config.scopeViolationPolicies = config.scopeViolationPolicies.filter((item) => item.id !== "no-scope-expansion");
    const result = inspectLocalWorkerCommandScopeLockV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Scope dimension missing: path");
    expect(result.blockers).toContain("Scope violation policy missing: no-scope-expansion");
  });

  it("fails closed if execution, scope expansion, or approval bypass is enabled", () => {
    const config = createDefaultLocalWorkerCommandScopeLockV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.scopeAutoExpansionAllowed = true;
    config.boundaries.approvalPacketBypassAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    const result = inspectLocalWorkerCommandScopeLockV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("scopeAutoExpansionAllowed must remain false");
    expect(result.blockers).toContain("approvalPacketBypassAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });
});

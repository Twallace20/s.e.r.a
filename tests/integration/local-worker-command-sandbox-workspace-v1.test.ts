import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerCommandSandboxWorkspaceV1, inspectLocalWorkerCommandSandboxWorkspaceV1 } from "../../scripts/lib/local-worker-command-sandbox-workspace-v1.mjs";

describe("local worker command sandbox workspace v1", () => {
  it("passes when the command sandbox workspace is policy-only and app-bound", () => {
    const result = inspectLocalWorkerCommandSandboxWorkspaceV1();
    expect(result.ok).toBe(true);
    expect(result.localWorkerCommandSandboxWorkspaceStatus).toBe("command-sandbox-workspace-policy-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.commandSandboxWorkspaceRequirementCount).toBe(16);
    expect(result.commandSandboxWorkspaceFieldCount).toBe(18);
    expect(result.sandboxWorkspaceDimensionCount).toBe(9);
    expect(result.sandboxArtifactPolicyCount).toBe(10);
    expect(result.commandSandboxWorkspaceEvidenceCount).toBe(15);
    expect(result.commandSandboxWorkspaceSignalCount).toBe(21);
    expect(result.safetyGateCount).toBe(880);
    expect(result.appBindingCount).toBe(6);
    expect(result.phase88CommandDryRunSimulatorReady).toBe(true);
    expect(result.phase87CommandScopeLockReady).toBe(true);
    expect(result.phase86CommandApprovalPacketReady).toBe(true);
    expect(result.phase85CommandRiskClassifierReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.sandboxWorkspaceRequired).toBe(true);
    expect(result.isolatedWorkspaceRequired).toBe(true);
    expect(result.workspaceRootResolutionRequired).toBe(true);
    expect(result.workspacePathContainmentRequired).toBe(true);
    expect(result.workspaceArtifactDirectoryRequired).toBe(true);
    expect(result.workspaceCleanupPlanRequired).toBe(true);
    expect(result.workspaceProvenanceRequired).toBe(true);
    expect(result.workspaceEscapeFailsClosed).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.processSpawnAllowed).toBe(false);
    expect(result.workspaceEscapeAllowed).toBe(false);
    expect(result.sourceMutationAllowed).toBe(false);
    expect(result.phaseZipAutoApplyAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
  });

  it("writes local command sandbox workspace reports without mutating source", () => {
    const result = inspectLocalWorkerCommandSandboxWorkspaceV1(createDefaultLocalWorkerCommandSandboxWorkspaceV1(), { writeArtifacts: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), ".sera-local-worker-command-sandbox-workspace", "phase89-local-worker-command-sandbox-workspace-status.json"))).toBe(true);
    expect(result.mutatesSource).toBe(false);
    expect(result.fileMutationAllowed).toBe(false);
    expect(result.recordPersistenceAllowed).toBe(false);
  });

  it("fails closed if required sandbox workspace dimensions or artifact policies are missing", () => {
    const config = createDefaultLocalWorkerCommandSandboxWorkspaceV1();
    config.sandboxWorkspaceDimensions = config.sandboxWorkspaceDimensions.filter((item) => item.id !== "escape-detection");
    config.sandboxArtifactPolicies = config.sandboxArtifactPolicies.filter((item) => item.id !== "no-secret-capture");
    const result = inspectLocalWorkerCommandSandboxWorkspaceV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Sandbox workspace dimension missing: escape-detection");
    expect(result.blockers).toContain("Sandbox artifact policy missing: no-secret-capture");
  });

  it("fails closed if execution, process spawn, workspace escape, or source mutation is enabled", () => {
    const config = createDefaultLocalWorkerCommandSandboxWorkspaceV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.processSpawnAllowed = true;
    config.boundaries.workspaceEscapeAllowed = true;
    config.boundaries.sourceMutationAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    const result = inspectLocalWorkerCommandSandboxWorkspaceV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("processSpawnAllowed must remain false");
    expect(result.blockers).toContain("workspaceEscapeAllowed must remain false");
    expect(result.blockers).toContain("sourceMutationAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });
});

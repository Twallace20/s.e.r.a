import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDefaultApprovalGatedLocalCommandRunnerV1,
  inspectApprovalGatedLocalCommandRunnerV1,
  runApprovalGatedLocalCommandV1,
  runApprovalGatedLocalCommandRunnerDemoV1,
} from "../../scripts/lib/approval-gated-local-command-runner-v1.mjs";

describe("approval gated local command runner v1", () => {
  it("passes when the command runner is owner-approved, catalog-only, and app-bound", () => {
    const result = inspectApprovalGatedLocalCommandRunnerV1();
    expect(result.ok).toBe(true);
    expect(result.approvalGatedLocalCommandRunnerStatus).toBe("approval-gated-local-command-runner-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.commandRunnerRequirementCount).toBe(15);
    expect(result.commandRunnerFieldCount).toBe(18);
    expect(result.approvedCommandCount).toBe(5);
    expect(result.commandRunnerEvidenceCount).toBe(16);
    expect(result.commandRunnerSignalCount).toBe(26);
    expect(result.safetyGateCount).toBe(900);
    expect(result.appBindingCount).toBe(6);
    expect(result.phase89SandboxWorkspaceReady).toBe(true);
    expect(result.phase88DryRunSimulatorReady).toBe(true);
    expect(result.phase87ScopeLockReady).toBe(true);
    expect(result.phase86ApprovalPacketReady).toBe(true);
    expect(result.phase85RiskClassifierReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.commandExecutionAllowed).toBe(true);
    expect(result.arbitraryCommandExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.powershellExecutionAllowed).toBe(false);
    expect(result.schtasksExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
  });

  it("executes only the approved Phase 90 smoke command and writes a result record", () => {
    const artifactRoot = path.join(process.cwd(), ".sera-approval-gated-local-command-runner-test");
    fs.rmSync(artifactRoot, { recursive: true, force: true });
    const result = runApprovalGatedLocalCommandRunnerDemoV1({ artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.executed).toBe(true);
    expect(result.executedCommandId).toBe("phase90-node-smoke");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SERA_PHASE90_APPROVED_COMMAND_OK");
    expect(fs.existsSync(path.join(artifactRoot, "records", "phase90-approval-gated-local-command-runner-result.json"))).toBe(true);
    expect(result.execution.shellUsed).toBe(false);
    expect(result.execution.selfApprovalAllowed).toBe(false);
  });

  it("blocks command execution when owner approval is missing or self-approved", () => {
    const config = createDefaultApprovalGatedLocalCommandRunnerV1();
    config.approvalRecord.approved = false;
    const missingApproval = runApprovalGatedLocalCommandV1(config, { commandId: "phase90-node-smoke" });
    expect(missingApproval.ok).toBe(false);
    expect(missingApproval.status).toBe("blocked");
    expect(missingApproval.blockers).toContain("Owner approval is required before execution");

    const selfApproved = createDefaultApprovalGatedLocalCommandRunnerV1();
    selfApproved.approvalRecord.selfApproved = true;
    const selfApprovedResult = runApprovalGatedLocalCommandV1(selfApproved, { commandId: "phase90-node-smoke" });
    expect(selfApprovedResult.ok).toBe(false);
    expect(selfApprovedResult.blockers).toContain("Approval record must not be self-approved");
    expect(selfApprovedResult.blockers).toContain("Self-approved command packets are blocked");
  });

  it("blocks commands that do not exactly match the approved catalog", () => {
    const config = createDefaultApprovalGatedLocalCommandRunnerV1();
    config.approvedCommands[0].args = ["-e", "process.exit(2)"];
    const result = runApprovalGatedLocalCommandV1(config, { commandId: "phase90-node-smoke" });
    expect(result.ok).toBe(false);
    expect(result.executed).toBe(false);
    expect(result.blockers).toContain("Command args do not match approved catalog for phase90-node-smoke");
  });

  it("fails closed if shell, PowerShell, schtasks, or workspace escape is introduced", () => {
    const config = createDefaultApprovalGatedLocalCommandRunnerV1();
    config.approvedCommands[0].executable = process.platform === "win32" ? "powershell.exe" : "sh";
    config.approvedCommands[0].shell = true;
    config.boundaries.shellExecutionAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    config.workspaceRoot = path.resolve("..");
    const result = inspectApprovalGatedLocalCommandRunnerV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers.some((item) => item.includes("Forbidden executable is not allowed"))).toBe(true);
    expect(result.blockers).toContain("Command must not use shell: phase90-node-smoke");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
    expect(result.blockers.some((item) => item.includes("Path escapes approved root"))).toBe(true);
  });
});

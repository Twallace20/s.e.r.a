import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDefaultOwnerApprovedMergeRunnerV1,
  inspectOwnerApprovedMergeRunnerV1,
  runOwnerApprovedMergeRunnerV1,
} from "../../scripts/lib/owner-approved-merge-runner-v1.mjs";

function tempRoot(name: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `sera-${name}-`));
}

describe("Phase 99 — Owner-Approved Merge Runner v1", () => {
  it("passes when owner-approved merge runner is app-bound", () => {
    const result = inspectOwnerApprovedMergeRunnerV1(createDefaultOwnerApprovedMergeRunnerV1());
    expect(result.ok).toBe(true);
    expect(result.ownerApprovedMergeRunnerStatus).toBe("owner-approved-merge-runner-ready");
    expect(result.declaredFileCount).toBe(5);
    expect(result.ownerApprovedMergeRunnerRequirementCount).toBe(30);
    expect(result.ownerApprovedMergeRunnerFieldCount).toBe(48);
    expect(result.approvedOwnerMergeRunCount).toBe(4);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.safetyGateCount).toBe(1260);
    expect(result.ownerApprovedMergeRunAllowed).toBe(true);
    expect(result.mergeApprovalPacketReadAllowed).toBe(true);
    expect(result.isolatedMergeWorkspaceWriteAllowed).toBe(true);
    expect(result.mergeResultManifestAllowed).toBe(true);
    expect(result.projectRepoSourceMutationAllowed).toBe(false);
    expect(result.realProjectMergeExecutionAllowed).toBe(false);
    expect(result.gitPushAllowed).toBe(false);
    expect(result.tagCreationAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes isolated merge-result evidence from an approved Phase 98 packet", () => {
    const artifactRoot = tempRoot("phase99-owner-approved-merge-runner");
    const result = runOwnerApprovedMergeRunnerV1(createDefaultOwnerApprovedMergeRunnerV1(), { artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.validationFailedCount).toBe(0);
    expect(result.mergeRunId).toBe("phase99-demo-owner-approved-merge-run");
    expect(result.targetBranch).toBe("work/phase-96-demo-branch-edit-executor");
    expect(result.targetFile).toBe("src/phase96-demo.ts");
    expect(result.isolatedMergePerformed).toBe(true);
    expect(result.realProjectMergePerformed).toBe(false);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(fs.existsSync(result.packetPath)).toBe(true);
    expect(fs.existsSync(result.manifestPath)).toBe(true);
    expect(fs.existsSync(result.mergeResultFile)).toBe(true);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.status).toBe("owner-approved-merge-run-complete");
    expect(packet.isolatedMergePerformed).toBe(true);
    expect(packet.realProjectMergePerformed).toBe(false);
    expect(packet.gitPushUsed).toBe(false);
    expect(packet.tagCreated).toBe(false);
    expect(packet.evidenceManifest.priorPhaseChain).toContain("Phase 98");
  });

  it("blocks missing owner approval, missing final merge approval, and self approval", () => {
    const missingApproval = createDefaultOwnerApprovedMergeRunnerV1({ approvalRecord: { approved: false } });
    const missingResult = inspectOwnerApprovedMergeRunnerV1(missingApproval);
    expect(missingResult.ok).toBe(false);
    expect(missingResult.blockers).toContain("Owner approval record must be approved.");

    const missingFinalApproval = createDefaultOwnerApprovedMergeRunnerV1({ approvalRecord: { finalMergeApproved: false } });
    const missingFinalResult = inspectOwnerApprovedMergeRunnerV1(missingFinalApproval);
    expect(missingFinalResult.ok).toBe(false);
    expect(missingFinalResult.blockers).toContain("Final owner merge approval must be granted before Phase 99 isolated merge run.");

    const selfApproval = createDefaultOwnerApprovedMergeRunnerV1({ approvalRecord: { selfApproved: true } });
    const selfResult = inspectOwnerApprovedMergeRunnerV1(selfApproval);
    expect(selfResult.ok).toBe(false);
    expect(selfResult.blockers).toContain("Self-approval is blocked for owner-approved merge runs.");
  });

  it("does not perform isolated merge when the merge packet is not ready", () => {
    const artifactRoot = tempRoot("phase99-owner-approved-merge-runner-failure");
    const config = createDefaultOwnerApprovedMergeRunnerV1();
    config.approvedOwnerMergeRuns[0].mergeReady = false;
    const result = runOwnerApprovedMergeRunnerV1(config, { artifactRoot });
    expect(result.ok).toBe(false);
    expect(result.isolatedMergePerformed).toBe(false);
    expect(result.realProjectMergePerformed).toBe(false);
    expect(result.validationFailedCount).toBe(1);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.status).toBe("owner-approved-merge-run-not-ready");
    expect(packet.checks.filter((check: { passed: boolean }) => !check.passed).length).toBe(1);
    expect(packet.realProjectMergePerformed).toBe(false);
  });

  it("fails closed when unsafe merge powers or run definitions are introduced", () => {
    const config = createDefaultOwnerApprovedMergeRunnerV1();
    config.owner = "S.E.R.A.";
    config.approvalRecord.selfApproved = true;
    config.approvalRecord.finalMergeApproved = false;
    config.approvedOwnerMergeRuns[0].targetBranch = "main";
    config.approvedOwnerMergeRuns[0].baseRef = "develop";
    config.approvedOwnerMergeRuns[0].mergeApprovalPacketId = "";
    config.approvedOwnerMergeRuns[0].sourceBranchPlanId = "";
    config.approvedOwnerMergeRuns[0].sourceBranchCreationPlanId = "";
    config.approvedOwnerMergeRuns[0].sourceBranchEditPlanId = "";
    config.approvedOwnerMergeRuns[0].sourceValidationSuiteId = "";
    config.approvedOwnerMergeRuns[0].targetFile = "../escape.ts";
    config.approvedOwnerMergeRuns[0].requiredChecks = [];
    config.approvedOwnerMergeRuns[0].mergeStrategy = "real-git-merge";
    config.approvedOwnerMergeRuns[0].rollbackPlan = "";
    config.multiLanguageProductionTargets = config.multiLanguageProductionTargets.filter((language) => language !== "Go");
    config.boundaries.projectRepoSourceMutationAllowed = true;
    config.boundaries.branchWorkspaceMutationAllowed = true;
    config.boundaries.realProjectMergeExecutionAllowed = true;
    config.boundaries.localGitBranchCreationAllowed = true;
    config.boundaries.remoteGitBranchCreationAllowed = true;
    config.boundaries.gitPushAllowed = true;
    config.boundaries.tagCreationAllowed = true;
    config.boundaries.arbitraryCommandAllowed = true;
    config.boundaries.shellExecutionAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    config.boundaries.selfMergeAllowed = true;
    const result = inspectOwnerApprovedMergeRunnerV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Owner must be Tyler Wallace for Phase 99 owner-approved merge runner.");
    expect(result.blockers).toContain("Self-approval is blocked for owner-approved merge runs.");
    expect(result.blockers).toContain("Final owner merge approval must be granted before Phase 99 isolated merge run.");
    expect(result.blockers).toContain("Owner-approved merge run must name mergeApprovalPacketId: phase99-demo-owner-approved-merge-run");
    expect(result.blockers).toContain("Owner-approved merge run target branch must be safe and work/ scoped: phase99-demo-owner-approved-merge-run");
    expect(result.blockers).toContain("Owner-approved merge run base ref must be main: phase99-demo-owner-approved-merge-run");
    expect(result.blockers).toContain("Owner-approved merge run must name sourceValidationSuiteId: phase99-demo-owner-approved-merge-run");
    expect(result.blockers).toContain("Owner-approved merge run target file must be safe and relative: phase99-demo-owner-approved-merge-run");
    expect(result.blockers).toContain("Owner-approved merge run must include required checks: phase99-demo-owner-approved-merge-run");
    expect(result.blockers).toContain("Enabled merge run strategy must be isolated-no-ff-owner-approved: phase99-demo-owner-approved-merge-run");
    expect(result.blockers).toContain("Owner-approved merge run must declare rollbackPlan: phase99-demo-owner-approved-merge-run");
    expect(result.blockers).toContain("Multi-language production doctrine must include 18 useful language targets.");
    expect(result.blockers).toContain("Multi-language production target is missing: Go");
    expect(result.blockers).toContain("projectRepoSourceMutationAllowed must remain false");
    expect(result.blockers).toContain("realProjectMergeExecutionAllowed must remain false");
    expect(result.blockers).toContain("gitPushAllowed must remain false");
    expect(result.blockers).toContain("tagCreationAllowed must remain false");
    expect(result.blockers).toContain("arbitraryCommandAllowed must remain false");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
    expect(result.blockers).toContain("selfMergeAllowed must remain false");
  });
});

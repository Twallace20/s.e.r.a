import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDefaultApprovedBranchEditExecutorV1,
  inspectApprovedBranchEditExecutorV1,
  multiLanguageProductionTargets,
  runApprovedBranchEditExecutorDemoV1,
  runApprovedBranchEditExecutorV1,
} from "../../scripts/lib/approved-branch-edit-executor-v1.mjs";

describe("approved branch edit executor v1", () => {
  it("passes when branch edit execution is owner-approved, exact-plan bound, workspace-contained, validation-bound, and app-bound", () => {
    const result = inspectApprovedBranchEditExecutorV1();
    expect(result.ok).toBe(true);
    expect(result.approvedBranchEditExecutorStatus).toBe("approved-branch-edit-executor-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.branchEditExecutorRequirementCount).toBe(24);
    expect(result.branchEditExecutorFieldCount).toBe(36);
    expect(result.approvedBranchEditPlanCount).toBe(4);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.branchEditExecutorEvidenceCount).toBe(24);
    expect(result.branchEditExecutorSignalCount).toBe(48);
    expect(result.safetyGateCount).toBe(1100);
    expect(result.appBindingCount).toBe(7);
    expect(result.phase95ApprovedBranchCreationGateReady).toBe(true);
    expect(result.phase94ApprovedBranchPlanGeneratorReady).toBe(true);
    expect(result.phase93ApprovedBranchWorkspaceRunnerReady).toBe(true);
    expect(result.phase92ApprovedFilePatchRunnerReady).toBe(true);
    expect(result.phase91ApprovedValidationRunnerReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.exactEditPlanRequired).toBe(true);
    expect(result.safeWorkBranchRequired).toBe(true);
    expect(result.workspaceContainmentRequired).toBe(true);
    expect(result.expectedHashRequired).toBe(true);
    expect(result.expectedOccurrenceRequired).toBe(true);
    expect(result.backupRequired).toBe(true);
    expect(result.validationRequired).toBe(true);
    expect(result.rollbackRequired).toBe(true);
    expect(result.branchEditExecutionAllowed).toBe(true);
    expect(result.branchWorkspaceMutationAllowed).toBe(true);
    expect(result.approvedPatchApplicationAllowed).toBe(true);
    expect(result.projectRepoSourceMutationAllowed).toBe(false);
    expect(result.localGitBranchCreationAllowed).toBe(false);
    expect(result.remoteGitBranchCreationAllowed).toBe(false);
    expect(result.gitPushAllowed).toBe(false);
    expect(result.mergeAllowed).toBe(false);
    expect(result.binaryPatchAllowed).toBe(false);
    expect(result.deleteFileAllowed).toBe(false);
    expect(result.createFileAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
  });

  it("executes an exact approved branch workspace edit with backup, validation, and evidence without mutating project repo source", () => {
    const artifactRoot = path.join(process.cwd(), ".sera-approved-branch-edit-executor-test");
    fs.rmSync(artifactRoot, { recursive: true, force: true });
    const result = runApprovedBranchEditExecutorDemoV1({ artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.status).toBe("edited");
    expect(result.id).toBe("phase96-demo-branch-edit-executor");
    expect(result.targetBranch).toBe("work/phase-96-demo-branch-edit-executor");
    expect(result.targetFile).toBe("src/phase96-demo.ts");
    expect(result.branchWorkspaceMutated).toBe(true);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.localGitBranchCreated).toBe(false);
    expect(result.remoteBranchCreated).toBe(false);
    expect(result.gitPushPerformed).toBe(false);
    expect(result.mergePerformed).toBe(false);
    expect(result.validationPassed).toBe(true);
    expect(result.rolledBack).toBe(false);
    expect(fs.existsSync(result.targetPath)).toBe(true);
    expect(fs.existsSync(result.backupPath)).toBe(true);
    expect(fs.existsSync(result.resultPath)).toBe(true);
    expect(fs.existsSync(result.resultMarkdownPath)).toBe(true);
    expect(fs.readFileSync(result.targetPath, "utf8")).toContain("ready");
    expect(fs.readFileSync(result.backupPath, "utf8")).toContain("pending");
  });

  it("blocks branch edit execution when owner approval is missing, self-approved, or mismatched", () => {
    const artifactRoot = path.join(process.cwd(), ".sera-approved-branch-edit-executor-test");
    const missingApproval = createDefaultApprovedBranchEditExecutorV1();
    missingApproval.approvalRecord.approved = false;
    const missingResult = runApprovedBranchEditExecutorV1(missingApproval, { artifactRoot });
    expect(missingResult.ok).toBe(false);
    expect(missingResult.status).toBe("blocked");
    expect(missingResult.blockers).toContain("Owner approval is required before branch edit execution");

    const selfApproved = createDefaultApprovedBranchEditExecutorV1();
    selfApproved.approvalRecord.selfApproved = true;
    const selfResult = runApprovedBranchEditExecutorV1(selfApproved, { artifactRoot });
    expect(selfResult.ok).toBe(false);
    expect(selfResult.blockers).toContain("Approval record must not be self-approved");
    expect(selfResult.blockers).toContain("Self-approved branch edit execution is blocked");

    const mismatch = createDefaultApprovedBranchEditExecutorV1();
    mismatch.approvalRecord.branchEditPlanId = "missing-branch-edit-plan";
    const mismatchResult = runApprovedBranchEditExecutorV1(mismatch, { artifactRoot });
    expect(mismatchResult.ok).toBe(false);
    expect(mismatchResult.blockers).toContain("Approved branch edit plan was not found in catalog: missing-branch-edit-plan");
  });

  it("rolls back the branch workspace edit when validation fails", () => {
    const artifactRoot = path.join(process.cwd(), ".sera-approved-branch-edit-executor-test-rollback");
    fs.rmSync(artifactRoot, { recursive: true, force: true });
    const result = runApprovedBranchEditExecutorDemoV1({ artifactRoot, forceValidationFailure: true });
    expect(result.ok).toBe(false);
    expect(result.status).toBe("rolled-back");
    expect(result.validationPassed).toBe(false);
    expect(result.rolledBack).toBe(true);
    expect(fs.readFileSync(result.targetPath, "utf8")).toContain("pending");
    expect(fs.readFileSync(result.backupPath, "utf8")).toContain("pending");
  });

  it("fails closed if unsafe branch edits, project source mutation, git power, arbitrary patching, or language-doctrine removal is introduced", () => {
    const config = createDefaultApprovedBranchEditExecutorV1();
    config.approvedBranchEditPlans[0].targetBranch = "../escape";
    config.approvedBranchEditPlans[0].targetFile = "../outside.ts";
    config.approvedBranchEditPlans[0].baseRef = "develop";
    config.approvedBranchEditPlans[0].expectedBeforeSha256 = "bad";
    config.approvedBranchEditPlans[0].expectedOccurrences = 2;
    config.approvedBranchEditPlans[0].branchWorkspaceMutation = false;
    config.approvedBranchEditPlans[0].projectRepoSourceMutation = true;
    config.approvedBranchEditPlans[0].localGitBranchCreation = true;
    config.approvedBranchEditPlans[0].remoteGitBranchCreation = true;
    config.approvedBranchEditPlans[0].gitPush = true;
    config.approvedBranchEditPlans[0].merge = true;
    config.approvedBranchEditPlans[0].binaryPatch = true;
    config.approvedBranchEditPlans[0].deleteFile = true;
    config.approvedBranchEditPlans[0].createFile = true;
    config.multiLanguageProductionTargets = multiLanguageProductionTargets.filter((item) => item.language !== "Swift");
    config.boundaries.projectRepoSourceMutationAllowed = true;
    config.boundaries.localGitBranchCreationAllowed = true;
    config.boundaries.remoteGitBranchCreationAllowed = true;
    config.boundaries.gitPushAllowed = true;
    config.boundaries.mergeAllowed = true;
    config.boundaries.binaryPatchAllowed = true;
    config.boundaries.deleteFileAllowed = true;
    config.boundaries.createFileAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    config.boundaries.selfMergeAllowed = true;
    const result = inspectApprovedBranchEditExecutorV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Branch edit target branch must be safe and work/ scoped: phase96-demo-branch-edit-executor");
    expect(result.blockers).toContain("Branch edit base ref must be main: phase96-demo-branch-edit-executor");
    expect(result.blockers).toContain("Branch edit target file must be safe and relative: phase96-demo-branch-edit-executor");
    expect(result.blockers).toContain("Branch edit expected before SHA-256 mismatch: phase96-demo-branch-edit-executor");
    expect(result.blockers).toContain("Branch edit expected occurrences must be 1 in Phase 96: phase96-demo-branch-edit-executor");
    expect(result.blockers).toContain("Branch workspace mutation must be explicitly allowed for approved branch edit plans: phase96-demo-branch-edit-executor");
    expect(result.blockers).toContain("Project repo source mutation must remain blocked in Phase 96: phase96-demo-branch-edit-executor");
    expect(result.blockers).toContain("Local Git branch creation must remain blocked in Phase 96: phase96-demo-branch-edit-executor");
    expect(result.blockers).toContain("Remote Git branch creation must remain blocked in Phase 96: phase96-demo-branch-edit-executor");
    expect(result.blockers).toContain("Git push must remain blocked in Phase 96: phase96-demo-branch-edit-executor");
    expect(result.blockers).toContain("Merge must remain blocked in Phase 96: phase96-demo-branch-edit-executor");
    expect(result.blockers).toContain("Binary patches must remain blocked in Phase 96: phase96-demo-branch-edit-executor");
    expect(result.blockers).toContain("Delete file must remain blocked in Phase 96: phase96-demo-branch-edit-executor");
    expect(result.blockers).toContain("Create file must remain blocked in Phase 96: phase96-demo-branch-edit-executor");
    expect(result.blockers).toContain("Multi-language production doctrine must include 18 useful language targets");
    expect(result.blockers).toContain("Multi-language production target is missing: Swift");
    expect(result.blockers).toContain("projectRepoSourceMutationAllowed must remain false");
    expect(result.blockers).toContain("localGitBranchCreationAllowed must remain false");
    expect(result.blockers).toContain("remoteGitBranchCreationAllowed must remain false");
    expect(result.blockers).toContain("gitPushAllowed must remain false");
    expect(result.blockers).toContain("mergeAllowed must remain false");
    expect(result.blockers).toContain("binaryPatchAllowed must remain false");
    expect(result.blockers).toContain("deleteFileAllowed must remain false");
    expect(result.blockers).toContain("createFileAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
    expect(result.blockers).toContain("selfMergeAllowed must remain false");
  });
});

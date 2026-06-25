import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDefaultApprovedBranchWorkspaceRunnerV1,
  inspectApprovedBranchWorkspaceRunnerV1,
  revenueAccelerationTrack,
  runApprovedBranchWorkspacePlanV1,
  runApprovedBranchWorkspaceRunnerDemoV1,
  updatedRoadmapTracks,
} from "../../scripts/lib/approved-branch-workspace-runner-v1.mjs";

describe("approved branch workspace runner v1", () => {
  it("passes when the branch workspace runner is owner-approved, exact-plan only, roadmap-bound, and app-bound", () => {
    const result = inspectApprovedBranchWorkspaceRunnerV1();
    expect(result.ok).toBe(true);
    expect(result.approvedBranchWorkspaceRunnerStatus).toBe("approved-branch-workspace-runner-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(6);
    expect(result.branchRunnerRequirementCount).toBe(18);
    expect(result.branchRunnerFieldCount).toBe(23);
    expect(result.approvedBranchPlanCount).toBe(4);
    expect(result.revenueAccelerationPhaseCount).toBe(20);
    expect(result.roadmapTrackCount).toBe(11);
    expect(result.branchRunnerEvidenceCount).toBe(18);
    expect(result.branchRunnerSignalCount).toBe(35);
    expect(result.safetyGateCount).toBe(960);
    expect(result.appBindingCount).toBe(7);
    expect(result.phase92ApprovedFilePatchRunnerReady).toBe(true);
    expect(result.phase91ApprovedValidationRunnerReady).toBe(true);
    expect(result.phase90ApprovalGatedLocalCommandRunnerReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.exactBranchCatalogRequired).toBe(true);
    expect(result.safeBranchNameRequired).toBe(true);
    expect(result.isolatedBranchWorkspaceRequired).toBe(true);
    expect(result.pathContainmentRequired).toBe(true);
    expect(result.approvedPatchPlanRequired).toBe(true);
    expect(result.backupRequired).toBe(true);
    expect(result.rollbackRequired).toBe(true);
    expect(result.validationEvidenceRequired).toBe(true);
    expect(result.revenueAccelerationTrackRequired).toBe(true);
    expect(result.marketplaceComplianceRequired).toBe(true);
    expect(result.branchWorkspaceCreationAllowed).toBe(true);
    expect(result.localGitBranchCreationAllowed).toBe(false);
    expect(result.remoteGitBranchCreationAllowed).toBe(false);
    expect(result.gitPushAllowed).toBe(false);
    expect(result.sourceMutationAllowed).toBe(false);
    expect(result.arbitraryBranchNameAllowed).toBe(false);
    expect(result.arbitraryPatchTextAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
  });

  it("creates the approved branch workspace, applies the contained patch, and records evidence", () => {
    const artifactRoot = path.join(process.cwd(), ".sera-approved-branch-workspace-runner-test");
    fs.rmSync(artifactRoot, { recursive: true, force: true });
    const result = runApprovedBranchWorkspaceRunnerDemoV1({ artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.executed).toBe(true);
    expect(result.applied).toBe(true);
    expect(result.branchWorkspaceCreated).toBe(true);
    expect(result.branchPlanId).toBe("phase93-demo-branch-workspace");
    expect(result.branchName).toBe("work/phase-93-demo-branch-workspace");
    expect(result.localGitBranchCreated).toBe(false);
    expect(result.remoteGitBranchCreated).toBe(false);
    expect(result.pushedToRemote).toBe(false);
    expect(result.mutatesSource).toBe(false);
    expect(result.workspaceContained).toBe(true);
    expect(result.revenueAccelerationTrackIncluded).toBe(true);
    expect(result.revenueAccelerationPhaseCount).toBe(20);
    expect(fs.existsSync(result.recordPath)).toBe(true);
    expect(fs.existsSync(result.backupPath)).toBe(true);
    expect(fs.readFileSync(result.targetPath, "utf8")).toContain("approved-branch-workspace-ready");
    expect(fs.readFileSync(result.targetPath, "utf8")).not.toContain("pending-branch-workspace");
  });

  it("blocks branch workspace execution when owner approval is missing, self-approved, or mismatched", () => {
    const missingApproval = createDefaultApprovedBranchWorkspaceRunnerV1();
    missingApproval.approvalRecord.approved = false;
    const missingApprovalResult = runApprovedBranchWorkspacePlanV1(missingApproval, { artifactRoot: path.join(process.cwd(), ".sera-approved-branch-workspace-runner-test") });
    expect(missingApprovalResult.ok).toBe(false);
    expect(missingApprovalResult.status).toBe("blocked");
    expect(missingApprovalResult.blockers).toContain("Owner approval is required before branch workspace execution");

    const selfApproved = createDefaultApprovedBranchWorkspaceRunnerV1();
    selfApproved.approvalRecord.selfApproved = true;
    const selfApprovedResult = runApprovedBranchWorkspacePlanV1(selfApproved, { artifactRoot: path.join(process.cwd(), ".sera-approved-branch-workspace-runner-test") });
    expect(selfApprovedResult.ok).toBe(false);
    expect(selfApprovedResult.blockers).toContain("Approval record must not be self-approved");
    expect(selfApprovedResult.blockers).toContain("Self-approved branch workspace packets are blocked");

    const mismatch = createDefaultApprovedBranchWorkspaceRunnerV1();
    mismatch.approvalRecord.branchPlanId = "missing-branch-plan";
    const mismatchResult = runApprovedBranchWorkspacePlanV1(mismatch, { artifactRoot: path.join(process.cwd(), ".sera-approved-branch-workspace-runner-test") });
    expect(mismatchResult.ok).toBe(false);
    expect(mismatchResult.blockers).toContain("Approved branch plan was not found in catalog: missing-branch-plan");
  });

  it("rolls back the branch workspace patch when validation fails", () => {
    const artifactRoot = path.join(process.cwd(), ".sera-approved-branch-workspace-runner-test");
    fs.rmSync(artifactRoot, { recursive: true, force: true });
    const result = runApprovedBranchWorkspacePlanV1(createDefaultApprovedBranchWorkspaceRunnerV1(), {
      artifactRoot,
      forceValidationFailure: true,
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe("rolled-back");
    expect(result.rollbackPerformed).toBe(true);
    expect(result.applied).toBe(false);
    expect(fs.existsSync(result.backupPath)).toBe(true);
    expect(fs.readFileSync(result.targetPath, "utf8")).toContain("pending-branch-workspace");
    expect(result.blockers).toContain("Branch workspace validation failed; backup restored");
  });

  it("fails closed if unsafe branch, source mutation, git push, or missing revenue track authority is introduced", () => {
    const config = createDefaultApprovedBranchWorkspaceRunnerV1();
    config.approvedBranchPlans[0].branchName = "../escape";
    config.approvedBranchPlans[0].branchWorkspaceRelativePath = "../outside";
    config.approvedBranchPlans[0].targetRelativePath = "../outside.ts";
    config.approvedBranchPlans[0].localGitBranchCreation = true;
    config.approvedBranchPlans[0].remoteGitBranchCreation = true;
    config.approvedBranchPlans[0].sourceMutation = true;
    config.approvedBranchPlans[0].expectedOccurrences = 0;
    config.revenueAccelerationTrack = revenueAccelerationTrack.slice(0, 19);
    config.boundaries.localGitBranchCreationAllowed = true;
    config.boundaries.remoteGitBranchCreationAllowed = true;
    config.boundaries.gitPushAllowed = true;
    config.boundaries.sourceMutationAllowed = true;
    config.boundaries.arbitraryBranchNameAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    config.boundaries.selfMergeAllowed = true;
    const result = inspectApprovedBranchWorkspaceRunnerV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Branch name must be safe and work/ scoped: phase93-demo-branch-workspace");
    expect(result.blockers).toContain("Branch workspace path must be safe and relative: phase93-demo-branch-workspace");
    expect(result.blockers).toContain("Branch target path must be safe and relative: phase93-demo-branch-workspace");
    expect(result.blockers).toContain("Branch plan must declare a positive expectedOccurrences value: phase93-demo-branch-workspace");
    expect(result.blockers).toContain("Phase 93 branch plans must not create real local Git branches: phase93-demo-branch-workspace");
    expect(result.blockers).toContain("Phase 93 branch plans must not create remote Git branches: phase93-demo-branch-workspace");
    expect(result.blockers).toContain("Phase 93 branch plans must not mutate repository source: phase93-demo-branch-workspace");
    expect(result.blockers).toContain("Revenue Acceleration Track must include phases 101R through 120R");
    expect(result.blockers).toContain("localGitBranchCreationAllowed must remain false");
    expect(result.blockers).toContain("remoteGitBranchCreationAllowed must remain false");
    expect(result.blockers).toContain("gitPushAllowed must remain false");
    expect(result.blockers).toContain("sourceMutationAllowed must remain false");
    expect(result.blockers).toContain("arbitraryBranchNameAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
    expect(result.blockers).toContain("selfMergeAllowed must remain false");
  });

  it("keeps the updated roadmap commercially explicit without replacing the core S.E.R.A. architecture", () => {
    expect(updatedRoadmapTracks).toContain("101R-120R: Revenue Acceleration Track");
    expect(updatedRoadmapTracks).toContain("90-100H: Execution Spine Completion and Phase Factory");
    expect(revenueAccelerationTrack).toHaveLength(20);
    expect(revenueAccelerationTrack.map((item) => item.phase)).toEqual([
      "101R", "102R", "103R", "104R", "105R", "106R", "107R", "108R", "109R", "110R",
      "111R", "112R", "113R", "114R", "115R", "116R", "117R", "118R", "119R", "120R",
    ]);
    expect(revenueAccelerationTrack.find((item) => item.phase === "104R")?.title).toBe("Proof Project Factory");
    expect(revenueAccelerationTrack.find((item) => item.phase === "112R")?.title).toBe("Contract/Policy Packet");
    expect(revenueAccelerationTrack.find((item) => item.phase === "120R")?.title).toBe("Revenue Engine Alpha");
  });
});

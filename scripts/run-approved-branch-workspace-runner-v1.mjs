#!/usr/bin/env node
import { runApprovedBranchWorkspaceRunnerDemoV1 } from "./lib/approved-branch-workspace-runner-v1.mjs";

const result = runApprovedBranchWorkspaceRunnerDemoV1();

if (!result.ok) {
  console.error("S.E.R.A. phase93 approved branch workspace runner v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

const summary = result.inspection;
console.log("S.E.R.A. phase93 approved branch workspace runner v1: PASS");
console.log(`approvedBranchWorkspaceRunnerStatus: ${summary.approvedBranchWorkspaceRunnerStatus}`);
console.log(`validationFailedCount: ${summary.validationFailedCount}`);
console.log(`declaredFileCount: ${summary.declaredFileCount}`);
console.log(`branchRunnerRequirementCount: ${summary.branchRunnerRequirementCount}`);
console.log(`branchRunnerFieldCount: ${summary.branchRunnerFieldCount}`);
console.log(`approvedBranchPlanCount: ${summary.approvedBranchPlanCount}`);
console.log(`revenueAccelerationPhaseCount: ${summary.revenueAccelerationPhaseCount}`);
console.log(`roadmapTrackCount: ${summary.roadmapTrackCount}`);
console.log(`branchRunnerEvidenceCount: ${summary.branchRunnerEvidenceCount}`);
console.log(`branchRunnerSignalCount: ${summary.branchRunnerSignalCount}`);
console.log(`safetyGateCount: ${summary.safetyGateCount}`);
console.log(`appBindingCount: ${summary.appBindingCount}`);
console.log(`branchWorkspaceCreationAllowed: ${summary.branchWorkspaceCreationAllowed}`);
console.log(`localGitBranchCreationAllowed: ${summary.localGitBranchCreationAllowed}`);
console.log(`remoteGitBranchCreationAllowed: ${summary.remoteGitBranchCreationAllowed}`);
console.log(`gitPushAllowed: ${summary.gitPushAllowed}`);
console.log(`sourceMutationAllowed: ${summary.sourceMutationAllowed}`);
console.log(`arbitraryBranchNameAllowed: ${summary.arbitraryBranchNameAllowed}`);
console.log(`arbitraryPatchTextAllowed: ${summary.arbitraryPatchTextAllowed}`);
console.log(`selfApprovalAllowed: ${summary.selfApprovalAllowed}`);
console.log(`selfMergeAllowed: ${summary.selfMergeAllowed}`);
console.log(`selfDeployAllowed: ${summary.selfDeployAllowed}`);
console.log(`executedBranchPlanId: ${result.branchPlanId}`);
console.log(`branchWorkspaceRoot: ${result.branchWorkspaceRoot}`);
console.log(`recordPath: ${result.recordPath}`);
console.log(`revenueAccelerationTrackIncluded: ${result.revenueAccelerationTrackIncluded}`);

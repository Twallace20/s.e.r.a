#!/usr/bin/env node
import { runOwnerApprovedMergeRunnerDemoV1 } from "./lib/owner-approved-merge-runner-v1.mjs";

const result = runOwnerApprovedMergeRunnerDemoV1();

if (!result.ok) {
  console.error("S.E.R.A. phase99 owner-approved merge runner v1: FAIL");
  for (const blocker of result.blockers || []) console.error(`blocker: ${blocker}`);
  process.exit(1);
}

console.log("S.E.R.A. phase99 owner-approved merge runner v1: PASS");
console.log(`ownerApprovedMergeRunnerStatus: ${result.ownerApprovedMergeRunnerStatus}`);
console.log(`validationFailedCount: ${result.validationFailedCount}`);
console.log(`declaredFileCount: ${result.declaredFileCount}`);
console.log(`ownerApprovedMergeRunnerRequirementCount: ${result.ownerApprovedMergeRunnerRequirementCount}`);
console.log(`ownerApprovedMergeRunnerFieldCount: ${result.ownerApprovedMergeRunnerFieldCount}`);
console.log(`approvedOwnerMergeRunCount: ${result.approvedOwnerMergeRunCount}`);
console.log(`multiLanguageProductionTargetCount: ${result.multiLanguageProductionTargetCount}`);
console.log(`safetyGateCount: ${result.safetyGateCount}`);
console.log(`ownerApprovedMergeRunAllowed: ${result.ownerApprovedMergeRunAllowed}`);
console.log(`mergeApprovalPacketReadAllowed: ${result.mergeApprovalPacketReadAllowed}`);
console.log(`isolatedMergeWorkspaceWriteAllowed: ${result.isolatedMergeWorkspaceWriteAllowed}`);
console.log(`mergeResultManifestAllowed: ${result.mergeResultManifestAllowed}`);
console.log(`projectRepoSourceMutationAllowed: ${result.projectRepoSourceMutationAllowed}`);
console.log(`branchWorkspaceMutationAllowed: ${result.branchWorkspaceMutationAllowed}`);
console.log(`realProjectMergeExecutionAllowed: ${result.realProjectMergeExecutionAllowed}`);
console.log(`localGitBranchCreationAllowed: ${result.localGitBranchCreationAllowed}`);
console.log(`remoteGitBranchCreationAllowed: ${result.remoteGitBranchCreationAllowed}`);
console.log(`gitPushAllowed: ${result.gitPushAllowed}`);
console.log(`tagCreationAllowed: ${result.tagCreationAllowed}`);
console.log(`arbitraryCommandAllowed: ${result.arbitraryCommandAllowed}`);
console.log(`shellExecutionAllowed: ${result.shellExecutionAllowed}`);
console.log(`selfApprovalAllowed: ${result.selfApprovalAllowed}`);
console.log(`selfMergeAllowed: ${result.selfMergeAllowed}`);
console.log(`selfDeployAllowed: ${result.selfDeployAllowed}`);
console.log(`mergeRunId: ${result.mergeRunId}`);
console.log(`targetBranch: ${result.targetBranch}`);
console.log(`targetFile: ${result.targetFile}`);
console.log(`isolatedMergePerformed: ${result.isolatedMergePerformed}`);
console.log(`realProjectMergePerformed: ${result.realProjectMergePerformed}`);
console.log(`projectRepoSourceMutated: ${result.projectRepoSourceMutated}`);
console.log(`packetPath: ${result.packetPath}`);
console.log(`manifestPath: ${result.manifestPath}`);

#!/usr/bin/env node
import { runMergeApprovalPacketDemoV1 } from "./lib/merge-approval-packet-v1.mjs";

const result = runMergeApprovalPacketDemoV1();

if (!result.ok) {
  console.error("S.E.R.A. phase98 merge approval packet v1: FAIL");
  for (const blocker of result.blockers || []) console.error(`blocker: ${blocker}`);
  process.exit(1);
}

console.log("S.E.R.A. phase98 merge approval packet v1: PASS");
console.log(`mergeApprovalPacketStatus: ${result.mergeApprovalPacketStatus}`);
console.log(`validationFailedCount: ${result.validationFailedCount}`);
console.log(`declaredFileCount: ${result.declaredFileCount}`);
console.log(`mergeApprovalPacketRequirementCount: ${result.mergeApprovalPacketRequirementCount}`);
console.log(`mergeApprovalPacketFieldCount: ${result.mergeApprovalPacketFieldCount}`);
console.log(`approvedMergeApprovalPacketCount: ${result.approvedMergeApprovalPacketCount}`);
console.log(`multiLanguageProductionTargetCount: ${result.multiLanguageProductionTargetCount}`);
console.log(`safetyGateCount: ${result.safetyGateCount}`);
console.log(`mergeApprovalPacketAllowed: ${result.mergeApprovalPacketAllowed}`);
console.log(`branchValidationEvidenceReadAllowed: ${result.branchValidationEvidenceReadAllowed}`);
console.log(`evidenceWritingAllowed: ${result.evidenceWritingAllowed}`);
console.log(`mergeReadinessChecklistAllowed: ${result.mergeReadinessChecklistAllowed}`);
console.log(`projectRepoSourceMutationAllowed: ${result.projectRepoSourceMutationAllowed}`);
console.log(`branchWorkspaceMutationAllowed: ${result.branchWorkspaceMutationAllowed}`);
console.log(`localGitBranchCreationAllowed: ${result.localGitBranchCreationAllowed}`);
console.log(`remoteGitBranchCreationAllowed: ${result.remoteGitBranchCreationAllowed}`);
console.log(`gitPushAllowed: ${result.gitPushAllowed}`);
console.log(`mergeExecutionAllowed: ${result.mergeExecutionAllowed}`);
console.log(`tagCreationAllowed: ${result.tagCreationAllowed}`);
console.log(`arbitraryCommandAllowed: ${result.arbitraryCommandAllowed}`);
console.log(`shellExecutionAllowed: ${result.shellExecutionAllowed}`);
console.log(`selfApprovalAllowed: ${result.selfApprovalAllowed}`);
console.log(`selfMergeAllowed: ${result.selfMergeAllowed}`);
console.log(`selfDeployAllowed: ${result.selfDeployAllowed}`);
console.log(`mergeApprovalPacketId: ${result.mergeApprovalPacketId}`);
console.log(`targetBranch: ${result.targetBranch}`);
console.log(`targetFile: ${result.targetFile}`);
console.log(`mergeReady: ${result.mergeReady}`);
console.log(`mergeExecutionPerformed: ${result.mergeExecutionPerformed}`);
console.log(`projectRepoSourceMutated: ${result.projectRepoSourceMutated}`);
console.log(`packetPath: ${result.packetPath}`);

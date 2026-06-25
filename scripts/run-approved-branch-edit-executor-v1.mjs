#!/usr/bin/env node
import {
  inspectApprovedBranchEditExecutorV1,
  runApprovedBranchEditExecutorDemoV1,
} from "./lib/approved-branch-edit-executor-v1.mjs";

const inspection = inspectApprovedBranchEditExecutorV1();
if (!inspection.ok) {
  console.error("S.E.R.A. phase96 approved branch edit executor v1: FAIL");
  console.error(JSON.stringify(inspection.blockers, null, 2));
  process.exit(1);
}

const result = runApprovedBranchEditExecutorDemoV1();
if (!result.ok) {
  console.error("S.E.R.A. phase96 approved branch edit executor v1: FAIL");
  console.error(JSON.stringify(result.blockers ?? result, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase96 approved branch edit executor v1: PASS");
console.log(`approvedBranchEditExecutorStatus: ${inspection.approvedBranchEditExecutorStatus}`);
console.log(`validationFailedCount: ${inspection.validationFailedCount}`);
console.log(`declaredFileCount: ${inspection.declaredFileCount}`);
console.log(`branchEditExecutorRequirementCount: ${inspection.branchEditExecutorRequirementCount}`);
console.log(`branchEditExecutorFieldCount: ${inspection.branchEditExecutorFieldCount}`);
console.log(`approvedBranchEditPlanCount: ${inspection.approvedBranchEditPlanCount}`);
console.log(`multiLanguageProductionTargetCount: ${inspection.multiLanguageProductionTargetCount}`);
console.log(`branchEditExecutionAllowed: ${inspection.branchEditExecutionAllowed}`);
console.log(`branchWorkspaceMutationAllowed: ${inspection.branchWorkspaceMutationAllowed}`);
console.log(`approvedPatchApplicationAllowed: ${inspection.approvedPatchApplicationAllowed}`);
console.log(`projectRepoSourceMutationAllowed: ${inspection.projectRepoSourceMutationAllowed}`);
console.log(`localGitBranchCreationAllowed: ${inspection.localGitBranchCreationAllowed}`);
console.log(`remoteGitBranchCreationAllowed: ${inspection.remoteGitBranchCreationAllowed}`);
console.log(`gitPushAllowed: ${inspection.gitPushAllowed}`);
console.log(`mergeAllowed: ${inspection.mergeAllowed}`);
console.log(`binaryPatchAllowed: ${inspection.binaryPatchAllowed}`);
console.log(`deleteFileAllowed: ${inspection.deleteFileAllowed}`);
console.log(`createFileAllowed: ${inspection.createFileAllowed}`);
console.log(`selfApprovalAllowed: ${inspection.selfApprovalAllowed}`);
console.log(`selfMergeAllowed: ${inspection.selfMergeAllowed}`);
console.log(`selfDeployAllowed: ${inspection.selfDeployAllowed}`);
console.log(`branchEditPlanId: ${result.id}`);
console.log(`targetBranch: ${result.targetBranch}`);
console.log(`targetFile: ${result.targetFile}`);
console.log(`validationPassed: ${result.validationPassed}`);
console.log(`projectRepoSourceMutated: ${result.projectRepoSourceMutated}`);
console.log(`multiLanguageProductionDoctrineIncluded: ${result.multiLanguageProductionDoctrineIncluded}`);

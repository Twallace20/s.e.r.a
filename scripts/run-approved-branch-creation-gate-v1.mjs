#!/usr/bin/env node
import {
  inspectApprovedBranchCreationGateV1,
  runApprovedBranchCreationGateDemoV1,
} from "./lib/approved-branch-creation-gate-v1.mjs";

const inspection = inspectApprovedBranchCreationGateV1();
if (!inspection.ok) {
  console.error("S.E.R.A. phase95 approved branch creation gate v1: FAIL");
  console.error(JSON.stringify(inspection.blockers, null, 2));
  process.exit(1);
}

const result = runApprovedBranchCreationGateDemoV1();
if (!result.ok) {
  console.error("S.E.R.A. phase95 approved branch creation gate v1: FAIL");
  console.error(JSON.stringify(result.blockers, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase95 approved branch creation gate v1: PASS");
console.log(`approvedBranchCreationGateStatus: ${inspection.approvedBranchCreationGateStatus}`);
console.log(`validationFailedCount: ${inspection.validationFailedCount}`);
console.log(`declaredFileCount: ${inspection.declaredFileCount}`);
console.log(`branchCreationGateRequirementCount: ${inspection.branchCreationGateRequirementCount}`);
console.log(`branchCreationGateFieldCount: ${inspection.branchCreationGateFieldCount}`);
console.log(`approvedBranchCreationPlanCount: ${inspection.approvedBranchCreationPlanCount}`);
console.log(`multiLanguageProductionTargetCount: ${inspection.multiLanguageProductionTargetCount}`);
console.log(`branchCreationGateAllowed: ${inspection.branchCreationGateAllowed}`);
console.log(`sandboxBranchPracticeAllowed: ${inspection.sandboxBranchPracticeAllowed}`);
console.log(`projectRepoBranchCreationAllowed: ${inspection.projectRepoBranchCreationAllowed}`);
console.log(`localGitBranchCreationAllowed: ${inspection.localGitBranchCreationAllowed}`);
console.log(`remoteGitBranchCreationAllowed: ${inspection.remoteGitBranchCreationAllowed}`);
console.log(`gitPushAllowed: ${inspection.gitPushAllowed}`);
console.log(`patchExecutionAllowed: ${inspection.patchExecutionAllowed}`);
console.log(`sourceMutationAllowed: ${inspection.sourceMutationAllowed}`);
console.log(`selfApprovalAllowed: ${inspection.selfApprovalAllowed}`);
console.log(`selfMergeAllowed: ${inspection.selfMergeAllowed}`);
console.log(`selfDeployAllowed: ${inspection.selfDeployAllowed}`);
console.log(`branchCreationPlanId: ${result.branchCreationPlanId}`);
console.log(`branchName: ${result.branchName}`);
console.log(`multiLanguageProductionDoctrineIncluded: ${result.multiLanguageProductionDoctrineIncluded}`);

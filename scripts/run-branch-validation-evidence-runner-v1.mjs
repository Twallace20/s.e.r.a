#!/usr/bin/env node
import { runBranchValidationEvidenceRunnerDemoV1 } from "./lib/branch-validation-evidence-runner-v1.mjs";

const result = runBranchValidationEvidenceRunnerDemoV1();

if (!result.ok) {
  console.error("S.E.R.A. phase97 branch validation evidence runner v1: FAIL");
  for (const blocker of result.blockers || []) console.error(`blocker: ${blocker}`);
  process.exit(1);
}

console.log("S.E.R.A. phase97 branch validation evidence runner v1: PASS");
console.log(`branchValidationEvidenceRunnerStatus: ${result.branchValidationEvidenceRunnerStatus}`);
console.log(`validationFailedCount: ${result.validationFailedCount}`);
console.log(`declaredFileCount: ${result.declaredFileCount}`);
console.log(`branchValidationEvidenceRequirementCount: ${result.branchValidationEvidenceRequirementCount}`);
console.log(`branchValidationEvidenceFieldCount: ${result.branchValidationEvidenceFieldCount}`);
console.log(`approvedBranchValidationSuiteCount: ${result.approvedBranchValidationSuiteCount}`);
console.log(`multiLanguageProductionTargetCount: ${result.multiLanguageProductionTargetCount}`);
console.log(`safetyGateCount: ${result.safetyGateCount}`);
console.log(`branchValidationEvidenceAllowed: ${result.branchValidationEvidenceAllowed}`);
console.log(`branchWorkspaceReadAllowed: ${result.branchWorkspaceReadAllowed}`);
console.log(`evidenceWritingAllowed: ${result.evidenceWritingAllowed}`);
console.log(`projectRepoSourceMutationAllowed: ${result.projectRepoSourceMutationAllowed}`);
console.log(`branchWorkspaceMutationAllowed: ${result.branchWorkspaceMutationAllowed}`);
console.log(`localGitBranchCreationAllowed: ${result.localGitBranchCreationAllowed}`);
console.log(`remoteGitBranchCreationAllowed: ${result.remoteGitBranchCreationAllowed}`);
console.log(`gitPushAllowed: ${result.gitPushAllowed}`);
console.log(`mergeAllowed: ${result.mergeAllowed}`);
console.log(`arbitraryValidationCommandAllowed: ${result.arbitraryValidationCommandAllowed}`);
console.log(`shellExecutionAllowed: ${result.shellExecutionAllowed}`);
console.log(`selfApprovalAllowed: ${result.selfApprovalAllowed}`);
console.log(`selfMergeAllowed: ${result.selfMergeAllowed}`);
console.log(`selfDeployAllowed: ${result.selfDeployAllowed}`);
console.log(`validationSuiteId: ${result.validationSuiteId}`);
console.log(`targetBranch: ${result.targetBranch}`);
console.log(`targetFile: ${result.targetFile}`);
console.log(`validationPassed: ${result.validationPassed}`);
console.log(`projectRepoSourceMutated: ${result.projectRepoSourceMutated}`);
console.log(`evidencePath: ${result.evidencePath}`);

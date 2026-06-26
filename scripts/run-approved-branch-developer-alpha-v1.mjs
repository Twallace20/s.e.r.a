#!/usr/bin/env node
import {
  createDefaultApprovedBranchDeveloperAlphaV1,
  runApprovedBranchDeveloperAlphaV1,
} from "./lib/approved-branch-developer-alpha-v1.mjs";

const result = runApprovedBranchDeveloperAlphaV1(createDefaultApprovedBranchDeveloperAlphaV1());

if (!result.ok) {
  console.error("S.E.R.A. phase100 approved branch developer alpha v1: FAIL");
  for (const blocker of result.blockers || []) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log("S.E.R.A. phase100 approved branch developer alpha v1: PASS");
console.log(`approvedBranchDeveloperAlphaStatus: approved-branch-developer-alpha-ready`);
console.log(`validationFailedCount: ${result.validationFailedCount}`);
console.log(`declaredFileCount: ${result.declaredFileCount}`);
console.log(`approvedBranchDeveloperAlphaRequirementCount: ${result.approvedBranchDeveloperAlphaRequirementCount}`);
console.log(`approvedBranchDeveloperAlphaFieldCount: ${result.approvedBranchDeveloperAlphaFieldCount}`);
console.log(`branchDeveloperStageCount: ${result.branchDeveloperStageCount}`);
console.log(`approvedBranchDeveloperTaskCount: ${result.approvedBranchDeveloperTaskCount}`);
console.log(`multiLanguageProductionTargetCount: ${result.multiLanguageProductionTargetCount}`);
console.log(`safetyGateCount: ${result.safetyGateCount}`);
console.log(`approvedBranchDeveloperAlphaAllowed: true`);
console.log(`phaseSpineOrchestrationAllowed: true`);
console.log(`branchPlanGenerationAllowed: true`);
console.log(`branchCreationGateAllowed: true`);
console.log(`branchEditExecutionAllowed: true`);
console.log(`branchValidationEvidenceAllowed: true`);
console.log(`mergeApprovalPacketAllowed: true`);
console.log(`ownerApprovedMergeRunAllowed: true`);
console.log(`projectRepoSourceMutationAllowed: false`);
console.log(`realProjectBranchCreationAllowed: false`);
console.log(`realProjectMergeExecutionAllowed: false`);
console.log(`gitPushAllowed: false`);
console.log(`tagCreationAllowed: false`);
console.log(`arbitraryCommandAllowed: false`);
console.log(`shellExecutionAllowed: false`);
console.log(`selfApprovalAllowed: false`);
console.log(`selfMergeAllowed: false`);
console.log(`selfDeployAllowed: false`);
console.log(`branchDeveloperAlphaId: ${result.branchDeveloperAlphaId}`);
console.log(`targetBranch: ${result.targetBranch}`);
console.log(`targetFile: ${result.targetFile}`);
console.log(`targetLanguage: ${result.targetLanguage}`);
console.log(`isolatedAlphaEvidenceProduced: ${result.isolatedAlphaEvidenceProduced}`);
console.log(`realProjectSourceMutated: ${result.realProjectSourceMutated}`);
console.log(`multiLanguageProductionDoctrineIncluded: true`);

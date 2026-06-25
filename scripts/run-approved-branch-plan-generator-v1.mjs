#!/usr/bin/env node
import { runApprovedBranchPlanGeneratorDemoV1 } from "./lib/approved-branch-plan-generator-v1.mjs";

const result = runApprovedBranchPlanGeneratorDemoV1();

if (!result.ok) {
  console.error("S.E.R.A. phase94 approved branch plan generator v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

const summary = result.inspection;
console.log("S.E.R.A. phase94 approved branch plan generator v1: PASS");
console.log(`approvedBranchPlanGeneratorStatus: ${summary.approvedBranchPlanGeneratorStatus}`);
console.log(`validationFailedCount: ${summary.validationFailedCount}`);
console.log(`declaredFileCount: ${summary.declaredFileCount}`);
console.log(`branchPlanGeneratorRequirementCount: ${summary.branchPlanGeneratorRequirementCount}`);
console.log(`branchPlanGeneratorFieldCount: ${summary.branchPlanGeneratorFieldCount}`);
console.log(`approvedPlanGenerationCount: ${summary.approvedPlanGenerationCount}`);
console.log(`sandboxLearningDoctrineStepCount: ${summary.sandboxLearningDoctrineStepCount}`);
console.log(`ambitiousSandboxDomainCount: ${summary.ambitiousSandboxDomainCount}`);
console.log(`revenueAccelerationPhaseCount: ${summary.revenueAccelerationPhaseCount}`);
console.log(`roadmapTrackCount: ${summary.roadmapTrackCount}`);
console.log(`branchPlanGeneratorEvidenceCount: ${summary.branchPlanGeneratorEvidenceCount}`);
console.log(`branchPlanGeneratorSignalCount: ${summary.branchPlanGeneratorSignalCount}`);
console.log(`safetyGateCount: ${summary.safetyGateCount}`);
console.log(`appBindingCount: ${summary.appBindingCount}`);
console.log(`branchPlanGenerationAllowed: ${summary.branchPlanGenerationAllowed}`);
console.log(`localGitBranchCreationAllowed: ${summary.localGitBranchCreationAllowed}`);
console.log(`remoteGitBranchCreationAllowed: ${summary.remoteGitBranchCreationAllowed}`);
console.log(`gitPushAllowed: ${summary.gitPushAllowed}`);
console.log(`patchExecutionAllowed: ${summary.patchExecutionAllowed}`);
console.log(`sourceMutationAllowed: ${summary.sourceMutationAllowed}`);
console.log(`selfApprovalAllowed: ${summary.selfApprovalAllowed}`);
console.log(`selfMergeAllowed: ${summary.selfMergeAllowed}`);
console.log(`selfDeployAllowed: ${summary.selfDeployAllowed}`);
console.log(`generatedPlanId: ${result.generationPlanId}`);
console.log(`planJsonPath: ${result.planJsonPath}`);
console.log(`planMarkdownPath: ${result.planMarkdownPath}`);
console.log(`sandboxLearningDoctrineIncluded: ${result.sandboxLearningDoctrineIncluded}`);

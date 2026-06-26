#!/usr/bin/env node
import { createDefaultPhaseApplyQueueV1, runPhaseApplyQueueV1 } from "./lib/phase-apply-queue-v1.mjs";

const result = runPhaseApplyQueueV1(createDefaultPhaseApplyQueueV1());

if (!result.ok) {
  console.error("S.E.R.A. phase100E phase apply queue v1: FAIL");
  for (const blocker of result.blockers || []) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log("S.E.R.A. phase100E phase apply queue v1: PASS");
console.log(`phaseApplyQueueStatus: ${result.phaseApplyQueueStatus}`);
console.log(`validationFailedCount: ${result.validationFailedCount}`);
console.log(`declaredFileCount: ${result.declaredFileCount}`);
console.log(`phaseApplyQueueRequirementCount: ${result.phaseApplyQueueRequirementCount}`);
console.log(`phaseApplyQueueFieldCount: ${result.phaseApplyQueueFieldCount}`);
console.log(`phaseFactoryStageCount: ${result.phaseFactoryStageCount}`);
console.log(`phaseApplyQueueItemCount: ${result.phaseApplyQueueItemCount}`);
console.log(`roadmapTrackCount: ${result.roadmapTrackCount}`);
console.log(`multiLanguageProductionTargetCount: ${result.multiLanguageProductionTargetCount}`);
console.log(`safetyGateCount: ${result.safetyGateCount}`);
console.log(`phaseApplyQueueAllowed: ${result.phaseApplyQueueAllowed}`);
console.log(`phaseZipValidationEvidenceReadAllowed: ${result.phaseZipValidationEvidenceReadAllowed}`);
console.log(`ownerReviewQueuePacketAllowed: ${result.ownerReviewQueuePacketAllowed}`);
console.log(`manualApplyReviewAllowed: ${result.manualApplyReviewAllowed}`);
console.log(`applyExecutionAllowed: ${result.applyExecutionAllowed}`);
console.log(`patchExecutionAllowed: ${result.patchExecutionAllowed}`);
console.log(`projectRepoSourceMutationAllowed: ${result.projectRepoSourceMutationAllowed}`);
console.log(`realProjectBranchCreationAllowed: ${result.realProjectBranchCreationAllowed}`);
console.log(`realProjectMergeExecutionAllowed: ${result.realProjectMergeExecutionAllowed}`);
console.log(`gitPushAllowed: ${result.gitPushAllowed}`);
console.log(`tagCreationAllowed: ${result.tagCreationAllowed}`);
console.log(`arbitraryCommandAllowed: ${result.arbitraryCommandAllowed}`);
console.log(`shellExecutionAllowed: ${result.shellExecutionAllowed}`);
console.log(`schedulerWorkflowMutationAllowed: ${result.schedulerWorkflowMutationAllowed}`);
console.log(`iPhoneAutomationMutationAllowed: ${result.iPhoneAutomationMutationAllowed}`);
console.log(`fleetExecutionAllowed: ${result.fleetExecutionAllowed}`);
console.log(`awayModeExecutionAllowed: ${result.awayModeExecutionAllowed}`);
console.log(`selfApprovalAllowed: ${result.selfApprovalAllowed}`);
console.log(`selfMergeAllowed: ${result.selfMergeAllowed}`);
console.log(`selfDeployAllowed: ${result.selfDeployAllowed}`);
console.log(`productionDeploymentAllowed: ${result.productionDeploymentAllowed}`);
console.log(`phaseApplyQueueId: ${result.phaseApplyQueueId}`);
console.log(`sourceZipValidatorId: ${result.sourceZipValidatorId}`);
console.log(`phase100DPhaseZipValidatorReady: ${result.phase100DPhaseZipValidatorReady}`);
console.log(`applyQueuePacketProduced: ${result.applyQueuePacketProduced}`);
console.log(`queueManifestProduced: ${result.queueManifestProduced}`);
console.log(`ownerReviewManifestProduced: ${result.ownerReviewManifestProduced}`);
console.log(`readyForOwnerReview: ${result.readyForOwnerReview}`);
console.log(`projectRepoSourceMutated: ${result.projectRepoSourceMutated}`);
console.log(`applyExecuted: ${result.applyExecuted}`);
console.log(`patchExecuted: ${result.patchExecuted}`);
console.log(`realProjectBranchCreated: ${result.realProjectBranchCreated}`);
console.log(`realProjectMergePerformed: ${result.realProjectMergePerformed}`);
console.log(`multiLanguageProductionDoctrineIncluded: ${result.multiLanguageProductionTargetCount === 18}`);

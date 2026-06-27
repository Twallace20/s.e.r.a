#!/usr/bin/env node
import { createDefaultPhaseFactoryAlphaV1, runPhaseFactoryAlphaV1 } from "./lib/phase-factory-alpha-v1.mjs";

const result = runPhaseFactoryAlphaV1(createDefaultPhaseFactoryAlphaV1());

if (!result.ok) {
  console.error("S.E.R.A. phase100H phase factory alpha v1: FAIL");
  for (const blocker of result.blockers || []) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log("S.E.R.A. phase100H phase factory alpha v1: PASS");
console.log(`phaseFactoryAlphaStatus: ${result.phaseFactoryAlphaStatus}`);
console.log(`validationFailedCount: ${result.validationFailedCount}`);
console.log(`declaredFileCount: ${result.declaredFileCount}`);
console.log(`phaseFactoryAlphaRequirementCount: ${result.phaseFactoryAlphaRequirementCount}`);
console.log(`phaseFactoryAlphaFieldCount: ${result.phaseFactoryAlphaFieldCount}`);
console.log(`phaseFactoryStageCount: ${result.phaseFactoryStageCount}`);
console.log(`phaseFactoryIntegrationCount: ${result.phaseFactoryIntegrationCount}`);
console.log(`roadmapTrackCount: ${result.roadmapTrackCount}`);
console.log(`multiLanguageProductionTargetCount: ${result.multiLanguageProductionTargetCount}`);
console.log(`safetyGateCount: ${result.safetyGateCount}`);
console.log(`phaseFactoryAlphaAllowed: ${result.phaseFactoryAlphaAllowed}`);
console.log(`phaseBacklogReadAllowed: ${result.phaseBacklogReadAllowed}`);
console.log(`phaseSpecReadAllowed: ${result.phaseSpecReadAllowed}`);
console.log(`phaseOverlayManifestReadAllowed: ${result.phaseOverlayManifestReadAllowed}`);
console.log(`phaseZipValidationReadAllowed: ${result.phaseZipValidationReadAllowed}`);
console.log(`phaseApplyQueueReadAllowed: ${result.phaseApplyQueueReadAllowed}`);
console.log(`phaseTroubleshootingReadAllowed: ${result.phaseTroubleshootingReadAllowed}`);
console.log(`phaseEvidencePackReadAllowed: ${result.phaseEvidencePackReadAllowed}`);
console.log(`ownerReviewAlphaPacketAllowed: ${result.ownerReviewAlphaPacketAllowed}`);
console.log(`autoRunFuturePhasesAllowed: ${result.autoRunFuturePhasesAllowed}`);
console.log(`autoFixAllowed: ${result.autoFixAllowed}`);
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
console.log(`phaseFactoryAlphaId: ${result.phaseFactoryAlphaId}`);
console.log(`sourceEvidencePackId: ${result.sourceEvidencePackId}`);
console.log(`phase100GPhaseEvidencePackReady: ${result.phase100GPhaseEvidencePackReady}`);
console.log(`phaseFactoryAlphaIntegrated: ${result.phaseFactoryAlphaIntegrated}`);
console.log(`alphaManifestProduced: ${result.alphaManifestProduced}`);
console.log(`ownerReviewManifestProduced: ${result.ownerReviewManifestProduced}`);
console.log(`readyForOwnerReview: ${result.readyForOwnerReview}`);
console.log(`projectRepoSourceMutated: ${result.projectRepoSourceMutated}`);
console.log(`futurePhaseAutoRunExecuted: ${result.futurePhaseAutoRunExecuted}`);
console.log(`autoFixExecuted: ${result.autoFixExecuted}`);
console.log(`applyExecuted: ${result.applyExecuted}`);
console.log(`patchExecuted: ${result.patchExecuted}`);
console.log(`realProjectBranchCreated: ${result.realProjectBranchCreated}`);
console.log(`realProjectMergePerformed: ${result.realProjectMergePerformed}`);
console.log(`multiLanguageProductionDoctrineIncluded: ${result.multiLanguageProductionTargetCount === 18}`);

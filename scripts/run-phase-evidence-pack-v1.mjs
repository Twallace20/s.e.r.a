#!/usr/bin/env node
import { createDefaultPhaseEvidencePackV1, runPhaseEvidencePackV1 } from "./lib/phase-evidence-pack-v1.mjs";

const result = runPhaseEvidencePackV1(createDefaultPhaseEvidencePackV1());

if (!result.ok) {
  console.error("S.E.R.A. phase100G phase evidence pack v1: FAIL");
  for (const blocker of result.blockers || []) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log("S.E.R.A. phase100G phase evidence pack v1: PASS");
console.log(`phaseEvidencePackStatus: ${result.phaseEvidencePackStatus}`);
console.log(`validationFailedCount: ${result.validationFailedCount}`);
console.log(`declaredFileCount: ${result.declaredFileCount}`);
console.log(`phaseEvidencePackRequirementCount: ${result.phaseEvidencePackRequirementCount}`);
console.log(`phaseEvidencePackFieldCount: ${result.phaseEvidencePackFieldCount}`);
console.log(`phaseFactoryStageCount: ${result.phaseFactoryStageCount}`);
console.log(`phaseEvidencePackItemCount: ${result.phaseEvidencePackItemCount}`);
console.log(`roadmapTrackCount: ${result.roadmapTrackCount}`);
console.log(`multiLanguageProductionTargetCount: ${result.multiLanguageProductionTargetCount}`);
console.log(`safetyGateCount: ${result.safetyGateCount}`);
console.log(`phaseEvidencePackAllowed: ${result.phaseEvidencePackAllowed}`);
console.log(`phaseTroubleshootingEvidenceReadAllowed: ${result.phaseTroubleshootingEvidenceReadAllowed}`);
console.log(`phaseEvidenceBundleAllowed: ${result.phaseEvidenceBundleAllowed}`);
console.log(`ownerReviewEvidencePackAllowed: ${result.ownerReviewEvidencePackAllowed}`);
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
console.log(`phaseEvidencePackId: ${result.phaseEvidencePackId}`);
console.log(`sourceTroubleshootingId: ${result.sourceTroubleshootingId}`);
console.log(`phase100FPhaseTroubleshootingReady: ${result.phase100FPhaseTroubleshootingReady}`);
console.log(`evidencePackProduced: ${result.evidencePackProduced}`);
console.log(`evidenceManifestProduced: ${result.evidenceManifestProduced}`);
console.log(`ownerReviewManifestProduced: ${result.ownerReviewManifestProduced}`);
console.log(`readyForOwnerReview: ${result.readyForOwnerReview}`);
console.log(`projectRepoSourceMutated: ${result.projectRepoSourceMutated}`);
console.log(`autoFixExecuted: ${result.autoFixExecuted}`);
console.log(`applyExecuted: ${result.applyExecuted}`);
console.log(`patchExecuted: ${result.patchExecuted}`);
console.log(`realProjectBranchCreated: ${result.realProjectBranchCreated}`);
console.log(`realProjectMergePerformed: ${result.realProjectMergePerformed}`);
console.log(`multiLanguageProductionDoctrineIncluded: ${result.multiLanguageProductionTargetCount === 18}`);

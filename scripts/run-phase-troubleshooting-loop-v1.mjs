#!/usr/bin/env node
import { createDefaultPhaseTroubleshootingLoopV1, runPhaseTroubleshootingLoopV1 } from "./lib/phase-troubleshooting-loop-v1.mjs";

const result = runPhaseTroubleshootingLoopV1(createDefaultPhaseTroubleshootingLoopV1());

if (!result.ok) {
  console.error("S.E.R.A. phase100F phase troubleshooting loop v1: FAIL");
  for (const blocker of result.blockers || []) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log("S.E.R.A. phase100F phase troubleshooting loop v1: PASS");
console.log(`phaseTroubleshootingStatus: ${result.phaseTroubleshootingStatus}`);
console.log(`validationFailedCount: ${result.validationFailedCount}`);
console.log(`declaredFileCount: ${result.declaredFileCount}`);
console.log(`phaseTroubleshootingRequirementCount: ${result.phaseTroubleshootingRequirementCount}`);
console.log(`phaseTroubleshootingFieldCount: ${result.phaseTroubleshootingFieldCount}`);
console.log(`phaseFactoryStageCount: ${result.phaseFactoryStageCount}`);
console.log(`troubleshootingCaseCount: ${result.troubleshootingCaseCount}`);
console.log(`roadmapTrackCount: ${result.roadmapTrackCount}`);
console.log(`multiLanguageProductionTargetCount: ${result.multiLanguageProductionTargetCount}`);
console.log(`safetyGateCount: ${result.safetyGateCount}`);
console.log(`phaseTroubleshootingAllowed: ${result.phaseTroubleshootingAllowed}`);
console.log(`phaseApplyQueueReadAllowed: ${result.phaseApplyQueueReadAllowed}`);
console.log(`diagnosticEvidencePacketAllowed: ${result.diagnosticEvidencePacketAllowed}`);
console.log(`repairGuidanceAllowed: ${result.repairGuidanceAllowed}`);
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
console.log(`phaseTroubleshootingId: ${result.phaseTroubleshootingId}`);
console.log(`sourceApplyQueueId: ${result.sourceApplyQueueId}`);
console.log(`phase100EPhaseApplyQueueReady: ${result.phase100EPhaseApplyQueueReady}`);
console.log(`troubleshootingPacketProduced: ${result.troubleshootingPacketProduced}`);
console.log(`diagnosticManifestProduced: ${result.diagnosticManifestProduced}`);
console.log(`repairGuidanceManifestProduced: ${result.repairGuidanceManifestProduced}`);
console.log(`readyForOwnerReview: ${result.readyForOwnerReview}`);
console.log(`projectRepoSourceMutated: ${result.projectRepoSourceMutated}`);
console.log(`autoFixExecuted: ${result.autoFixExecuted}`);
console.log(`applyExecuted: ${result.applyExecuted}`);
console.log(`patchExecuted: ${result.patchExecuted}`);
console.log(`realProjectBranchCreated: ${result.realProjectBranchCreated}`);
console.log(`realProjectMergePerformed: ${result.realProjectMergePerformed}`);
console.log(`multiLanguageProductionDoctrineIncluded: ${result.multiLanguageProductionTargetCount === 18}`);

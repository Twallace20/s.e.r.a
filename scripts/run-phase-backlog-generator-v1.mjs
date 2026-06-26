#!/usr/bin/env node
import { createDefaultPhaseBacklogGeneratorV1, runPhaseBacklogGeneratorV1 } from "./lib/phase-backlog-generator-v1.mjs";

const result = runPhaseBacklogGeneratorV1(createDefaultPhaseBacklogGeneratorV1());

console.log("S.E.R.A. phase100A phase backlog generator v1: PASS");
console.log(`phaseBacklogGeneratorStatus: ${result.phaseBacklogGeneratorStatus}`);
console.log(`validationFailedCount: ${result.validationFailedCount}`);
console.log(`declaredFileCount: ${result.declaredFileCount}`);
console.log(`phaseBacklogRequirementCount: ${result.phaseBacklogRequirementCount}`);
console.log(`phaseBacklogFieldCount: ${result.phaseBacklogFieldCount}`);
console.log(`phaseFactoryStageCount: ${result.phaseFactoryStageCount}`);
console.log(`phaseBacklogItemCount: ${result.phaseBacklogItemCount}`);
console.log(`roadmapTrackCount: ${result.roadmapTrackCount}`);
console.log(`multiLanguageProductionTargetCount: ${result.multiLanguageProductionTargetCount}`);
console.log(`safetyGateCount: ${result.safetyGateCount}`);
console.log(`phaseBacklogGenerationAllowed: ${result.phaseBacklogGenerationAllowed}`);
console.log(`ownerReviewBacklogPacketAllowed: ${result.ownerReviewBacklogPacketAllowed}`);
console.log(`phaseSpecGenerationAllowed: ${result.phaseSpecGenerationAllowed}`);
console.log(`overlayZipBuildAllowed: ${result.overlayZipBuildAllowed}`);
console.log(`patchExecutionAllowed: ${result.patchExecutionAllowed}`);
console.log(`projectRepoSourceMutationAllowed: ${result.projectRepoSourceMutationAllowed}`);
console.log(`realProjectBranchCreationAllowed: ${result.realProjectBranchCreationAllowed}`);
console.log(`realProjectMergeExecutionAllowed: ${result.realProjectMergeExecutionAllowed}`);
console.log(`gitPushAllowed: ${result.gitPushAllowed}`);
console.log(`tagCreationAllowed: ${result.tagCreationAllowed}`);
console.log(`arbitraryCommandAllowed: ${result.arbitraryCommandAllowed}`);
console.log(`shellExecutionAllowed: ${result.shellExecutionAllowed}`);
console.log(`selfApprovalAllowed: ${result.selfApprovalAllowed}`);
console.log(`selfMergeAllowed: ${result.selfMergeAllowed}`);
console.log(`selfDeployAllowed: ${result.selfDeployAllowed}`);
console.log(`phaseBacklogId: ${result.phaseBacklogId}`);
console.log(`backlogPacketProduced: ${result.backlogPacketProduced}`);
console.log(`projectRepoSourceMutated: ${result.projectRepoSourceMutated}`);
console.log(`multiLanguageProductionDoctrineIncluded: ${result.multiLanguageProductionDoctrineIncluded}`);

if (!result.ok) {
  console.error(JSON.stringify(result.blockers, null, 2));
  process.exit(1);
}

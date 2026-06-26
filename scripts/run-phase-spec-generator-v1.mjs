#!/usr/bin/env node
import { createDefaultPhaseSpecGeneratorV1, runPhaseSpecGeneratorV1 } from "./lib/phase-spec-generator-v1.mjs";

const result = runPhaseSpecGeneratorV1(createDefaultPhaseSpecGeneratorV1());
const lines = [
  `S.E.R.A. phase100B phase spec generator v1: ${result.ok ? "PASS" : "FAIL"}`,
  `phaseSpecGeneratorStatus: ${result.phaseSpecGeneratorStatus}`,
  `validationFailedCount: ${result.validationFailedCount}`,
  `declaredFileCount: ${result.declaredFileCount}`,
  `phaseSpecRequirementCount: ${result.phaseSpecRequirementCount}`,
  `phaseSpecFieldCount: ${result.phaseSpecFieldCount}`,
  `phaseFactoryStageCount: ${result.phaseFactoryStageCount}`,
  `phaseSpecCount: ${result.phaseSpecCount}`,
  `roadmapTrackCount: ${result.roadmapTrackCount}`,
  `multiLanguageProductionTargetCount: ${result.multiLanguageProductionTargetCount}`,
  `safetyGateCount: ${result.safetyGateCount}`,
  `phaseSpecGenerationAllowed: ${result.phaseSpecGenerationAllowed}`,
  `phaseBacklogPacketReadAllowed: ${result.phaseBacklogPacketReadAllowed}`,
  `ownerReviewSpecPacketAllowed: ${result.ownerReviewSpecPacketAllowed}`,
  `overlayZipBuildAllowed: ${result.overlayZipBuildAllowed}`,
  `patchExecutionAllowed: ${result.patchExecutionAllowed}`,
  `projectRepoSourceMutationAllowed: ${result.projectRepoSourceMutationAllowed}`,
  `realProjectBranchCreationAllowed: ${result.realProjectBranchCreationAllowed}`,
  `realProjectMergeExecutionAllowed: ${result.realProjectMergeExecutionAllowed}`,
  `gitPushAllowed: ${result.gitPushAllowed}`,
  `tagCreationAllowed: ${result.tagCreationAllowed}`,
  `arbitraryCommandAllowed: ${result.arbitraryCommandAllowed}`,
  `shellExecutionAllowed: ${result.shellExecutionAllowed}`,
  `selfApprovalAllowed: ${result.selfApprovalAllowed}`,
  `selfMergeAllowed: ${result.selfMergeAllowed}`,
  `selfDeployAllowed: ${result.selfDeployAllowed}`,
  `phaseSpecId: ${result.phaseSpecId}`,
  `sourceBacklogId: ${result.sourceBacklogId}`,
  `specPacketProduced: ${result.specPacketProduced}`,
  `projectRepoSourceMutated: ${result.projectRepoSourceMutated}`,
  `overlayZipBuilt: ${result.overlayZipBuilt}`,
  `multiLanguageProductionDoctrineIncluded: ${result.multiLanguageProductionDoctrineIncluded}`,
];
console.log(lines.join("\n"));
if (!result.ok) {
  console.error(result.blockers.join("\n"));
  process.exit(1);
}

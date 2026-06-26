#!/usr/bin/env node
import { createDefaultPhaseOverlayZipBuilderV1, runPhaseOverlayZipBuilderV1 } from "./lib/phase-overlay-zip-builder-v1.mjs";

const result = runPhaseOverlayZipBuilderV1(createDefaultPhaseOverlayZipBuilderV1());

if (!result.ok) {
  console.error("S.E.R.A. phase100C phase overlay ZIP builder v1: FAIL");
  for (const blocker of result.blockers || []) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log("S.E.R.A. phase100C phase overlay ZIP builder v1: PASS");
console.log(`phaseOverlayZipBuilderStatus: ${result.phaseOverlayZipBuilderStatus}`);
console.log(`validationFailedCount: ${result.validationFailedCount}`);
console.log(`declaredFileCount: ${result.declaredFileCount}`);
console.log(`phaseOverlayZipRequirementCount: ${result.phaseOverlayZipRequirementCount}`);
console.log(`phaseOverlayZipFieldCount: ${result.phaseOverlayZipFieldCount}`);
console.log(`phaseFactoryStageCount: ${result.phaseFactoryStageCount}`);
console.log(`phaseOverlayPackageCount: ${result.phaseOverlayPackageCount}`);
console.log(`roadmapTrackCount: ${result.roadmapTrackCount}`);
console.log(`multiLanguageProductionTargetCount: ${result.multiLanguageProductionTargetCount}`);
console.log(`safetyGateCount: ${result.safetyGateCount}`);
console.log(`phaseOverlayZipBuildAllowed: ${result.phaseOverlayZipBuildAllowed}`);
console.log(`phaseSpecPacketReadAllowed: ${result.phaseSpecPacketReadAllowed}`);
console.log(`ownerReviewOverlayPackageAllowed: ${result.ownerReviewOverlayPackageAllowed}`);
console.log(`overlayPackageManifestAllowed: ${result.overlayPackageManifestAllowed}`);
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
console.log(`productionDeploymentAllowed: ${result.productionDeploymentAllowed}`);
console.log(`phaseOverlayZipId: ${result.phaseOverlayZipId}`);
console.log(`sourceSpecId: ${result.sourceSpecId}`);
console.log(`specPacketRead: ${result.specPacketRead}`);
console.log(`overlayZipBuilt: ${result.overlayZipBuilt}`);
console.log(`overlayPackageManifestProduced: ${result.overlayPackageManifestProduced}`);
console.log(`projectRepoSourceMutated: ${result.projectRepoSourceMutated}`);
console.log(`realProjectBranchCreated: ${result.realProjectBranchCreated}`);
console.log(`realProjectMergePerformed: ${result.realProjectMergePerformed}`);
console.log(`multiLanguageProductionDoctrineIncluded: ${result.multiLanguageProductionTargetCount === 18}`);

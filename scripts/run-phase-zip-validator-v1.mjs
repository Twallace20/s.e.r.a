#!/usr/bin/env node
import { createDefaultPhaseZipValidatorV1, runPhaseZipValidatorV1 } from "./lib/phase-zip-validator-v1.mjs";

const result = runPhaseZipValidatorV1(createDefaultPhaseZipValidatorV1());

if (!result.ok) {
  console.error("S.E.R.A. phase100D phase ZIP validator v1: FAIL");
  for (const blocker of result.blockers || []) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log("S.E.R.A. phase100D phase ZIP validator v1: PASS");
console.log(`phaseZipValidatorStatus: ${result.phaseZipValidatorStatus}`);
console.log(`validationFailedCount: ${result.validationFailedCount}`);
console.log(`declaredFileCount: ${result.declaredFileCount}`);
console.log(`phaseZipValidatorRequirementCount: ${result.phaseZipValidatorRequirementCount}`);
console.log(`phaseZipValidatorFieldCount: ${result.phaseZipValidatorFieldCount}`);
console.log(`phaseFactoryStageCount: ${result.phaseFactoryStageCount}`);
console.log(`phaseZipValidationPackageCount: ${result.phaseZipValidationPackageCount}`);
console.log(`roadmapTrackCount: ${result.roadmapTrackCount}`);
console.log(`multiLanguageProductionTargetCount: ${result.multiLanguageProductionTargetCount}`);
console.log(`safetyGateCount: ${result.safetyGateCount}`);
console.log(`phaseZipValidationAllowed: ${result.phaseZipValidationAllowed}`);
console.log(`phaseOverlayPackageManifestReadAllowed: ${result.phaseOverlayPackageManifestReadAllowed}`);
console.log(`validationEvidencePacketAllowed: ${result.validationEvidencePacketAllowed}`);
console.log(`checksumManifestAllowed: ${result.checksumManifestAllowed}`);
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
console.log(`productionDeploymentAllowed: ${result.productionDeploymentAllowed}`);
console.log(`phaseZipValidatorId: ${result.phaseZipValidatorId}`);
console.log(`sourceOverlayZipId: ${result.sourceOverlayZipId}`);
console.log(`overlayPackageManifestRead: ${result.overlayPackageManifestRead}`);
console.log(`validationEvidencePacketProduced: ${result.validationEvidencePacketProduced}`);
console.log(`checksumManifestProduced: ${result.checksumManifestProduced}`);
console.log(`invalidPackageQuarantined: ${result.invalidPackageQuarantined}`);
console.log(`projectRepoSourceMutated: ${result.projectRepoSourceMutated}`);
console.log(`overlayZipBuilt: ${result.overlayZipBuilt}`);
console.log(`realProjectBranchCreated: ${result.realProjectBranchCreated}`);
console.log(`realProjectMergePerformed: ${result.realProjectMergePerformed}`);
console.log(`multiLanguageProductionDoctrineIncluded: ${result.multiLanguageProductionTargetCount === 18}`);

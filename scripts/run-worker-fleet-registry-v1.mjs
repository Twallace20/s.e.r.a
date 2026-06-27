#!/usr/bin/env node
import { createDefaultWorkerFleetRegistryV1, runWorkerFleetRegistryV1 } from "./lib/worker-fleet-registry-v1.mjs";

const result = runWorkerFleetRegistryV1(createDefaultWorkerFleetRegistryV1());

if (!result.ok) {
  console.error("S.E.R.A. phase101 worker fleet registry v1: FAIL");
  for (const blocker of result.blockers || []) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log("S.E.R.A. phase101 worker fleet registry v1: PASS");
console.log(`workerFleetRegistryStatus: ${result.workerFleetRegistryStatus}`);
console.log(`validationFailedCount: ${result.validationFailedCount}`);
console.log(`declaredFileCount: ${result.declaredFileCount}`);
console.log(`workerFleetRegistryRequirementCount: ${result.workerFleetRegistryRequirementCount}`);
console.log(`workerFleetRegistryFieldCount: ${result.workerFleetRegistryFieldCount}`);
console.log(`workerFleetLaneCount: ${result.workerFleetLaneCount}`);
console.log(`workerDefinitionCount: ${result.workerDefinitionCount}`);
console.log(`roadmapTrackCount: ${result.roadmapTrackCount}`);
console.log(`multiLanguageProductionTargetCount: ${result.multiLanguageProductionTargetCount}`);
console.log(`safetyGateCount: ${result.safetyGateCount}`);
console.log(`workerFleetRegistryAllowed: ${result.workerFleetRegistryAllowed}`);
console.log(`phaseFactoryAlphaReadAllowed: ${result.phaseFactoryAlphaReadAllowed}`);
console.log(`workerDefinitionCatalogAllowed: ${result.workerDefinitionCatalogAllowed}`);
console.log(`ownerReviewFleetPacketAllowed: ${result.ownerReviewFleetPacketAllowed}`);
console.log(`workerExecutionAllowed: ${result.workerExecutionAllowed}`);
console.log(`workerSpawningAllowed: ${result.workerSpawningAllowed}`);
console.log(`autonomousDelegationAllowed: ${result.autonomousDelegationAllowed}`);
console.log(`schedulerWorkflowMutationAllowed: ${result.schedulerWorkflowMutationAllowed}`);
console.log(`iPhoneAutomationMutationAllowed: ${result.iPhoneAutomationMutationAllowed}`);
console.log(`awayModeExecutionAllowed: ${result.awayModeExecutionAllowed}`);
console.log(`fleetExecutionAllowed: ${result.fleetExecutionAllowed}`);
console.log(`applyExecutionAllowed: ${result.applyExecutionAllowed}`);
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
console.log(`workerFleetRegistryId: ${result.workerFleetRegistryId}`);
console.log(`sourcePhaseFactoryAlphaId: ${result.sourcePhaseFactoryAlphaId}`);
console.log(`phase100HPhaseFactoryAlphaReady: ${result.phase100HPhaseFactoryAlphaReady}`);
console.log(`registryPacketProduced: ${result.registryPacketProduced}`);
console.log(`workerDefinitionCatalogProduced: ${result.workerDefinitionCatalogProduced}`);
console.log(`ownerReviewManifestProduced: ${result.ownerReviewManifestProduced}`);
console.log(`readyForOwnerReview: ${result.readyForOwnerReview}`);
console.log(`projectRepoSourceMutated: ${result.projectRepoSourceMutated}`);
console.log(`workerExecuted: ${result.workerExecuted}`);
console.log(`workerSpawned: ${result.workerSpawned}`);
console.log(`autonomousDelegationExecuted: ${result.autonomousDelegationExecuted}`);
console.log(`schedulerWorkflowMutated: ${result.schedulerWorkflowMutated}`);
console.log(`iPhoneAutomationMutated: ${result.iPhoneAutomationMutated}`);
console.log(`awayModeExecuted: ${result.awayModeExecuted}`);
console.log(`fleetExecuted: ${result.fleetExecuted}`);
console.log(`applyExecuted: ${result.applyExecuted}`);
console.log(`patchExecuted: ${result.patchExecuted}`);
console.log(`realProjectBranchCreated: ${result.realProjectBranchCreated}`);
console.log(`realProjectMergePerformed: ${result.realProjectMergePerformed}`);
console.log(`multiLanguageProductionDoctrineIncluded: ${result.multiLanguageProductionTargetCount === 18}`);

#!/usr/bin/env node
import { createDefaultWorkerActivationTokenDraftV1, runWorkerActivationTokenDraftV1 } from "./lib/worker-activation-token-draft-v1.mjs";

const result = runWorkerActivationTokenDraftV1(createDefaultWorkerActivationTokenDraftV1());

if (!result.ok) {
  console.error("S.E.R.A. phase106 worker activation token draft v1: FAIL");
  for (const blocker of result.blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log("S.E.R.A. phase106 worker activation token draft v1: PASS");
const keys = [
  "workerActivationTokenDraftStatus", "validationFailedCount", "declaredFileCount", "workerActivationTokenDraftRequirementCount", "workerActivationTokenDraftFieldCount",
  "activationTokenDraftCount", "ownerTokenDecisionDraftCount", "tokenPolicyDraftCount", "tokenAuditDraftCount", "activationTokenDenialRecordCount",
  "roadmapTrackCount", "multiLanguageProductionTargetCount", "safetyGateCount", "workerActivationTokenDraftAllowed", "workerActivationDecisionRecordReadAllowed",
  "activationTokenDraftManifestAllowed", "ownerReviewTokenDraftPacketAllowed", "ownerTokenDecisionDraftAllowed", "tokenPolicyDraftAllowed", "tokenDenialRecordAllowed",
  "activationTokenIssuanceAllowed", "activationCredentialIssuanceAllowed", "tokenMaterialGenerationAllowed", "secretMaterialGenerationAllowed", "workerActivationAllowed",
  "workerExecutionAllowed", "workerSpawningAllowed", "autonomousDelegationAllowed", "schedulerWorkflowMutationAllowed", "iPhoneAutomationMutationAllowed", "awayModeExecutionAllowed",
  "fleetExecutionAllowed", "applyExecutionAllowed", "patchExecutionAllowed", "projectRepoSourceMutationAllowed", "realProjectBranchCreationAllowed", "realProjectMergeExecutionAllowed",
  "gitPushAllowed", "tagCreationAllowed", "arbitraryCommandAllowed", "shellExecutionAllowed", "selfApprovalAllowed", "selfMergeAllowed", "selfDeployAllowed",
  "productionDeploymentAllowed", "workerActivationTokenDraftId", "sourceWorkerActivationDecisionRecordId", "phase105WorkerActivationDecisionRecordReady", "activationTokenDraftPacketProduced",
  "activationTokenDraftManifestProduced", "ownerTokenDecisionDraftManifestProduced", "tokenPolicyDraftManifestProduced", "tokenAuditDraftManifestProduced", "activationTokenDenialManifestProduced",
  "ownerReviewManifestProduced", "readyForOwnerReview", "projectRepoSourceMutated", "workerActivated", "workerExecuted", "workerSpawned", "autonomousDelegationExecuted",
  "schedulerWorkflowMutated", "iPhoneAutomationMutated", "awayModeExecuted", "fleetExecuted", "applyExecuted", "patchExecuted", "realProjectBranchCreated", "realProjectMergePerformed",
  "activationTokenIssued", "activationCredentialIssued", "tokenMaterialGenerated", "secretMaterialGenerated", "tokenImplementationBlocked", "activationImplementationBlocked", "multiLanguageProductionDoctrineIncluded"
];
for (const key of keys) console.log(`${key}: ${result[key]}`);

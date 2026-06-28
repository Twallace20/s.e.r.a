#!/usr/bin/env node
import { createDefaultWorkerActivationTokenReviewRecordV1, runWorkerActivationTokenReviewRecordV1 } from "./lib/worker-activation-token-review-record-v1.mjs";

const result = runWorkerActivationTokenReviewRecordV1(createDefaultWorkerActivationTokenReviewRecordV1());

if (!result.ok) {
  console.error("S.E.R.A. phase107 worker activation token review record v1: FAIL");
  for (const blocker of result.blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log("S.E.R.A. phase107 worker activation token review record v1: PASS");
const keys = [
  "workerActivationTokenReviewRecordStatus", "validationFailedCount", "declaredFileCount", "workerActivationTokenReviewRecordRequirementCount", "workerActivationTokenReviewRecordFieldCount",
  "activationTokenReviewRecordCount", "ownerTokenReviewRecordCount", "tokenPolicyReviewRecordCount", "tokenAuditReviewRecordCount", "activationTokenReviewDenialRecordCount",
  "roadmapTrackCount", "multiLanguageProductionTargetCount", "safetyGateCount", "workerActivationTokenReviewRecordAllowed", "workerActivationTokenDraftReadAllowed",
  "activationTokenReviewRecordManifestAllowed", "ownerReviewTokenReviewRecordPacketAllowed", "ownerTokenReviewRecordAllowed", "tokenPolicyReviewRecordAllowed", "tokenReviewDenialRecordAllowed",
  "activationTokenIssuanceAllowed", "activationCredentialIssuanceAllowed", "tokenMaterialGenerationAllowed", "secretMaterialGenerationAllowed", "workerActivationAllowed",
  "workerExecutionAllowed", "workerSpawningAllowed", "autonomousDelegationAllowed", "schedulerWorkflowMutationAllowed", "iPhoneAutomationMutationAllowed", "awayModeExecutionAllowed",
  "fleetExecutionAllowed", "applyExecutionAllowed", "patchExecutionAllowed", "projectRepoSourceMutationAllowed", "realProjectBranchCreationAllowed", "realProjectMergeExecutionAllowed",
  "gitPushAllowed", "tagCreationAllowed", "arbitraryCommandAllowed", "shellExecutionAllowed", "selfApprovalAllowed", "selfMergeAllowed", "selfDeployAllowed",
  "productionDeploymentAllowed", "workerActivationTokenReviewRecordId", "sourceWorkerActivationTokenDraftId", "phase106WorkerActivationTokenDraftReady", "activationTokenReviewRecordPacketProduced",
  "activationTokenReviewRecordManifestProduced", "ownerTokenReviewRecordManifestProduced", "tokenPolicyReviewRecordManifestProduced", "tokenAuditReviewRecordManifestProduced", "activationTokenReviewDenialRecordManifestProduced",
  "ownerReviewManifestProduced", "readyForOwnerReview", "projectRepoSourceMutated", "workerActivated", "workerExecuted", "workerSpawned", "autonomousDelegationExecuted",
  "schedulerWorkflowMutated", "iPhoneAutomationMutated", "awayModeExecuted", "fleetExecuted", "applyExecuted", "patchExecuted", "realProjectBranchCreated", "realProjectMergePerformed",
  "activationTokenIssued", "activationCredentialIssued", "tokenMaterialGenerated", "secretMaterialGenerated", "tokenImplementationBlocked", "activationImplementationBlocked", "multiLanguageProductionDoctrineIncluded"
];
for (const key of keys) console.log(`${key}: ${result[key]}`);

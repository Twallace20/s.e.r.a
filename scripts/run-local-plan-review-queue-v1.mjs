#!/usr/bin/env node
import { createDefaultLocalPlanReviewQueueV1, inspectLocalPlanReviewQueueV1 } from "./lib/local-plan-review-queue-v1.mjs";

const result = inspectLocalPlanReviewQueueV1(createDefaultLocalPlanReviewQueueV1(), { rootDir: process.cwd(), writeArtifacts: true });

console.log("S.E.R.A. phase52 local plan review queue v1: " + (result.ok ? "PASS" : "FAIL"));
console.log("planReviewQueueStatus: " + result.planReviewQueueStatus);
console.log("validationFailedCount: " + result.validationFailedCount);
console.log("declaredFileCount: " + result.declaredFileCount);
console.log("reviewItemCount: " + result.reviewItemCount);
console.log("reviewFieldCount: " + result.reviewFieldCount);
console.log("queueSignalCount: " + result.queueSignalCount);
console.log("safetyGateCount: " + result.safetyGateCount);
console.log("appBindingCount: " + result.appBindingCount);
console.log("localOnly: " + result.localOnly);
console.log("privateAppOnly: " + result.privateAppOnly);
console.log("reviewQueueOnly: " + result.reviewQueueOnly);
console.log("planIntakeOnly: " + result.planIntakeOnly);
console.log("readOnly: " + result.readOnly);
console.log("frontendOnly: " + result.frontendOnly);
console.log("noBackendLogic: " + result.noBackendLogic);
console.log("noAuthentication: " + result.noAuthentication);
console.log("commandExecutionAllowed: " + result.commandExecutionAllowed);
console.log("runnerConnectivityAllowed: " + result.runnerConnectivityAllowed);
console.log("mutatesSource: " + result.mutatesSource);
console.log("fileMutationAllowed: " + result.fileMutationAllowed);
console.log("autoApprovalAllowed: " + result.autoApprovalAllowed);
console.log("autoProcessingAllowed: " + result.autoProcessingAllowed);
console.log("autoRouteAllowed: " + result.autoRouteAllowed);
console.log("autoMergeAllowed: " + result.autoMergeAllowed);
console.log("selfApprovalAllowed: " + result.selfApprovalAllowed);

if (!result.ok) {
  console.error("Blockers:");
  for (const blocker of result.blockers) console.error("- " + blocker);
  process.exitCode = 1;
}

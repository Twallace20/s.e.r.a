#!/usr/bin/env node
import { createDefaultWorkflowComposerV1, inspectWorkflowComposerV1 } from "./lib/workflow-composer-v1.mjs";

const result = inspectWorkflowComposerV1(createDefaultWorkflowComposerV1(), { rootDir: process.cwd(), writeArtifacts: true });

if (!result.ok) {
  console.log("S.E.R.A. phase51 workflow composer v1: FAIL");
  for (const blocker of result.blockers) {
    console.log(`- ${blocker}`);
  }
  process.exit(1);
}

console.log("S.E.R.A. phase51 workflow composer v1: PASS");
console.log(`workflowComposerStatus: ${result.workflowComposerStatus}`);
console.log(`validationFailedCount: ${result.validationFailedCount}`);
console.log(`declaredFileCount: ${result.declaredFileCount}`);
console.log(`compositionFieldCount: ${result.compositionFieldCount}`);
console.log(`compositionSignalCount: ${result.compositionSignalCount}`);
console.log(`planStepCount: ${result.planStepCount}`);
console.log(`evidenceRequirementCount: ${result.evidenceRequirementCount}`);
console.log(`safetyGateCount: ${result.safetyGateCount}`);
console.log(`appBindingCount: ${result.appBindingCount}`);
console.log(`localOnly: ${result.localOnly}`);
console.log(`privateAppOnly: ${result.privateAppOnly}`);
console.log(`compositionOnly: ${result.compositionOnly}`);
console.log(`planPreviewOnly: ${result.planPreviewOnly}`);
console.log(`readOnly: ${result.readOnly}`);
console.log(`frontendOnly: ${result.frontendOnly}`);
console.log(`noBackendLogic: ${result.noBackendLogic}`);
console.log(`noAuthentication: ${result.noAuthentication}`);
console.log(`commandExecutionAllowed: ${result.commandExecutionAllowed}`);
console.log(`runnerConnectivityAllowed: ${result.runnerConnectivityAllowed}`);
console.log(`mutatesSource: ${result.mutatesSource}`);
console.log(`fileMutationAllowed: ${result.fileMutationAllowed}`);
console.log(`autoProcessingAllowed: ${result.autoProcessingAllowed}`);
console.log(`autoRouteAllowed: ${result.autoRouteAllowed}`);
console.log(`autoMergeAllowed: ${result.autoMergeAllowed}`);
console.log(`selfApprovalAllowed: ${result.selfApprovalAllowed}`);

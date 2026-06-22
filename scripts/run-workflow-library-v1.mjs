#!/usr/bin/env node
import { createDefaultWorkflowLibraryV1, inspectWorkflowLibraryV1 } from "./lib/workflow-library-v1.mjs";

const result = inspectWorkflowLibraryV1(createDefaultWorkflowLibraryV1(), { rootDir: process.cwd(), writeArtifacts: true });

if (!result.ok) {
  console.log("S.E.R.A. phase50 workflow library v1: FAIL");
  for (const blocker of result.blockers) {
    console.log(`- ${blocker}`);
  }
  process.exit(1);
}

console.log("S.E.R.A. phase50 workflow library v1: PASS");
console.log(`workflowLibraryStatus: ${result.workflowLibraryStatus}`);
console.log(`validationFailedCount: ${result.validationFailedCount}`);
console.log(`declaredFileCount: ${result.declaredFileCount}`);
console.log(`workflowCount: ${result.workflowCount}`);
console.log(`workflowFieldCount: ${result.workflowFieldCount}`);
console.log(`catalogSignalCount: ${result.catalogSignalCount}`);
console.log(`safetyGateCount: ${result.safetyGateCount}`);
console.log(`appBindingCount: ${result.appBindingCount}`);
console.log(`localOnly: ${result.localOnly}`);
console.log(`privateAppOnly: ${result.privateAppOnly}`);
console.log(`catalogOnly: ${result.catalogOnly}`);
console.log(`readOnly: ${result.readOnly}`);
console.log(`frontendOnly: ${result.frontendOnly}`);
console.log(`noBackendLogic: ${result.noBackendLogic}`);
console.log(`noAuthentication: ${result.noAuthentication}`);
console.log(`commandExecutionAllowed: ${result.commandExecutionAllowed}`);
console.log(`runnerConnectivityAllowed: ${result.runnerConnectivityAllowed}`);
console.log(`mutatesSource: ${result.mutatesSource}`);
console.log(`autoProcessingAllowed: ${result.autoProcessingAllowed}`);
console.log(`autoRouteAllowed: ${result.autoRouteAllowed}`);
console.log(`autoMergeAllowed: ${result.autoMergeAllowed}`);
console.log(`selfApprovalAllowed: ${result.selfApprovalAllowed}`);

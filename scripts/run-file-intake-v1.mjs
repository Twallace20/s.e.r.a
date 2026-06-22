#!/usr/bin/env node
import { inspectFileIntakeV1 } from "./lib/file-intake-v1.mjs";

const result = inspectFileIntakeV1();

if (!result.ok) {
  console.error("S.E.R.A. phase49 file intake v1: FAIL");
  for (const blocker of result.blockers) {
    console.error(`- ${blocker}`);
  }
  process.exit(1);
}

console.log("S.E.R.A. phase49 file intake v1: PASS");
console.log(`fileIntakeStatus: ${result.fileIntakeStatus}`);
console.log(`validationFailedCount: ${result.validationFailedCount}`);
console.log(`declaredFileCount: ${result.declaredFileCount}`);
console.log(`fileMetadataFieldCount: ${result.fileMetadataFieldCount}`);
console.log(`intakeSignalCount: ${result.intakeSignalCount}`);
console.log(`safetyGateCount: ${result.safetyGateCount}`);
console.log(`appBindingCount: ${result.appBindingCount}`);
console.log(`localOnly: ${result.localOnly}`);
console.log(`privateAppOnly: ${result.privateAppOnly}`);
console.log(`metadataCaptureOnly: ${result.metadataCaptureOnly}`);
console.log(`readOnly: ${result.readOnly}`);
console.log(`frontendOnly: ${result.frontendOnly}`);
console.log(`noBackendLogic: ${result.noBackendLogic}`);
console.log(`noAuthentication: ${result.noAuthentication}`);
console.log(`arbitraryFileAccessAllowed: ${result.arbitraryFileAccessAllowed}`);
console.log(`fileExecutionAllowed: ${result.fileExecutionAllowed}`);
console.log(`fileMutationAllowed: ${result.fileMutationAllowed}`);
console.log(`runnerConnectivityAllowed: ${result.runnerConnectivityAllowed}`);
console.log(`mutatesSource: ${result.mutatesSource}`);
console.log(`autoProcessingAllowed: ${result.autoProcessingAllowed}`);
console.log(`autoRouteAllowed: ${result.autoRouteAllowed}`);
console.log(`autoMergeAllowed: ${result.autoMergeAllowed}`);
console.log(`selfApprovalAllowed: ${result.selfApprovalAllowed}`);

#!/usr/bin/env node
import {
  createDefaultOperatorAppRuntimeReaderV1,
  inspectOperatorAppRuntimeReaderV1,
} from "./lib/operator-app-runtime-reader-v1.mjs";

const result = inspectOperatorAppRuntimeReaderV1(createDefaultOperatorAppRuntimeReaderV1());

if (!result.ok) {
  console.error("S.E.R.A. phase47 operator app runtime reader v1: FAIL");
  for (const blocker of result.blockers) {
    console.error(`- ${blocker}`);
  }
  process.exit(1);
}

console.log("S.E.R.A. phase47 operator app runtime reader v1: PASS");
console.log(`operatorAppRuntimeReaderStatus: ${result.operatorAppRuntimeReaderStatus}`);
console.log(`validationFailedCount: ${result.validationFailedCount}`);
console.log(`declaredFileCount: ${result.declaredFileCount}`);
console.log(`runtimeSignalCount: ${result.runtimeSignalCount}`);
console.log(`safetyGateCount: ${result.safetyGateCount}`);
console.log(`appStatusBindingCount: ${result.appStatusBindingCount}`);
console.log(`localOnly: ${result.localOnly}`);
console.log(`privateAppOnly: ${result.privateAppOnly}`);
console.log(`readOnly: ${result.readOnly}`);
console.log(`frontendConsumableStatus: ${result.frontendConsumableStatus}`);
console.log(`noBackendLogic: ${result.noBackendLogic}`);
console.log(`noAuthentication: ${result.noAuthentication}`);
console.log(`commandExecutionAllowed: ${result.commandExecutionAllowed}`);
console.log(`runnerConnectivityAllowed: ${result.runnerConnectivityAllowed}`);
console.log(`mutatesSource: ${result.mutatesSource}`);
console.log(`autoMergeAllowed: ${result.autoMergeAllowed}`);
console.log(`selfApprovalAllowed: ${result.selfApprovalAllowed}`);

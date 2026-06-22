#!/usr/bin/env node
import { inspectRequestIntakeV1 } from "./lib/request-intake-v1.mjs";

const result = inspectRequestIntakeV1();

if (!result.ok) {
  console.error("S.E.R.A. phase48 request intake v1: FAIL");
  for (const blocker of result.blockers) {
    console.error(`- ${blocker}`);
  }
  process.exit(1);
}

console.log("S.E.R.A. phase48 request intake v1: PASS");
console.log(`requestIntakeStatus: ${result.requestIntakeStatus}`);
console.log(`validationFailedCount: ${result.validationFailedCount}`);
console.log(`declaredFileCount: ${result.declaredFileCount}`);
console.log(`requestFieldCount: ${result.requestFieldCount}`);
console.log(`intakeSignalCount: ${result.intakeSignalCount}`);
console.log(`safetyGateCount: ${result.safetyGateCount}`);
console.log(`appBindingCount: ${result.appBindingCount}`);
console.log(`localOnly: ${result.localOnly}`);
console.log(`privateAppOnly: ${result.privateAppOnly}`);
console.log(`captureOnly: ${result.captureOnly}`);
console.log(`readOnly: ${result.readOnly}`);
console.log(`frontendOnly: ${result.frontendOnly}`);
console.log(`noBackendLogic: ${result.noBackendLogic}`);
console.log(`noAuthentication: ${result.noAuthentication}`);
console.log(`commandExecutionAllowed: ${result.commandExecutionAllowed}`);
console.log(`runnerConnectivityAllowed: ${result.runnerConnectivityAllowed}`);
console.log(`mutatesSource: ${result.mutatesSource}`);
console.log(`autoSubmitAllowed: ${result.autoSubmitAllowed}`);
console.log(`autoRouteAllowed: ${result.autoRouteAllowed}`);
console.log(`autoMergeAllowed: ${result.autoMergeAllowed}`);
console.log(`selfApprovalAllowed: ${result.selfApprovalAllowed}`);

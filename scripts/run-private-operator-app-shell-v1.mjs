#!/usr/bin/env node
import { createDefaultPrivateOperatorAppShellV1, inspectPrivateOperatorAppShellV1 } from "./lib/private-operator-app-shell-v1.mjs";

const result = inspectPrivateOperatorAppShellV1(createDefaultPrivateOperatorAppShellV1());

if (!result.ok) {
  console.error(`S.E.R.A. phase46 private operator app shell v1: FAIL`);
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase46 private operator app shell v1: PASS");
console.log(`privateOperatorAppShellStatus: ${result.privateOperatorAppShellStatus}`);
console.log(`validationFailedCount: ${result.validationFailedCount}`);
console.log(`declaredFileCount: ${result.declaredFileCount}`);
console.log(`layoutSectionCount: ${result.layoutSectionCount}`);
console.log(`dashboardModuleCount: ${result.dashboardModuleCount}`);
console.log(`appSurfaceCount: ${result.appSurfaceCount}`);
console.log(`safetyGateCount: ${result.safetyGateCount}`);
console.log(`localOnly: ${result.localOnly}`);
console.log(`privateAppOnly: ${result.privateAppOnly}`);
console.log(`appShellOnly: ${result.appShellOnly}`);
console.log(`designAssistedShell: ${result.designAssistedShell}`);
console.log(`frontendOnly: ${result.frontendOnly}`);
console.log(`noBackendLogic: ${result.noBackendLogic}`);
console.log(`noAuthentication: ${result.noAuthentication}`);
console.log(`freeCoreCompatible: ${result.freeCoreCompatible}`);
console.log(`commandExecutionAllowed: ${result.commandExecutionAllowed}`);
console.log(`runnerConnectivityAllowed: ${result.runnerConnectivityAllowed}`);
console.log(`mutatesSource: ${result.mutatesSource}`);
console.log(`autoMergeAllowed: ${result.autoMergeAllowed}`);
console.log(`selfApprovalAllowed: ${result.selfApprovalAllowed}`);

#!/usr/bin/env node
import { runApprovedFilePatchRunnerDemoV1 } from "./lib/approved-file-patch-runner-v1.mjs";

const result = runApprovedFilePatchRunnerDemoV1();

if (!result.ok) {
  console.error("S.E.R.A. phase92 approved file patch runner v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

const summary = result.inspection;
console.log("S.E.R.A. phase92 approved file patch runner v1: PASS");
console.log(`approvedFilePatchRunnerStatus: ${summary.approvedFilePatchRunnerStatus}`);
console.log(`validationFailedCount: ${summary.validationFailedCount}`);
console.log(`declaredFileCount: ${summary.declaredFileCount}`);
console.log(`patchRunnerRequirementCount: ${summary.patchRunnerRequirementCount}`);
console.log(`patchRunnerFieldCount: ${summary.patchRunnerFieldCount}`);
console.log(`approvedPatchPlanCount: ${summary.approvedPatchPlanCount}`);
console.log(`patchRunnerEvidenceCount: ${summary.patchRunnerEvidenceCount}`);
console.log(`patchRunnerSignalCount: ${summary.patchRunnerSignalCount}`);
console.log(`safetyGateCount: ${summary.safetyGateCount}`);
console.log(`appBindingCount: ${summary.appBindingCount}`);
console.log(`patchExecutionAllowed: ${summary.patchExecutionAllowed}`);
console.log(`workspaceFileMutationAllowed: ${summary.workspaceFileMutationAllowed}`);
console.log(`sourceMutationAllowed: ${summary.sourceMutationAllowed}`);
console.log(`branchMutationAllowed: ${summary.branchMutationAllowed}`);
console.log(`arbitraryPathPatchAllowed: ${summary.arbitraryPathPatchAllowed}`);
console.log(`arbitraryPatchTextAllowed: ${summary.arbitraryPatchTextAllowed}`);
console.log(`binaryPatchAllowed: ${summary.binaryPatchAllowed}`);
console.log(`deleteFileAllowed: ${summary.deleteFileAllowed}`);
console.log(`createFileAllowed: ${summary.createFileAllowed}`);
console.log(`selfApprovalAllowed: ${summary.selfApprovalAllowed}`);
console.log(`selfMergeAllowed: ${summary.selfMergeAllowed}`);
console.log(`selfDeployAllowed: ${summary.selfDeployAllowed}`);
console.log(`appliedPatchPlanId: ${result.patchPlanId}`);
console.log(`recordPath: ${result.recordPath}`);
console.log(`backupPath: ${result.backupPath}`);

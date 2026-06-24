import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyApprovedFilePatchPlanV1,
  createDefaultApprovedFilePatchRunnerV1,
  inspectApprovedFilePatchRunnerV1,
  runApprovedFilePatchRunnerDemoV1,
} from "../../scripts/lib/approved-file-patch-runner-v1.mjs";

describe("approved file patch runner v1", () => {
  it("passes when the patch runner is owner-approved, exact-plan only, and app-bound", () => {
    const result = inspectApprovedFilePatchRunnerV1();
    expect(result.ok).toBe(true);
    expect(result.approvedFilePatchRunnerStatus).toBe("approved-file-patch-runner-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.patchRunnerRequirementCount).toBe(16);
    expect(result.patchRunnerFieldCount).toBe(20);
    expect(result.approvedPatchPlanCount).toBe(4);
    expect(result.patchRunnerEvidenceCount).toBe(16);
    expect(result.patchRunnerSignalCount).toBe(33);
    expect(result.safetyGateCount).toBe(940);
    expect(result.appBindingCount).toBe(6);
    expect(result.phase91ApprovedValidationRunnerReady).toBe(true);
    expect(result.phase90ApprovalGatedLocalCommandRunnerReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.exactPatchCatalogRequired).toBe(true);
    expect(result.pathContainmentRequired).toBe(true);
    expect(result.expectedShaRequired).toBe(true);
    expect(result.expectedOccurrenceRequired).toBe(true);
    expect(result.backupRequired).toBe(true);
    expect(result.rollbackRequired).toBe(true);
    expect(result.evidenceRecordRequired).toBe(true);
    expect(result.sandboxWorkspaceOnly).toBe(true);
    expect(result.patchExecutionAllowed).toBe(true);
    expect(result.workspaceFileMutationAllowed).toBe(true);
    expect(result.sourceMutationAllowed).toBe(false);
    expect(result.branchMutationAllowed).toBe(false);
    expect(result.arbitraryPathPatchAllowed).toBe(false);
    expect(result.arbitraryPatchTextAllowed).toBe(false);
    expect(result.binaryPatchAllowed).toBe(false);
    expect(result.deleteFileAllowed).toBe(false);
    expect(result.createFileAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
  });

  it("applies the approved sandbox patch, writes backup, and records evidence", () => {
    const artifactRoot = path.join(process.cwd(), ".sera-approved-file-patch-runner-test");
    fs.rmSync(artifactRoot, { recursive: true, force: true });
    const result = runApprovedFilePatchRunnerDemoV1({ artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.executed).toBe(true);
    expect(result.applied).toBe(true);
    expect(result.patchPlanId).toBe("phase92-demo-text-replace");
    expect(result.occurrenceCount).toBe(1);
    expect(result.mutatesSource).toBe(false);
    expect(result.workspaceContained).toBe(true);
    expect(fs.existsSync(result.recordPath)).toBe(true);
    expect(fs.existsSync(result.backupPath)).toBe(true);
    expect(fs.readFileSync(result.targetPath, "utf8")).toContain("Phase 92 approved patch applied.");
    expect(fs.readFileSync(result.targetPath, "utf8")).not.toContain("Phase 92 pending patch.");
  });

  it("blocks patch execution when owner approval is missing or self-approved", () => {
    const config = createDefaultApprovedFilePatchRunnerV1();
    config.approvalRecord.approved = false;
    const missingApproval = applyApprovedFilePatchPlanV1(config, { artifactRoot: path.join(process.cwd(), ".sera-approved-file-patch-runner-test") });
    expect(missingApproval.ok).toBe(false);
    expect(missingApproval.status).toBe("blocked");
    expect(missingApproval.blockers).toContain("Owner approval is required before file patch execution");

    const selfApproved = createDefaultApprovedFilePatchRunnerV1();
    selfApproved.approvalRecord.selfApproved = true;
    const selfApprovedResult = applyApprovedFilePatchPlanV1(selfApproved, { artifactRoot: path.join(process.cwd(), ".sera-approved-file-patch-runner-test") });
    expect(selfApprovedResult.ok).toBe(false);
    expect(selfApprovedResult.blockers).toContain("Approval record must not be self-approved");
    expect(selfApprovedResult.blockers).toContain("Self-approved file patch packets are blocked");
  });

  it("rolls back the sandbox patch when validation fails", () => {
    const artifactRoot = path.join(process.cwd(), ".sera-approved-file-patch-runner-test");
    fs.rmSync(artifactRoot, { recursive: true, force: true });
    const result = applyApprovedFilePatchPlanV1(createDefaultApprovedFilePatchRunnerV1(), {
      artifactRoot,
      forceValidationFailure: true,
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe("rolled-back");
    expect(result.rollbackPerformed).toBe(true);
    expect(result.applied).toBe(false);
    expect(fs.existsSync(result.backupPath)).toBe(true);
    expect(fs.readFileSync(result.targetPath, "utf8")).toContain("Phase 92 pending patch.");
    expect(result.blockers).toContain("Patch validation failed; backup restored");
  });

  it("fails closed if source mutation, path escape, binary/delete/create, or self-merge authority is introduced", () => {
    const config = createDefaultApprovedFilePatchRunnerV1();
    config.approvedPatchPlans[0].targetRelativePath = "../outside.txt";
    config.approvedPatchPlans[0].textOnly = false;
    config.approvedPatchPlans[0].deleteFile = true;
    config.approvedPatchPlans[0].createFile = true;
    config.approvedPatchPlans[0].expectedOccurrences = 0;
    config.boundaries.sourceMutationAllowed = true;
    config.boundaries.branchMutationAllowed = true;
    config.boundaries.binaryPatchAllowed = true;
    config.boundaries.deleteFileAllowed = true;
    config.boundaries.createFileAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    config.boundaries.selfMergeAllowed = true;
    const result = inspectApprovedFilePatchRunnerV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Patch target path must be safe and relative: phase92-demo-text-replace");
    expect(result.blockers).toContain("Patch plan must declare a positive expectedOccurrences value: phase92-demo-text-replace");
    expect(result.blockers).toContain("Patch plan must be text-only: phase92-demo-text-replace");
    expect(result.blockers).toContain("Patch plan must not delete files: phase92-demo-text-replace");
    expect(result.blockers).toContain("Patch plan must not create files: phase92-demo-text-replace");
    expect(result.blockers).toContain("sourceMutationAllowed must remain false");
    expect(result.blockers).toContain("branchMutationAllowed must remain false");
    expect(result.blockers).toContain("binaryPatchAllowed must remain false");
    expect(result.blockers).toContain("deleteFileAllowed must remain false");
    expect(result.blockers).toContain("createFileAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
    expect(result.blockers).toContain("selfMergeAllowed must remain false");
  });
});

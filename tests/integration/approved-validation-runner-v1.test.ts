import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDefaultApprovedValidationRunnerV1,
  inspectApprovedValidationRunnerV1,
  runApprovedValidationRunnerDemoV1,
  runApprovedValidationSuiteV1,
} from "../../scripts/lib/approved-validation-runner-v1.mjs";

describe("approved validation runner v1", () => {
  it("passes when the validation runner is owner-approved, catalog-only, and app-bound", () => {
    const result = inspectApprovedValidationRunnerV1();
    expect(result.ok).toBe(true);
    expect(result.approvedValidationRunnerStatus).toBe("approved-validation-runner-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.validationRunnerRequirementCount).toBe(15);
    expect(result.validationRunnerFieldCount).toBe(18);
    expect(result.approvedValidationSuiteCount).toBe(4);
    expect(result.approvedValidationCommandCount).toBe(6);
    expect(result.validationRunnerEvidenceCount).toBe(16);
    expect(result.validationRunnerSignalCount).toBe(26);
    expect(result.safetyGateCount).toBe(920);
    expect(result.appBindingCount).toBe(6);
    expect(result.phase90CommandRunnerReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.validationExecutionAllowed).toBe(true);
    expect(result.fullVerifyAutoRunAllowed).toBe(false);
    expect(result.arbitraryCommandExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.powershellExecutionAllowed).toBe(false);
    expect(result.schtasksExecutionAllowed).toBe(false);
    expect(result.sourceMutationAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
  });

  it("runs the approved quick validation suite and writes evidence", () => {
    const artifactRoot = path.join(process.cwd(), ".sera-approved-validation-runner-test");
    fs.rmSync(artifactRoot, { recursive: true, force: true });
    const result = runApprovedValidationRunnerDemoV1({ artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.executed).toBe(true);
    expect(result.executedSuiteId).toBe("phase91-quick-validation");
    expect(result.passedStepCount).toBe(2);
    expect(result.failedStepCount).toBe(0);
    expect(result.validation.stepResults.every((item) => item.shellUsed === false)).toBe(true);
    expect(result.validation.stepResults[0].stdout).toContain("S.E.R.A. free core covenant: PASS");
    expect(result.validation.stepResults[1].stdout).toContain("S.E.R.A. knowledge source map: PASS");
    expect(fs.existsSync(result.recordPath)).toBe(true);
    expect(result.validation.mutatesSource).toBe(false);
  });

  it("blocks validation execution when owner approval is missing or self-approved", () => {
    const config = createDefaultApprovedValidationRunnerV1();
    config.approvalRecord.approved = false;
    const missingApproval = runApprovedValidationSuiteV1(config, { suiteId: "phase91-quick-validation" });
    expect(missingApproval.ok).toBe(false);
    expect(missingApproval.status).toBe("blocked");
    expect(missingApproval.blockers).toContain("Owner approval is required before validation execution");

    const selfApproved = createDefaultApprovedValidationRunnerV1();
    selfApproved.approvalRecord.selfApproved = true;
    const selfApprovedResult = runApprovedValidationSuiteV1(selfApproved, { suiteId: "phase91-quick-validation" });
    expect(selfApprovedResult.ok).toBe(false);
    expect(selfApprovedResult.blockers).toContain("Approval record must not be self-approved");
    expect(selfApprovedResult.blockers).toContain("Self-approved validation packets are blocked");
  });

  it("blocks declared heavy validation suites during the Phase 91 demo path", () => {
    const config = createDefaultApprovedValidationRunnerV1();
    config.approvalRecord.validationSuiteId = "full-operator-validation";
    config.approvalRecord.scope = "full-operator-validation";
    const result = runApprovedValidationSuiteV1(config, { suiteId: "full-operator-validation" });
    expect(result.ok).toBe(false);
    expect(result.executed).toBe(false);
    expect(result.blockers).toContain("Validation suite is declared but disabled for Phase 91 demo execution: full-operator-validation");
  });

  it("fails closed if shell, PowerShell, source mutation, or self-repair is introduced", () => {
    const config = createDefaultApprovedValidationRunnerV1();
    config.validationCommands[0].executable = process.platform === "win32" ? "powershell.exe" : "sh";
    config.validationCommands[0].shell = true;
    config.boundaries.shellExecutionAllowed = true;
    config.boundaries.sourceMutationAllowed = true;
    config.boundaries.selfRepairAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    const result = inspectApprovedValidationRunnerV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers.some((item) => item.includes("Forbidden executable is not allowed"))).toBe(true);
    expect(result.blockers).toContain("Validation command must not use shell: node-free-core-covenant-check");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("sourceMutationAllowed must remain false");
    expect(result.blockers).toContain("selfRepairAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });
});

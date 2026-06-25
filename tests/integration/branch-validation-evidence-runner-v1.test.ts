import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDefaultBranchValidationEvidenceRunnerV1,
  inspectBranchValidationEvidenceRunnerV1,
  runBranchValidationEvidenceRunnerV1,
} from "../../scripts/lib/branch-validation-evidence-runner-v1.mjs";

function tempRoot(name: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `sera-${name}-`));
}

describe("Phase 97 — Branch Validation Evidence Runner v1", () => {
  it("passes when owner-approved validation evidence is app-bound", () => {
    const result = inspectBranchValidationEvidenceRunnerV1(createDefaultBranchValidationEvidenceRunnerV1());
    expect(result.ok).toBe(true);
    expect(result.branchValidationEvidenceRunnerStatus).toBe("branch-validation-evidence-runner-ready");
    expect(result.declaredFileCount).toBe(5);
    expect(result.branchValidationEvidenceRequirementCount).toBe(26);
    expect(result.branchValidationEvidenceFieldCount).toBe(40);
    expect(result.approvedBranchValidationSuiteCount).toBe(4);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.safetyGateCount).toBe(1140);
    expect(result.branchValidationEvidenceAllowed).toBe(true);
    expect(result.branchWorkspaceReadAllowed).toBe(true);
    expect(result.evidenceWritingAllowed).toBe(true);
    expect(result.projectRepoSourceMutationAllowed).toBe(false);
    expect(result.branchWorkspaceMutationAllowed).toBe(false);
    expect(result.localGitBranchCreationAllowed).toBe(false);
    expect(result.gitPushAllowed).toBe(false);
    expect(result.mergeAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes validation evidence for approved Phase 96 branch edit output", () => {
    const artifactRoot = tempRoot("phase97-branch-validation-evidence");
    const result = runBranchValidationEvidenceRunnerV1(createDefaultBranchValidationEvidenceRunnerV1(), { artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.validationPassed).toBe(true);
    expect(result.validationFailedCount).toBe(0);
    expect(result.validationSuiteId).toBe("phase97-demo-branch-validation-evidence");
    expect(result.targetBranch).toBe("work/phase-96-demo-branch-edit-executor");
    expect(result.targetFile).toBe("src/phase96-demo.ts");
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(fs.existsSync(result.evidencePath)).toBe(true);
    const evidence = JSON.parse(fs.readFileSync(result.evidencePath, "utf8"));
    expect(evidence.validationPassed).toBe(true);
    expect(evidence.branchWorkspaceMutatedByValidation).toBe(false);
    expect(evidence.shellExecutionUsed).toBe(false);
    expect(evidence.gitBranchCreated).toBe(false);
    expect(evidence.evidenceManifest.priorPhaseChain).toContain("Phase 96");
  });

  it("blocks missing owner approval and self approval", () => {
    const missingApproval = createDefaultBranchValidationEvidenceRunnerV1({ approvalRecord: { approved: false } });
    const missingResult = inspectBranchValidationEvidenceRunnerV1(missingApproval);
    expect(missingResult.ok).toBe(false);
    expect(missingResult.blockers).toContain("Owner approval record must be approved.");

    const selfApproval = createDefaultBranchValidationEvidenceRunnerV1({ approvalRecord: { selfApproved: true } });
    const selfResult = inspectBranchValidationEvidenceRunnerV1(selfApproval);
    expect(selfResult.ok).toBe(false);
    expect(selfResult.blockers).toContain("Self-approval is blocked for branch validation evidence.");
  });

  it("fails validation evidence when the branch workspace output does not match expected proof", () => {
    const artifactRoot = tempRoot("phase97-branch-validation-evidence-failure");
    const config = createDefaultBranchValidationEvidenceRunnerV1();
    config.approvedBranchValidationSuites[0].expectedPostEditSha256 = "0".repeat(64);
    config.approvedBranchValidationSuites[0].expectedContent = "missing-marker";
    const result = runBranchValidationEvidenceRunnerV1(config, { artifactRoot });
    expect(result.ok).toBe(false);
    expect(result.validationPassed).toBe(false);
    expect(result.validationFailedCount).toBe(2);
    const evidence = JSON.parse(fs.readFileSync(result.evidencePath, "utf8"));
    expect(evidence.status).toBe("branch-validation-evidence-failed");
    expect(evidence.validationChecks.filter((check: { passed: boolean }) => !check.passed).length).toBe(2);
  });

  it("fails closed when unsafe validation powers or suite definitions are introduced", () => {
    const config = createDefaultBranchValidationEvidenceRunnerV1();
    config.owner = "S.E.R.A.";
    config.approvalRecord.selfApproved = true;
    config.approvedBranchValidationSuites[0].targetBranch = "main";
    config.approvedBranchValidationSuites[0].baseRef = "develop";
    config.approvedBranchValidationSuites[0].sourceBranchEditPlanId = "";
    config.approvedBranchValidationSuites[0].targetFile = "../escape.ts";
    config.approvedBranchValidationSuites[0].validationChecks = [];
    config.multiLanguageProductionTargets = config.multiLanguageProductionTargets.filter((language) => language !== "Swift");
    config.boundaries.projectRepoSourceMutationAllowed = true;
    config.boundaries.branchWorkspaceMutationAllowed = true;
    config.boundaries.localGitBranchCreationAllowed = true;
    config.boundaries.remoteGitBranchCreationAllowed = true;
    config.boundaries.gitPushAllowed = true;
    config.boundaries.mergeAllowed = true;
    config.boundaries.arbitraryValidationCommandAllowed = true;
    config.boundaries.shellExecutionAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    config.boundaries.selfMergeAllowed = true;
    const result = inspectBranchValidationEvidenceRunnerV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Owner must be Tyler Wallace for Phase 97 validation evidence approval.");
    expect(result.blockers).toContain("Self-approval is blocked for branch validation evidence.");
    expect(result.blockers).toContain("Branch validation target branch must be safe and work/ scoped: phase97-demo-branch-validation-evidence");
    expect(result.blockers).toContain("Branch validation base ref must be main: phase97-demo-branch-validation-evidence");
    expect(result.blockers).toContain("Branch validation suite must name source branch edit plan id: phase97-demo-branch-validation-evidence");
    expect(result.blockers).toContain("Branch validation target file must be safe and relative: phase97-demo-branch-validation-evidence");
    expect(result.blockers).toContain("Branch validation suite must include validation checks: phase97-demo-branch-validation-evidence");
    expect(result.blockers).toContain("Multi-language production doctrine must include 18 useful language targets.");
    expect(result.blockers).toContain("Multi-language production target is missing: Swift");
    expect(result.blockers).toContain("projectRepoSourceMutationAllowed must remain false");
    expect(result.blockers).toContain("branchWorkspaceMutationAllowed must remain false");
    expect(result.blockers).toContain("localGitBranchCreationAllowed must remain false");
    expect(result.blockers).toContain("remoteGitBranchCreationAllowed must remain false");
    expect(result.blockers).toContain("gitPushAllowed must remain false");
    expect(result.blockers).toContain("mergeAllowed must remain false");
    expect(result.blockers).toContain("arbitraryValidationCommandAllowed must remain false");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
    expect(result.blockers).toContain("selfMergeAllowed must remain false");
  });
});

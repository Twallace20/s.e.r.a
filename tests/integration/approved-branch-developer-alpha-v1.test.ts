import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDefaultApprovedBranchDeveloperAlphaV1,
  inspectApprovedBranchDeveloperAlphaV1,
  runApprovedBranchDeveloperAlphaV1,
} from "../../scripts/lib/approved-branch-developer-alpha-v1.mjs";

function tempRoot(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `sera-${name}-`));
}

describe("Phase 100 approved branch developer alpha v1", () => {
  it("produces isolated Alpha evidence without mutating the project repo", () => {
    const artifactRoot = tempRoot("phase100-approved-branch-developer-alpha");
    const result = runApprovedBranchDeveloperAlphaV1(createDefaultApprovedBranchDeveloperAlphaV1(), { artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.approvedBranchDeveloperAlphaRequirementCount).toBe(32);
    expect(result.approvedBranchDeveloperAlphaFieldCount).toBe(60);
    expect(result.branchDeveloperStageCount).toBe(6);
    expect(result.approvedBranchDeveloperTaskCount).toBe(4);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.safetyGateCount).toBe(1320);
    expect(result.branchDeveloperAlphaId).toBe("phase100-demo-approved-branch-developer-alpha");
    expect(result.targetBranch).toBe("work/phase-100-demo-approved-branch-developer-alpha");
    expect(result.targetFile).toBe("src/phase100-demo.ts");
    expect(result.targetLanguage).toBe("TypeScript");
    expect(result.isolatedAlphaEvidenceProduced).toBe(true);
    expect(result.realProjectSourceMutated).toBe(false);
    expect(result.realProjectBranchCreated).toBe(false);
    expect(result.realProjectMergePerformed).toBe(false);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.status).toBe("approved-branch-developer-alpha-ready");
    expect(packet.phaseLineage.ownerApprovedMergeRunId).toBe("phase99-demo-owner-approved-merge-run");
    expect(packet.checks.every((check: { passed: boolean }) => check.passed)).toBe(true);
  });

  it("requires the full Phase 94 through Phase 99 branch developer spine and approvals", () => {
    const missingStage = createDefaultApprovedBranchDeveloperAlphaV1({ phase97BranchValidationEvidenceRunnerReady: false });
    const missingStageResult = inspectApprovedBranchDeveloperAlphaV1(missingStage);
    expect(missingStageResult.ok).toBe(false);
    expect(missingStageResult.blockers).toContain("Branch developer stage must be ready: phase97");

    const missingApproval = createDefaultApprovedBranchDeveloperAlphaV1({ approvalRecord: { approved: false, finalAlphaApproved: false } });
    const missingApprovalResult = inspectApprovedBranchDeveloperAlphaV1(missingApproval);
    expect(missingApprovalResult.ok).toBe(false);
    expect(missingApprovalResult.blockers).toContain("Owner approval must be granted before Phase 100 Alpha run.");
    expect(missingApprovalResult.blockers).toContain("Final Alpha approval must be granted before Phase 100 Alpha run.");

    const selfApproval = createDefaultApprovedBranchDeveloperAlphaV1({ approvalRecord: { selfApproved: true } });
    const selfResult = inspectApprovedBranchDeveloperAlphaV1(selfApproval);
    expect(selfResult.ok).toBe(false);
    expect(selfResult.blockers).toContain("Self-approval is blocked for approved branch developer Alpha.");
  });

  it("fails closed when unsafe Alpha task definitions are introduced", () => {
    const config = createDefaultApprovedBranchDeveloperAlphaV1();
    config.approvedBranchDeveloperTasks[0].targetBranch = "main";
    config.approvedBranchDeveloperTasks[0].baseRef = "develop";
    config.approvedBranchDeveloperTasks[0].sourceBranchPlanId = "";
    config.approvedBranchDeveloperTasks[0].sourceBranchCreationPlanId = "";
    config.approvedBranchDeveloperTasks[0].sourceBranchEditPlanId = "";
    config.approvedBranchDeveloperTasks[0].sourceValidationSuiteId = "";
    config.approvedBranchDeveloperTasks[0].mergeApprovalPacketId = "";
    config.approvedBranchDeveloperTasks[0].ownerApprovedMergeRunId = "";
    config.approvedBranchDeveloperTasks[0].targetFile = "../escape.ts";
    config.approvedBranchDeveloperTasks[0].targetLanguage = "Brainfuck";
    config.approvedBranchDeveloperTasks[0].targetProjectType = "";
    config.approvedBranchDeveloperTasks[0].requiredChecks = [];
    config.approvedBranchDeveloperTasks[0].deliverableMode = "real-project-merge";
    config.approvedBranchDeveloperTasks[0].rollbackPlan = "";
    const result = inspectApprovedBranchDeveloperAlphaV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Approved branch developer task target branch must be safe and work/ scoped: phase100-demo-approved-branch-developer-alpha");
    expect(result.blockers).toContain("Approved branch developer task base ref must be main: phase100-demo-approved-branch-developer-alpha");
    expect(result.blockers).toContain("Approved branch developer task must name sourceBranchPlanId: phase100-demo-approved-branch-developer-alpha");
    expect(result.blockers).toContain("Approved branch developer task must name ownerApprovedMergeRunId: phase100-demo-approved-branch-developer-alpha");
    expect(result.blockers).toContain("Approved branch developer task target file must be safe and relative: phase100-demo-approved-branch-developer-alpha");
    expect(result.blockers).toContain("Approved branch developer task must use approved language target: phase100-demo-approved-branch-developer-alpha");
    expect(result.blockers).toContain("Approved branch developer task deliverableMode must stay evidence-only: phase100-demo-approved-branch-developer-alpha");
  });

  it("blocks unsafe project, Git, shell, fleet, and self-governance powers", () => {
    const config = createDefaultApprovedBranchDeveloperAlphaV1();
    config.owner = "S.E.R.A.";
    config.multiLanguageProductionTargets = config.multiLanguageProductionTargets.filter((language) => language !== "Rust");
    config.boundaries.projectRepoSourceMutationAllowed = true;
    config.boundaries.realProjectBranchCreationAllowed = true;
    config.boundaries.localGitBranchCreationAllowed = true;
    config.boundaries.remoteGitBranchCreationAllowed = true;
    config.boundaries.realProjectMergeExecutionAllowed = true;
    config.boundaries.gitPushAllowed = true;
    config.boundaries.tagCreationAllowed = true;
    config.boundaries.arbitraryCommandAllowed = true;
    config.boundaries.shellExecutionAllowed = true;
    config.boundaries.fleetExecutionAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    config.boundaries.selfMergeAllowed = true;
    config.boundaries.selfDeployAllowed = true;
    const result = inspectApprovedBranchDeveloperAlphaV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Owner must be Tyler Wallace for Phase 100 approved branch developer alpha.");
    expect(result.blockers).toContain("Multi-language production doctrine must include 18 useful language targets.");
    expect(result.blockers).toContain("Multi-language production target is missing: Rust");
    expect(result.blockers).toContain("projectRepoSourceMutationAllowed must remain false");
    expect(result.blockers).toContain("realProjectBranchCreationAllowed must remain false");
    expect(result.blockers).toContain("realProjectMergeExecutionAllowed must remain false");
    expect(result.blockers).toContain("gitPushAllowed must remain false");
    expect(result.blockers).toContain("tagCreationAllowed must remain false");
    expect(result.blockers).toContain("arbitraryCommandAllowed must remain false");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("fleetExecutionAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
    expect(result.blockers).toContain("selfMergeAllowed must remain false");
    expect(result.blockers).toContain("selfDeployAllowed must remain false");
  });

  it("records validation failure evidence when the isolated Alpha output does not match expectations", () => {
    const artifactRoot = tempRoot("phase100-approved-branch-developer-alpha-failure");
    const config = createDefaultApprovedBranchDeveloperAlphaV1();
    config.approvedBranchDeveloperTasks[0].expectedPostEditSha256 = "bad-hash";
    const result = runApprovedBranchDeveloperAlphaV1(config, { artifactRoot });
    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBe(1);
    expect(result.isolatedAlphaEvidenceProduced).toBe(false);
    expect(result.realProjectSourceMutated).toBe(false);
    expect(result.realProjectBranchCreated).toBe(false);
    expect(result.realProjectMergePerformed).toBe(false);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.status).toBe("approved-branch-developer-alpha-validation-failed");
    expect(packet.checks.filter((check: { passed: boolean }) => !check.passed).length).toBe(1);
  });
});

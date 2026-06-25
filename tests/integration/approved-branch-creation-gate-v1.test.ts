import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDefaultApprovedBranchCreationGateV1,
  inspectApprovedBranchCreationGateV1,
  multiLanguageProductionTargets,
  runApprovedBranchCreationGateDemoV1,
  runApprovedBranchCreationGateV1,
} from "../../scripts/lib/approved-branch-creation-gate-v1.mjs";

describe("approved branch creation gate v1", () => {
  it("passes when branch creation gate packets are owner-approved, safe-branch bound, validation-bound, and app-bound", () => {
    const result = inspectApprovedBranchCreationGateV1();
    expect(result.ok).toBe(true);
    expect(result.approvedBranchCreationGateStatus).toBe("approved-branch-creation-gate-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(6);
    expect(result.branchCreationGateRequirementCount).toBe(22);
    expect(result.branchCreationGateFieldCount).toBe(31);
    expect(result.approvedBranchCreationPlanCount).toBe(4);
    expect(result.sandboxLearningDoctrineStepCount).toBe(10);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.branchCreationGateEvidenceCount).toBe(22);
    expect(result.branchCreationGateSignalCount).toBe(44);
    expect(result.safetyGateCount).toBe(1060);
    expect(result.appBindingCount).toBe(7);
    expect(result.phase94ApprovedBranchPlanGeneratorReady).toBe(true);
    expect(result.phase93ApprovedBranchWorkspaceRunnerReady).toBe(true);
    expect(result.phase92ApprovedFilePatchRunnerReady).toBe(true);
    expect(result.phase91ApprovedValidationRunnerReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.exactPlanIdRequired).toBe(true);
    expect(result.safeWorkBranchNameRequired).toBe(true);
    expect(result.cleanWorkingTreeRequired).toBe(true);
    expect(result.multiLanguageProductionDoctrineRequired).toBe(true);
    expect(result.branchCreationGateAllowed).toBe(true);
    expect(result.sandboxBranchPracticeAllowed).toBe(true);
    expect(result.projectRepoBranchCreationAllowed).toBe(false);
    expect(result.localGitBranchCreationAllowed).toBe(false);
    expect(result.remoteGitBranchCreationAllowed).toBe(false);
    expect(result.gitPushAllowed).toBe(false);
    expect(result.patchExecutionAllowed).toBe(false);
    expect(result.sourceMutationAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
  });

  it("generates a branch creation gate packet without creating a real branch, pushing, patching, or mutating source", () => {
    const artifactRoot = path.join(process.cwd(), ".sera-approved-branch-creation-gate-test");
    fs.rmSync(artifactRoot, { recursive: true, force: true });
    const result = runApprovedBranchCreationGateDemoV1({ artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.generated).toBe(true);
    expect(result.branchCreationPlanId).toBe("phase95-demo-branch-creation-gate");
    expect(result.branchName).toBe("work/phase-95-demo-branch-creation-gate");
    expect(result.baseRef).toBe("main");
    expect(result.projectRepoBranchCreated).toBe(false);
    expect(result.localGitBranchCreated).toBe(false);
    expect(result.remoteBranchCreated).toBe(false);
    expect(result.gitPushPerformed).toBe(false);
    expect(result.patchExecuted).toBe(false);
    expect(result.sourceMutated).toBe(false);
    expect(result.sandboxBranchPracticeOnly).toBe(true);
    expect(result.multiLanguageProductionDoctrineIncluded).toBe(true);
    expect(fs.existsSync(result.packetJsonPath)).toBe(true);
    expect(fs.existsSync(result.packetMarkdownPath)).toBe(true);
    expect(fs.existsSync(result.safetyCheckPath)).toBe(true);
    expect(fs.existsSync(result.doctrinePath)).toBe(true);
    expect(fs.existsSync(result.sandboxMarkerPath)).toBe(true);
    const packet = JSON.parse(fs.readFileSync(result.packetJsonPath, "utf8"));
    expect(packet.validationSuites).toContain("phase95:demo");
    expect(packet.evidencePacket).toContain("branch-creation-packet.json");
    expect(packet.multiLanguageProductionTargets).toHaveLength(18);
    expect(fs.readFileSync(result.packetMarkdownPath, "utf8")).toContain("Future Boundary");
  });

  it("blocks branch creation gate packets when owner approval is missing, self-approved, or mismatched", () => {
    const missingApproval = createDefaultApprovedBranchCreationGateV1();
    missingApproval.approvalRecord.approved = false;
    const missingResult = runApprovedBranchCreationGateV1(missingApproval, { artifactRoot: path.join(process.cwd(), ".sera-approved-branch-creation-gate-test") });
    expect(missingResult.ok).toBe(false);
    expect(missingResult.status).toBe("blocked");
    expect(missingResult.blockers).toContain("Owner approval is required before branch creation gate packet generation");

    const selfApproved = createDefaultApprovedBranchCreationGateV1();
    selfApproved.approvalRecord.selfApproved = true;
    const selfResult = runApprovedBranchCreationGateV1(selfApproved, { artifactRoot: path.join(process.cwd(), ".sera-approved-branch-creation-gate-test") });
    expect(selfResult.ok).toBe(false);
    expect(selfResult.blockers).toContain("Approval record must not be self-approved");
    expect(selfResult.blockers).toContain("Self-approved branch creation gate packets are blocked");

    const mismatch = createDefaultApprovedBranchCreationGateV1();
    mismatch.approvalRecord.branchCreationPlanId = "missing-branch-plan";
    const mismatchResult = runApprovedBranchCreationGateV1(mismatch, { artifactRoot: path.join(process.cwd(), ".sera-approved-branch-creation-gate-test") });
    expect(mismatchResult.ok).toBe(false);
    expect(mismatchResult.blockers).toContain("Approved branch creation plan was not found in catalog: missing-branch-plan");
  });

  it("fails closed if unsafe branch creation, source mutation, patch execution, or language-doctrine removal is introduced", () => {
    const config = createDefaultApprovedBranchCreationGateV1();
    config.approvedBranchCreationPlans[0].branchName = "../escape";
    config.approvedBranchCreationPlans[0].targetFiles = ["../outside.ts"];
    config.approvedBranchCreationPlans[0].baseRef = "develop";
    config.approvedBranchCreationPlans[0].cleanWorkingTreeRequired = false;
    config.approvedBranchCreationPlans[0].projectRepoBranchCreation = true;
    config.approvedBranchCreationPlans[0].localGitBranchCreation = true;
    config.approvedBranchCreationPlans[0].remoteGitBranchCreation = true;
    config.approvedBranchCreationPlans[0].gitPush = true;
    config.approvedBranchCreationPlans[0].sourceMutation = true;
    config.approvedBranchCreationPlans[0].patchExecution = true;
    config.approvedBranchCreationPlans[0].multiLanguageProductionDoctrineRequired = false;
    config.multiLanguageProductionTargets = multiLanguageProductionTargets.filter((item) => item.language !== "Swift");
    config.boundaries.projectRepoBranchCreationAllowed = true;
    config.boundaries.localGitBranchCreationAllowed = true;
    config.boundaries.remoteGitBranchCreationAllowed = true;
    config.boundaries.gitPushAllowed = true;
    config.boundaries.patchExecutionAllowed = true;
    config.boundaries.sourceMutationAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    config.boundaries.selfMergeAllowed = true;
    const result = inspectApprovedBranchCreationGateV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Branch creation gate branch name must be safe and work/ scoped: phase95-demo-branch-creation-gate");
    expect(result.blockers).toContain("Branch creation target file must be safe and relative: phase95-demo-branch-creation-gate");
    expect(result.blockers).toContain("Branch creation base ref must be main: phase95-demo-branch-creation-gate");
    expect(result.blockers).toContain("Clean working tree must be required: phase95-demo-branch-creation-gate");
    expect(result.blockers).toContain("Project repository branch creation must remain blocked in Phase 95: phase95-demo-branch-creation-gate");
    expect(result.blockers).toContain("Local Git branch creation must remain blocked in Phase 95: phase95-demo-branch-creation-gate");
    expect(result.blockers).toContain("Remote Git branch creation must remain blocked in Phase 95: phase95-demo-branch-creation-gate");
    expect(result.blockers).toContain("Git push must remain blocked in Phase 95: phase95-demo-branch-creation-gate");
    expect(result.blockers).toContain("Source mutation must remain blocked in Phase 95: phase95-demo-branch-creation-gate");
    expect(result.blockers).toContain("Patch execution must remain blocked in Phase 95: phase95-demo-branch-creation-gate");
    expect(result.blockers).toContain("Multi-language production doctrine must be required: phase95-demo-branch-creation-gate");
    expect(result.blockers).toContain("Multi-language production doctrine must include 18 useful language targets");
    expect(result.blockers).toContain("Multi-language production target is missing: Swift");
    expect(result.blockers).toContain("projectRepoBranchCreationAllowed must remain false");
    expect(result.blockers).toContain("localGitBranchCreationAllowed must remain false");
    expect(result.blockers).toContain("remoteGitBranchCreationAllowed must remain false");
    expect(result.blockers).toContain("gitPushAllowed must remain false");
    expect(result.blockers).toContain("patchExecutionAllowed must remain false");
    expect(result.blockers).toContain("sourceMutationAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
    expect(result.blockers).toContain("selfMergeAllowed must remain false");
  });

  it("keeps S.E.R.A. scoped for useful projects across many coding languages instead of only Python", () => {
    const languages = multiLanguageProductionTargets.map((item) => item.language);
    expect(languages).toContain("Python");
    expect(languages).toContain("TypeScript");
    expect(languages).toContain("JavaScript");
    expect(languages).toContain("Swift");
    expect(languages).toContain("Kotlin");
    expect(languages).toContain("Dart");
    expect(languages).toContain("Java");
    expect(languages).toContain("C#");
    expect(languages).toContain("C++");
    expect(languages).toContain("C");
    expect(languages).toContain("Rust");
    expect(languages).toContain("Go");
    expect(languages).toContain("SQL");
    expect(languages).toContain("HTML/CSS");
    expect(languages).toContain("PowerShell");
    expect(languages).toContain("Bash");
    expect(multiLanguageProductionTargets.find((item) => item.language === "Swift")?.domain).toContain("iOS");
    expect(multiLanguageProductionTargets.find((item) => item.language === "C++")?.domain).toContain("Unreal");
    expect(multiLanguageProductionTargets.find((item) => item.language === "C")?.domain).toContain("microcontrollers");
  });
});

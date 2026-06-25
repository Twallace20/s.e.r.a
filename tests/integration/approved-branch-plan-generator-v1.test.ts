import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ambitiousSandboxDomains,
  createDefaultApprovedBranchPlanGeneratorV1,
  inspectApprovedBranchPlanGeneratorV1,
  runApprovedBranchPlanGenerationV1,
  runApprovedBranchPlanGeneratorDemoV1,
  sandboxLearningDoctrine,
} from "../../scripts/lib/approved-branch-plan-generator-v1.mjs";

describe("approved branch plan generator v1", () => {
  it("passes when branch plan generation is owner-approved, exact-catalog only, sandbox-doctrine bound, and app-bound", () => {
    const result = inspectApprovedBranchPlanGeneratorV1();
    expect(result.ok).toBe(true);
    expect(result.approvedBranchPlanGeneratorStatus).toBe("approved-branch-plan-generator-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(6);
    expect(result.branchPlanGeneratorRequirementCount).toBe(20);
    expect(result.branchPlanGeneratorFieldCount).toBe(27);
    expect(result.approvedPlanGenerationCount).toBe(4);
    expect(result.sandboxLearningDoctrineStepCount).toBe(10);
    expect(result.ambitiousSandboxDomainCount).toBe(10);
    expect(result.revenueAccelerationPhaseCount).toBe(20);
    expect(result.roadmapTrackCount).toBe(13);
    expect(result.branchPlanGeneratorEvidenceCount).toBe(20);
    expect(result.branchPlanGeneratorSignalCount).toBe(39);
    expect(result.safetyGateCount).toBe(1020);
    expect(result.appBindingCount).toBe(7);
    expect(result.phase93ApprovedBranchWorkspaceRunnerReady).toBe(true);
    expect(result.phase92ApprovedFilePatchRunnerReady).toBe(true);
    expect(result.phase91ApprovedValidationRunnerReady).toBe(true);
    expect(result.phase90ApprovalGatedLocalCommandRunnerReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.exactGenerationCatalogRequired).toBe(true);
    expect(result.safeBranchNameRequired).toBe(true);
    expect(result.sandboxLearningDoctrineRequired).toBe(true);
    expect(result.ambitiousDomainSupportRequired).toBe(true);
    expect(result.revenueAccelerationTrackRequired).toBe(true);
    expect(result.branchPlanGenerationAllowed).toBe(true);
    expect(result.localGitBranchCreationAllowed).toBe(false);
    expect(result.remoteGitBranchCreationAllowed).toBe(false);
    expect(result.gitPushAllowed).toBe(false);
    expect(result.patchExecutionAllowed).toBe(false);
    expect(result.sourceMutationAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
  });

  it("generates a branch plan packet without creating a branch, executing patches, or mutating source", () => {
    const artifactRoot = path.join(process.cwd(), ".sera-approved-branch-plan-generator-test");
    fs.rmSync(artifactRoot, { recursive: true, force: true });
    const result = runApprovedBranchPlanGeneratorDemoV1({ artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.generated).toBe(true);
    expect(result.generationPlanId).toBe("phase94-demo-branch-plan");
    expect(result.branchName).toBe("work/phase-94-demo-branch-plan");
    expect(result.baseRef).toBe("main");
    expect(result.localGitBranchCreated).toBe(false);
    expect(result.remoteGitBranchCreated).toBe(false);
    expect(result.pushedToRemote).toBe(false);
    expect(result.patchExecuted).toBe(false);
    expect(result.mutatesSource).toBe(false);
    expect(result.sandboxLearningDoctrineIncluded).toBe(true);
    expect(fs.existsSync(result.planJsonPath)).toBe(true);
    expect(fs.existsSync(result.planMarkdownPath)).toBe(true);
    expect(fs.existsSync(result.doctrinePath)).toBe(true);
    const planJson = JSON.parse(fs.readFileSync(result.planJsonPath, "utf8"));
    expect(planJson.validationSuites).toContain("phase93:demo");
    expect(planJson.evidencePacket).toContain("branch-plan.json");
    expect(planJson.sandboxLearningDoctrine).toHaveLength(10);
    expect(fs.readFileSync(result.planMarkdownPath, "utf8")).toContain("Sandbox Learning Doctrine");
  });

  it("blocks plan generation when owner approval is missing, self-approved, or mismatched", () => {
    const missingApproval = createDefaultApprovedBranchPlanGeneratorV1();
    missingApproval.approvalRecord.approved = false;
    const missingApprovalResult = runApprovedBranchPlanGenerationV1(missingApproval, { artifactRoot: path.join(process.cwd(), ".sera-approved-branch-plan-generator-test") });
    expect(missingApprovalResult.ok).toBe(false);
    expect(missingApprovalResult.status).toBe("blocked");
    expect(missingApprovalResult.blockers).toContain("Owner approval is required before branch plan generation");

    const selfApproved = createDefaultApprovedBranchPlanGeneratorV1();
    selfApproved.approvalRecord.selfApproved = true;
    const selfApprovedResult = runApprovedBranchPlanGenerationV1(selfApproved, { artifactRoot: path.join(process.cwd(), ".sera-approved-branch-plan-generator-test") });
    expect(selfApprovedResult.ok).toBe(false);
    expect(selfApprovedResult.blockers).toContain("Approval record must not be self-approved");
    expect(selfApprovedResult.blockers).toContain("Self-approved branch plan generation packets are blocked");

    const mismatch = createDefaultApprovedBranchPlanGeneratorV1();
    mismatch.approvalRecord.generationPlanId = "missing-generation-plan";
    const mismatchResult = runApprovedBranchPlanGenerationV1(mismatch, { artifactRoot: path.join(process.cwd(), ".sera-approved-branch-plan-generator-test") });
    expect(mismatchResult.ok).toBe(false);
    expect(mismatchResult.blockers).toContain("Approved generation plan was not found in catalog: missing-generation-plan");
  });

  it("fails closed if unsafe branch creation, source mutation, patch execution, or missing doctrine is introduced", () => {
    const config = createDefaultApprovedBranchPlanGeneratorV1();
    config.approvedPlanGenerations[0].branchName = "../escape";
    config.approvedPlanGenerations[0].targetFiles = ["../outside.ts"];
    config.approvedPlanGenerations[0].sourceMutation = true;
    config.approvedPlanGenerations[0].localGitBranchCreation = true;
    config.approvedPlanGenerations[0].remoteGitBranchCreation = true;
    config.approvedPlanGenerations[0].gitPush = true;
    config.approvedPlanGenerations[0].patchExecutionDisabledInPhase94 = false;
    config.approvedPlanGenerations[0].creationDisabledInPhase94 = false;
    config.sandboxLearningDoctrine = sandboxLearningDoctrine.slice(0, 9);
    config.ambitiousSandboxDomains = ambitiousSandboxDomains.filter((item) => item !== "AAA-style game prototype or vertical slice");
    config.boundaries.localGitBranchCreationAllowed = true;
    config.boundaries.remoteGitBranchCreationAllowed = true;
    config.boundaries.gitPushAllowed = true;
    config.boundaries.patchExecutionAllowed = true;
    config.boundaries.sourceMutationAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    config.boundaries.selfMergeAllowed = true;
    const result = inspectApprovedBranchPlanGeneratorV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Generated branch name must be safe and work/ scoped: phase94-demo-branch-plan");
    expect(result.blockers).toContain("Generated branch plan target file must be safe and relative: phase94-demo-branch-plan");
    expect(result.blockers).toContain("Phase 94 plans must not mutate repository source: phase94-demo-branch-plan");
    expect(result.blockers).toContain("Phase 94 plans must not create real local Git branches: phase94-demo-branch-plan");
    expect(result.blockers).toContain("Phase 94 plans must not create remote Git branches: phase94-demo-branch-plan");
    expect(result.blockers).toContain("Phase 94 plans must not push to Git remotes: phase94-demo-branch-plan");
    expect(result.blockers).toContain("Patch execution must remain disabled in Phase 94: phase94-demo-branch-plan");
    expect(result.blockers).toContain("Branch creation must remain disabled in Phase 94: phase94-demo-branch-plan");
    expect(result.blockers).toContain("Sandbox Learning Doctrine must include the 10-step study/practice/refine/validate loop");
    expect(result.blockers).toContain("Ambitious sandbox domain is missing: AAA-style game prototype or vertical slice");
    expect(result.blockers).toContain("localGitBranchCreationAllowed must remain false");
    expect(result.blockers).toContain("remoteGitBranchCreationAllowed must remain false");
    expect(result.blockers).toContain("gitPushAllowed must remain false");
    expect(result.blockers).toContain("patchExecutionAllowed must remain false");
    expect(result.blockers).toContain("sourceMutationAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
    expect(result.blockers).toContain("selfMergeAllowed must remain false");
  });

  it("keeps ambitious production domains in scope through sandbox-first learning rather than pretending they are impossible", () => {
    expect(sandboxLearningDoctrine.map((item) => item.title)).toEqual([
      "Study the domain",
      "Create notes",
      "Design safe practice tasks",
      "Attempt in sandbox",
      "Record evidence",
      "Refine notes",
      "Try again",
      "Validate",
      "Escalate when risky",
      "Graduate by approval",
    ]);
    expect(ambitiousSandboxDomains).toContain("iOS app from scratch");
    expect(ambitiousSandboxDomains).toContain("production website or Wix/Webflow/custom site");
    expect(ambitiousSandboxDomains).toContain("realistic AI YouTube presenter video");
    expect(ambitiousSandboxDomains).toContain("AAA-style game prototype or vertical slice");
    expect(ambitiousSandboxDomains).toContain("movie, short film, trailer, or animatic");
    expect(ambitiousSandboxDomains).toContain("robotics simulation and control prototype");
    expect(ambitiousSandboxDomains).toContain("circuitry and electronics simulation");
    expect(ambitiousSandboxDomains).toContain("solar energy routing or controller design in a safe lab/simulator");
  });
});

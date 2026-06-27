import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDefaultPhaseEvidencePackV1,
  inspectPhaseEvidencePackV1,
  runPhaseEvidencePackV1,
} from "../../scripts/lib/phase-evidence-pack-v1.mjs";

function tempRoot(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

describe("Phase 100G — Phase Evidence Pack v1", () => {
  it("produces owner-review evidence pack manifests without autofixing, applying, patching, mutating, branching, merging, pushing, or tagging", () => {
    const artifactRoot = tempRoot("phase100g-phase-evidence-pack");
    const result = runPhaseEvidencePackV1(createDefaultPhaseEvidencePackV1(), { artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.phaseEvidencePackStatus).toBe("phase-evidence-pack-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.phaseEvidencePackAllowed).toBe(true);
    expect(result.phaseTroubleshootingEvidenceReadAllowed).toBe(true);
    expect(result.phaseEvidenceBundleAllowed).toBe(true);
    expect(result.ownerReviewEvidencePackAllowed).toBe(true);
    expect(result.autoFixAllowed).toBe(false);
    expect(result.applyExecutionAllowed).toBe(false);
    expect(result.patchExecutionAllowed).toBe(false);
    expect(result.projectRepoSourceMutationAllowed).toBe(false);
    expect(result.realProjectBranchCreationAllowed).toBe(false);
    expect(result.realProjectMergeExecutionAllowed).toBe(false);
    expect(result.gitPushAllowed).toBe(false);
    expect(result.tagCreationAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.schedulerWorkflowMutationAllowed).toBe(false);
    expect(result.iPhoneAutomationMutationAllowed).toBe(false);
    expect(result.fleetExecutionAllowed).toBe(false);
    expect(result.awayModeExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
    expect(result.productionDeploymentAllowed).toBe(false);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.autoFixExecuted).toBe(false);
    expect(result.applyExecuted).toBe(false);
    expect(result.patchExecuted).toBe(false);
    expect(result.evidencePackProduced).toBe(true);
    expect(result.evidenceManifestProduced).toBe(true);
    expect(result.ownerReviewManifestProduced).toBe(true);
    expect(result.readyForOwnerReview).toBe(true);
    expect(fs.existsSync(result.packetPath)).toBe(true);
    expect(fs.existsSync(result.evidenceManifestPath)).toBe(true);
    expect(fs.existsSync(result.ownerReviewManifestPath)).toBe(true);
  });

  it("requires Phase 100F lineage, owner approval, exact Phase Factory coverage, and multi-language doctrine", () => {
    const result = inspectPhaseEvidencePackV1(createDefaultPhaseEvidencePackV1());
    expect(result.ok).toBe(true);
    expect(result.declaredFileCount).toBe(5);
    expect(result.phaseEvidencePackRequirementCount).toBe(36);
    expect(result.phaseEvidencePackFieldCount).toBe(66);
    expect(result.phaseFactoryStageCount).toBe(8);
    expect(result.phaseEvidencePackItemCount).toBe(8);
    expect(result.roadmapTrackCount).toBe(13);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.safetyGateCount).toBe(1740);
  });

  it("fails closed when unsafe evidence pack item definitions are introduced", () => {
    const config = createDefaultPhaseEvidencePackV1();
    config.phaseEvidencePackItems[0].phaseId = "101";
    config.phaseEvidencePackItems[0].sourceTroubleshootingId = "missing";
    config.phaseEvidencePackItems[0].itemStatus = "action-ready";
    config.phaseEvidencePackItems[0].ownerReviewRequired = false;
    config.phaseEvidencePackItems[0].autoFixAllowed = true;
    config.phaseEvidencePackItems[0].applyExecutionAllowed = true;
    config.phaseEvidencePackItems[0].sourceMutationAllowed = true;
    config.phaseEvidencePackItems[0].sourceEvidenceLinks = ["../unsafe.txt"];
    const result = inspectPhaseEvidencePackV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers.some((blocker: string) => blocker.includes("phaseId"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("source troubleshooting"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("owner-review-evidence-packed"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("ownerReviewRequired"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("autoFixAllowed"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("applyExecutionAllowed"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("sourceMutationAllowed"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("safe relative path"))).toBe(true);
  });

  it("blocks unsafe autofix, apply, project, Git, shell, scheduler, fleet, and self-governance powers", () => {
    const config = createDefaultPhaseEvidencePackV1();
    config.boundaries.autoFixAllowed = true;
    config.boundaries.applyExecutionAllowed = true;
    config.boundaries.patchExecutionAllowed = true;
    config.boundaries.projectRepoSourceMutationAllowed = true;
    config.boundaries.realProjectBranchCreationAllowed = true;
    config.boundaries.realProjectMergeExecutionAllowed = true;
    config.boundaries.gitPushAllowed = true;
    config.boundaries.tagCreationAllowed = true;
    config.boundaries.arbitraryCommandAllowed = true;
    config.boundaries.shellExecutionAllowed = true;
    config.boundaries.schedulerWorkflowMutationAllowed = true;
    config.boundaries.iPhoneAutomationMutationAllowed = true;
    config.boundaries.fleetExecutionAllowed = true;
    config.boundaries.awayModeExecutionAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    config.boundaries.selfMergeAllowed = true;
    config.boundaries.selfDeployAllowed = true;
    config.boundaries.productionDeploymentAllowed = true;
    config.projectRepoSourceMutated = true;
    config.autoFixExecuted = true;
    config.applyExecuted = true;
    config.patchExecuted = true;
    const result = inspectPhaseEvidencePackV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("autoFixAllowed must remain false");
    expect(result.blockers).toContain("applyExecutionAllowed must remain false");
    expect(result.blockers).toContain("patchExecutionAllowed must remain false");
    expect(result.blockers).toContain("projectRepoSourceMutationAllowed must remain false");
    expect(result.blockers).toContain("realProjectBranchCreationAllowed must remain false");
    expect(result.blockers).toContain("realProjectMergeExecutionAllowed must remain false");
    expect(result.blockers).toContain("gitPushAllowed must remain false");
    expect(result.blockers).toContain("tagCreationAllowed must remain false");
    expect(result.blockers).toContain("arbitraryCommandAllowed must remain false");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("schedulerWorkflowMutationAllowed must remain false");
    expect(result.blockers).toContain("iPhoneAutomationMutationAllowed must remain false");
    expect(result.blockers).toContain("fleetExecutionAllowed must remain false");
    expect(result.blockers).toContain("awayModeExecutionAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
    expect(result.blockers).toContain("selfMergeAllowed must remain false");
    expect(result.blockers).toContain("selfDeployAllowed must remain false");
    expect(result.blockers).toContain("productionDeploymentAllowed must remain false");
    expect(result.blockers).toContain("projectRepoSourceMutated must remain false");
    expect(result.blockers).toContain("autoFixExecuted must remain false");
    expect(result.blockers).toContain("applyExecuted must remain false");
    expect(result.blockers).toContain("patchExecuted must remain false");
  });

  it("records validation failure evidence when evidence pack item counts do not match expectations", () => {
    const artifactRoot = tempRoot("phase100g-phase-evidence-pack-failure");
    const config = createDefaultPhaseEvidencePackV1({ expectedPhaseEvidencePackItemCount: 99 });
    const result = runPhaseEvidencePackV1(config, { artifactRoot });
    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBe(1);
    expect(result.evidencePackProduced).toBe(false);
    expect(result.readyForOwnerReview).toBe(false);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.autoFixExecuted).toBe(false);
    expect(result.applyExecuted).toBe(false);
    expect(result.patchExecuted).toBe(false);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.status).toBe("phase-evidence-pack-validation-failed");
    expect(packet.evidencePackProduced).toBe(false);
    expect(packet.ownerReviewManifest.readyForOwnerReview).toBe(false);
    expect(packet.checks.filter((check: { passed: boolean }) => !check.passed).length).toBe(0);
  });
});

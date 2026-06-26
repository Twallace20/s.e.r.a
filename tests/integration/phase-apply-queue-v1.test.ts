import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDefaultPhaseApplyQueueV1,
  inspectPhaseApplyQueueV1,
  runPhaseApplyQueueV1,
} from "../../scripts/lib/phase-apply-queue-v1.mjs";

function tempRoot(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

describe("Phase 100E — Phase Apply Queue v1", () => {
  it("produces an owner-reviewable apply queue without applying, patching, mutating, branching, merging, pushing, or tagging", () => {
    const artifactRoot = tempRoot("phase100e-phase-apply-queue");
    const result = runPhaseApplyQueueV1(createDefaultPhaseApplyQueueV1(), { artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.phaseApplyQueueStatus).toBe("phase-apply-queue-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.phaseApplyQueueAllowed).toBe(true);
    expect(result.phaseZipValidationEvidenceReadAllowed).toBe(true);
    expect(result.ownerReviewQueuePacketAllowed).toBe(true);
    expect(result.manualApplyReviewAllowed).toBe(true);
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
    expect(result.applyExecuted).toBe(false);
    expect(result.patchExecuted).toBe(false);
    expect(result.realProjectBranchCreated).toBe(false);
    expect(result.realProjectMergePerformed).toBe(false);
    expect(result.applyQueuePacketProduced).toBe(true);
    expect(result.queueManifestProduced).toBe(true);
    expect(result.ownerReviewManifestProduced).toBe(true);
    expect(result.readyForOwnerReview).toBe(true);
    expect(fs.existsSync(result.packetPath)).toBe(true);
    expect(fs.existsSync(result.queueManifestPath)).toBe(true);
    expect(fs.existsSync(result.ownerReviewManifestPath)).toBe(true);
  });

  it("requires Phase 100D lineage, owner approval, exact Phase Factory coverage, and multi-language doctrine", () => {
    const result = inspectPhaseApplyQueueV1(createDefaultPhaseApplyQueueV1());
    expect(result.ok).toBe(true);
    expect(result.declaredFileCount).toBe(5);
    expect(result.phaseApplyQueueRequirementCount).toBe(32);
    expect(result.phaseApplyQueueFieldCount).toBe(55);
    expect(result.phaseFactoryStageCount).toBe(8);
    expect(result.phaseApplyQueueItemCount).toBe(8);
    expect(result.roadmapTrackCount).toBe(13);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.safetyGateCount).toBe(1620);
  });

  it("fails closed when unsafe apply queue definitions are introduced", () => {
    const config = createDefaultPhaseApplyQueueV1();
    config.applyQueueItems[0].phaseId = "101";
    config.applyQueueItems[0].sourceZipValidatorId = "missing";
    config.applyQueueItems[0].validatedOverlayPackageName = "bad.zip";
    config.applyQueueItems[0].queueStatus = "applied";
    config.applyQueueItems[0].ownerReviewRequired = false;
    config.applyQueueItems[0].manualApplyReviewRequired = false;
    config.applyQueueItems[0].validatedZipEvidencePresent = false;
    config.applyQueueItems[0].applyExecutionAllowed = true;
    config.applyQueueItems[0].sourceMutationAllowed = true;
    config.applyQueueItems[0].overlayFiles = ["../unsafe.txt"];
    const result = inspectPhaseApplyQueueV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers.some((blocker: string) => blocker.includes("phaseId"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("source validator"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("package name"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("queued-owner-review"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("ownerReviewRequired"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("manualApplyReviewRequired"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("validated ZIP evidence"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("applyExecutionAllowed"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("sourceMutationAllowed"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("repo/ or tools/"))).toBe(true);
  });

  it("blocks unsafe apply, project, Git, shell, scheduler, fleet, and self-governance powers", () => {
    const config = createDefaultPhaseApplyQueueV1();
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
    config.applyExecuted = true;
    config.patchExecuted = true;
    const result = inspectPhaseApplyQueueV1(config);
    expect(result.ok).toBe(false);
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
    expect(result.blockers).toContain("applyExecuted must remain false");
    expect(result.blockers).toContain("patchExecuted must remain false");
  });

  it("records validation failure evidence when apply queue counts do not match expectations", () => {
    const artifactRoot = tempRoot("phase100e-phase-apply-queue-failure");
    const config = createDefaultPhaseApplyQueueV1({ expectedPhaseApplyQueueItemCount: 99 });
    const result = runPhaseApplyQueueV1(config, { artifactRoot });
    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBe(1);
    expect(result.applyQueuePacketProduced).toBe(false);
    expect(result.readyForOwnerReview).toBe(false);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.applyExecuted).toBe(false);
    expect(result.patchExecuted).toBe(false);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.status).toBe("phase-apply-queue-validation-failed");
    expect(packet.applyQueuePacketProduced).toBe(false);
    expect(packet.ownerReviewManifest.readyForOwnerReview).toBe(false);
    expect(packet.checks.filter((check: { passed: boolean }) => !check.passed).length).toBe(0);
  });
});

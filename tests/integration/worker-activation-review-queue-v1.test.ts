import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultWorkerActivationReviewQueueV1, inspectWorkerActivationReviewQueueV1, runWorkerActivationReviewQueueV1 } from "../../scripts/lib/worker-activation-review-queue-v1.mjs";

function tempRoot(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `sera-${name}-`));
}

describe("Phase 103 — Worker Activation Review Queue v1", () => {
  it("produces owner-review worker activation queue evidence without activation or execution", () => {
    const artifactRoot = tempRoot("phase103-worker-activation-review-queue");
    const result = runWorkerActivationReviewQueueV1(createDefaultWorkerActivationReviewQueueV1(), { artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.workerActivationReviewQueueStatus).toBe("worker-activation-review-queue-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.workerActivationReviewQueueRequirementCount).toBe(44);
    expect(result.workerActivationReviewQueueFieldCount).toBe(90);
    expect(result.activationQueueItemCount).toBe(12);
    expect(result.decisionTemplateCount).toBe(12);
    expect(result.readinessChecklistCount).toBe(12);
    expect(result.roadmapTrackCount).toBe(13);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.safetyGateCount).toBe(1980);
    expect(result.workerActivationReviewQueueAllowed).toBe(true);
    expect(result.workerCapabilityCardsReadAllowed).toBe(true);
    expect(result.activationQueueManifestAllowed).toBe(true);
    expect(result.ownerReviewActivationPacketAllowed).toBe(true);
    expect(result.activationDecisionDraftAllowed).toBe(true);
    expect(result.workerActivationAllowed).toBe(false);
    expect(result.workerExecutionAllowed).toBe(false);
    expect(result.workerSpawningAllowed).toBe(false);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.workerActivated).toBe(false);
    expect(result.workerExecuted).toBe(false);
    expect(result.activationReviewPacketProduced).toBe(true);
    expect(result.activationQueueManifestProduced).toBe(true);
    expect(result.activationDecisionDraftsProduced).toBe(true);
    expect(result.readinessChecklistManifestProduced).toBe(true);
    expect(result.ownerReviewManifestProduced).toBe(true);
    expect(result.readyForOwnerReview).toBe(true);
    expect(fs.existsSync(result.packetPath)).toBe(true);
    expect(fs.existsSync(result.activationQueueManifestPath)).toBe(true);
    expect(fs.existsSync(result.activationReviewQueuePath)).toBe(true);
    expect(fs.existsSync(result.ownerReviewManifestPath)).toBe(true);
  });

  it("requires Phase 102 lineage and Tyler approval", () => {
    const config = createDefaultWorkerActivationReviewQueueV1();
    config.phase102WorkerCapabilityCardsReady = false;
    config.sourceWorkerCapabilityCardsId = "wrong-capability-cards";
    config.approvalRecord.approved = false;
    config.approvalRecord.selfApproved = true;
    const result = inspectWorkerActivationReviewQueueV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Phase 102 Worker Capability Cards must be ready before Phase 103.");
    expect(result.blockers).toContain("Phase 103 must link to the Phase 102 Worker Capability Cards.");
    expect(result.blockers).toContain("Tyler Wallace approval record is required for Phase 103 Worker Activation Review Queue.");
    expect(result.blockers).toContain("Self-approval is blocked for Phase 103 Worker Activation Review Queue.");
  });

  it("fails closed for unsafe or incomplete activation queue items", () => {
    const config = createDefaultWorkerActivationReviewQueueV1();
    config.activationReviewQueue[0].queueItemId = "unsafe-queue";
    config.activationReviewQueue[0].workerId = "phase-planner";
    config.activationReviewQueue[0].cardId = "unsafe-card";
    config.activationReviewQueue[0].queueStatus = "approved";
    config.activationReviewQueue[0].activationState = "activated";
    config.activationReviewQueue[0].reviewLevel = "execute";
    config.activationReviewQueue[0].ownerReviewRequired = false;
    config.activationReviewQueue[0].activationBoundary = "auto-run";
    config.activationReviewQueue[0].autoApprovalAllowed = true;
    config.activationReviewQueue[0].hiddenActivationPermissions = true;
    config.activationReviewQueue[0].activationAllowed = true;
    config.activationReviewQueue[0].executionAllowed = true;
    config.activationReviewQueue[0].evidenceReferences = [];
    config.activationReviewQueue[0].readinessChecklist = [];
    config.activationReviewQueue[0].decisionDraft = { recommendedDecision: "activate", activationApproved: true };
    config.declaredPaths = ["../unsafe.txt"];
    const result = inspectWorkerActivationReviewQueueV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers.some((blocker: string) => blocker.includes("safe relative path"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("activation-review.worker"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("safe worker"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("safe card.worker"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("pending-owner-review"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("not-activated"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("review-only"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("owner review"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("manual-owner-approval-only"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("Automatic worker activation approval"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("hidden worker activation permissions"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("activation must remain blocked"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("execution must remain blocked"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("evidence references"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("readiness checklist"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("hold-for-owner-review"))).toBe(true);
  });

  it("blocks unsafe worker activation, automation, project, Git, shell, fleet, and self-governance powers", () => {
    const result = inspectWorkerActivationReviewQueueV1(createDefaultWorkerActivationReviewQueueV1({
      boundaries: {
        workerActivationAllowed: true,
        workerExecutionAllowed: true,
        workerSpawningAllowed: true,
        autonomousDelegationAllowed: true,
        schedulerWorkflowMutationAllowed: true,
        iPhoneAutomationMutationAllowed: true,
        awayModeExecutionAllowed: true,
        fleetExecutionAllowed: true,
        applyExecutionAllowed: true,
        patchExecutionAllowed: true,
        projectRepoSourceMutationAllowed: true,
        realProjectBranchCreationAllowed: true,
        realProjectMergeExecutionAllowed: true,
        gitPushAllowed: true,
        tagCreationAllowed: true,
        arbitraryCommandAllowed: true,
        shellExecutionAllowed: true,
        selfApprovalAllowed: true,
        selfMergeAllowed: true,
        selfDeployAllowed: true,
        productionDeploymentAllowed: true,
      },
      workerActivated: true,
      workerExecuted: true,
      workerSpawned: true,
      autonomousDelegationExecuted: true,
      projectRepoSourceMutated: true,
      schedulerWorkflowMutated: true,
      iPhoneAutomationMutated: true,
      awayModeExecuted: true,
      fleetExecuted: true,
      applyExecuted: true,
      patchExecuted: true,
      realProjectBranchCreated: true,
      realProjectMergePerformed: true,
      gitPushPerformed: true,
      tagCreated: true,
      shellExecuted: true,
      productionDeployed: true,
    }));
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("workerActivationAllowed must remain false");
    expect(result.blockers).toContain("workerExecutionAllowed must remain false");
    expect(result.blockers).toContain("workerSpawningAllowed must remain false");
    expect(result.blockers).toContain("projectRepoSourceMutationAllowed must remain false");
    expect(result.blockers).toContain("gitPushAllowed must remain false");
    expect(result.blockers).toContain("tagCreationAllowed must remain false");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
    expect(result.blockers).toContain("productionDeploymentAllowed must remain false");
    expect(result.blockers).toContain("workerActivated must remain false");
    expect(result.blockers).toContain("workerExecuted must remain false");
    expect(result.blockers).toContain("autonomousDelegationExecuted must remain false");
  });

  it("records validation failure evidence when activation queue counts do not match expectations", () => {
    const artifactRoot = tempRoot("phase103-worker-activation-review-queue-failure");
    const config = createDefaultWorkerActivationReviewQueueV1({ expectedActivationQueueItemCount: 99 });
    const result = runWorkerActivationReviewQueueV1(config, { artifactRoot });
    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBe(1);
    expect(result.readyForOwnerReview).toBe(false);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.workerActivated).toBe(false);
    expect(result.workerExecuted).toBe(false);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.status).toBe("worker-activation-review-queue-validation-failed");
    expect(packet.ownerReviewManifest.readyForOwnerReview).toBe(false);
    expect(packet.checks.filter((check: { passed: boolean }) => !check.passed).length).toBe(1);
  });
});

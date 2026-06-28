import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultWorkerActivationGateV1, inspectWorkerActivationGateV1, runWorkerActivationGateV1 } from "../../scripts/lib/worker-activation-gate-v1.mjs";

function tempRoot(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `sera-${name}-`));
}

describe("Phase 104 — Worker Activation Gate v1", () => {
  it("produces owner-review worker activation gate evidence without activation or execution", () => {
    const artifactRoot = tempRoot("phase104-worker-activation-gate");
    const result = runWorkerActivationGateV1(createDefaultWorkerActivationGateV1(), { artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.workerActivationGateStatus).toBe("worker-activation-gate-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.workerActivationGateRequirementCount).toBe(46);
    expect(result.workerActivationGateFieldCount).toBe(100);
    expect(result.activationGateItemCount).toBe(12);
    expect(result.eligibilityReviewCount).toBe(12);
    expect(result.gateDecisionDraftCount).toBe(12);
    expect(result.readinessGateChecklistCount).toBe(12);
    expect(result.roadmapTrackCount).toBe(13);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.safetyGateCount).toBe(2040);
    expect(result.workerActivationGateAllowed).toBe(true);
    expect(result.workerActivationReviewQueueReadAllowed).toBe(true);
    expect(result.activationGateManifestAllowed).toBe(true);
    expect(result.ownerReviewActivationGatePacketAllowed).toBe(true);
    expect(result.activationEligibilityReviewAllowed).toBe(true);
    expect(result.activationGateDecisionDraftAllowed).toBe(true);
    expect(result.workerActivationAllowed).toBe(false);
    expect(result.workerExecutionAllowed).toBe(false);
    expect(result.workerSpawningAllowed).toBe(false);
    expect(result.activationTokenIssued).toBe(false);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.workerActivated).toBe(false);
    expect(result.workerExecuted).toBe(false);
    expect(result.activationGatePacketProduced).toBe(true);
    expect(result.activationGateManifestProduced).toBe(true);
    expect(result.eligibilityReviewManifestProduced).toBe(true);
    expect(result.activationGateDecisionDraftsProduced).toBe(true);
    expect(result.readinessGateChecklistManifestProduced).toBe(true);
    expect(result.ownerReviewManifestProduced).toBe(true);
    expect(result.readyForOwnerReview).toBe(true);
    expect(fs.existsSync(result.packetPath)).toBe(true);
    expect(fs.existsSync(result.activationGateManifestPath)).toBe(true);
    expect(fs.existsSync(result.activationGateItemsPath)).toBe(true);
    expect(fs.existsSync(result.ownerReviewManifestPath)).toBe(true);
    expect(fs.existsSync(result.activationTokenManifestPath)).toBe(true);
  });

  it("requires Phase 103 lineage and Tyler approval", () => {
    const config = createDefaultWorkerActivationGateV1();
    config.phase103WorkerActivationReviewQueueReady = false;
    config.sourceWorkerActivationReviewQueueId = "wrong-activation-review-queue";
    config.approvalRecord.approved = false;
    config.approvalRecord.selfApproved = true;
    const result = inspectWorkerActivationGateV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Phase 103 Worker Activation Review Queue must be ready before Phase 104.");
    expect(result.blockers).toContain("Phase 104 must link to the Phase 103 Worker Activation Review Queue.");
    expect(result.blockers).toContain("Tyler Wallace approval record is required for Phase 104 Worker Activation Gate.");
    expect(result.blockers).toContain("Self-approval is blocked for Phase 104 Worker Activation Gate.");
  });

  it("fails closed for unsafe or incomplete activation gate items", () => {
    const config = createDefaultWorkerActivationGateV1();
    config.activationGateItems[0].gateItemId = "unsafe-gate";
    config.activationGateItems[0].workerId = "phase-planner";
    config.activationGateItems[0].sourceQueueItemId = "unsafe-queue";
    config.activationGateItems[0].gateStatus = "approved";
    config.activationGateItems[0].activationEligibilityStatus = "eligible";
    config.activationGateItems[0].gateLevel = "execute";
    config.activationGateItems[0].ownerGateReviewRequired = false;
    config.activationGateItems[0].activationBoundary = "auto-run";
    config.activationGateItems[0].autoApprovalAllowed = true;
    config.activationGateItems[0].hiddenActivationPermissions = true;
    config.activationGateItems[0].activationTokenIssued = true;
    config.activationGateItems[0].activationAllowed = true;
    config.activationGateItems[0].executionAllowed = true;
    config.activationGateItems[0].queueEvidenceReferences = [];
    config.activationGateItems[0].readinessGateChecklist = [];
    config.activationGateItems[0].gateDecisionDraft = { recommendedDecision: "activate", activationApproved: true, activationTokenIssued: true };
    config.declaredPaths = ["../unsafe.txt"];
    const result = inspectWorkerActivationGateV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers.some((blocker: string) => blocker.includes("safe relative path"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("activation-gate.worker"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("safe worker"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("Phase 103 activation-review.worker reference"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("pending-owner-gate-review"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("not-eligible-for-activation-yet"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("review-only"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("owner gate review"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("manual-owner-approval-only"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("Automatic worker activation gate approval"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("hidden worker activation permissions"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("No activation token"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("activation must remain blocked"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("execution must remain blocked"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("queue evidence references"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("readiness gate checklist"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("hold-for-owner-gate-review"))).toBe(true);
  });

  it("blocks unsafe worker activation, automation, project, Git, shell, fleet, token, and self-governance powers", () => {
    const result = inspectWorkerActivationGateV1(createDefaultWorkerActivationGateV1({
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
      activationTokenIssued: true,
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
    expect(result.blockers).toContain("activationTokenIssued must remain false");
  });

  it("records validation failure evidence when activation gate counts do not match expectations", () => {
    const artifactRoot = tempRoot("phase104-worker-activation-gate-failure");
    const config = createDefaultWorkerActivationGateV1({ expectedActivationGateItemCount: 99 });
    const result = runWorkerActivationGateV1(config, { artifactRoot });
    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBe(1);
    expect(result.readyForOwnerReview).toBe(false);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.workerActivated).toBe(false);
    expect(result.workerExecuted).toBe(false);
    expect(result.activationTokenIssued).toBe(false);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.status).toBe("worker-activation-gate-validation-failed");
    expect(packet.ownerReviewManifest.readyForOwnerReview).toBe(false);
    expect(packet.activationTokenManifest.activationTokenIssued).toBe(false);
    expect(packet.checks.filter((check: { passed: boolean }) => !check.passed).length).toBe(1);
  });
});

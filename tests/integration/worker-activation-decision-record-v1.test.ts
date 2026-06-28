import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultWorkerActivationDecisionRecordV1, inspectWorkerActivationDecisionRecordV1, runWorkerActivationDecisionRecordV1 } from "../../scripts/lib/worker-activation-decision-record-v1.mjs";

function tempRoot(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `sera-${name}-`));
}

describe("Phase 105 — Worker Activation Decision Record v1", () => {
  it("produces owner-review worker activation decision records without activation or execution", () => {
    const artifactRoot = tempRoot("phase105-worker-activation-decision-record");
    const result = runWorkerActivationDecisionRecordV1(createDefaultWorkerActivationDecisionRecordV1(), { artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.workerActivationDecisionRecordStatus).toBe("worker-activation-decision-record-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.workerActivationDecisionRecordRequirementCount).toBe(48);
    expect(result.workerActivationDecisionRecordFieldCount).toBe(106);
    expect(result.activationDecisionRecordCount).toBe(12);
    expect(result.ownerActivationDecisionRecordCount).toBe(12);
    expect(result.decisionAuditRecordCount).toBe(12);
    expect(result.activationDenialRecordCount).toBe(12);
    expect(result.roadmapTrackCount).toBe(13);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.safetyGateCount).toBe(2100);
    expect(result.workerActivationDecisionRecordAllowed).toBe(true);
    expect(result.workerActivationGateReadAllowed).toBe(true);
    expect(result.activationDecisionRecordManifestAllowed).toBe(true);
    expect(result.ownerReviewDecisionRecordPacketAllowed).toBe(true);
    expect(result.ownerActivationDecisionDraftAllowed).toBe(true);
    expect(result.activationDenialRecordAllowed).toBe(true);
    expect(result.workerActivationAllowed).toBe(false);
    expect(result.workerExecutionAllowed).toBe(false);
    expect(result.workerSpawningAllowed).toBe(false);
    expect(result.activationTokenIssued).toBe(false);
    expect(result.activationCredentialIssued).toBe(false);
    expect(result.activationImplementationBlocked).toBe(true);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.workerActivated).toBe(false);
    expect(result.workerExecuted).toBe(false);
    expect(result.activationDecisionRecordPacketProduced).toBe(true);
    expect(result.activationDecisionRecordManifestProduced).toBe(true);
    expect(result.ownerActivationDecisionRecordManifestProduced).toBe(true);
    expect(result.decisionAuditManifestProduced).toBe(true);
    expect(result.activationDenialManifestProduced).toBe(true);
    expect(result.ownerReviewManifestProduced).toBe(true);
    expect(result.readyForOwnerReview).toBe(true);
    expect(fs.existsSync(result.packetPath)).toBe(true);
    expect(fs.existsSync(result.activationDecisionRecordManifestPath)).toBe(true);
    expect(fs.existsSync(result.activationDecisionRecordsPath)).toBe(true);
    expect(fs.existsSync(result.ownerReviewManifestPath)).toBe(true);
    expect(fs.existsSync(result.activationTokenManifestPath)).toBe(true);
    expect(fs.existsSync(result.decisionRecordLedgerPath)).toBe(true);
  });

  it("requires Phase 104 lineage and Tyler approval", () => {
    const config = createDefaultWorkerActivationDecisionRecordV1();
    config.phase104WorkerActivationGateReady = false;
    config.sourceWorkerActivationGateId = "wrong-activation-gate";
    config.approvalRecord.approved = false;
    config.approvalRecord.selfApproved = true;
    const result = inspectWorkerActivationDecisionRecordV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Phase 104 Worker Activation Gate must be ready before Phase 105.");
    expect(result.blockers).toContain("Phase 105 must link to the Phase 104 Worker Activation Gate.");
    expect(result.blockers).toContain("Tyler Wallace approval record is required for Phase 105 Worker Activation Decision Record.");
    expect(result.blockers).toContain("Self-approval is blocked for Phase 105 Worker Activation Decision Record.");
  });

  it("fails closed for unsafe or incomplete activation decision records", () => {
    const config = createDefaultWorkerActivationDecisionRecordV1();
    config.activationDecisionRecords[0].decisionRecordId = "unsafe-decision";
    config.activationDecisionRecords[0].workerId = "phase-planner";
    config.activationDecisionRecords[0].sourceGateItemId = "unsafe-gate";
    config.activationDecisionRecords[0].decisionLevel = "execute";
    config.activationDecisionRecords[0].ownerDecisionStatus = "activated";
    config.activationDecisionRecords[0].recordedDecision = "activate";
    config.activationDecisionRecords[0].activationApproved = true;
    config.activationDecisionRecords[0].ownerActivationDecisionRequired = false;
    config.activationDecisionRecords[0].futureImplementationRequired = false;
    config.activationDecisionRecords[0].activationImplementationBlocked = false;
    config.activationDecisionRecords[0].activationTokenIssued = true;
    config.activationDecisionRecords[0].activationCredentialIssued = true;
    config.activationDecisionRecords[0].activationAllowed = true;
    config.activationDecisionRecords[0].executionAllowed = true;
    config.activationDecisionRecords[0].gateEvidenceReferences = [];
    config.activationDecisionRecords[0].decisionAuditRecord = { auditStatus: "unsafe" };
    config.activationDecisionRecords[0].activationDenialRecord = { activationDeniedForThisPhase: false, workerActivated: true };
    config.activationDecisionRecords[0].ownerActivationDecisionRecord = { recordedDecision: "activate", activationApproved: true };
    config.declaredPaths = ["../unsafe.txt"];
    const result = inspectWorkerActivationDecisionRecordV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers.some((blocker: string) => blocker.includes("safe relative path"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("activation-decision-record.worker"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("safe worker"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("Phase 104 activation-gate.worker reference"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("record-only"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("recorded-hold-for-future-implementation"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("defer activation"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("activation approval must remain false"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("owner activation decision review"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("future activation implementation phase"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("Activation implementation must remain blocked"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("No activation token or credential"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("activation must remain blocked"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("execution must remain blocked"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("gate evidence references"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("recorded-for-owner-review"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("activation denial record"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("owner activation decision record"))).toBe(true);
  });

  it("blocks unsafe worker activation, automation, project, Git, shell, fleet, token, credential, and self-governance powers", () => {
    const result = inspectWorkerActivationDecisionRecordV1(createDefaultWorkerActivationDecisionRecordV1({
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
      activationCredentialIssued: true,
      activationImplementationBlocked: false,
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
    expect(result.blockers).toContain("activationCredentialIssued must remain false");
    expect(result.blockers).toContain("activationImplementationBlocked must remain true");
  });

  it("records validation failure evidence when activation decision counts do not match expectations", () => {
    const artifactRoot = tempRoot("phase105-worker-activation-decision-record-failure");
    const config = createDefaultWorkerActivationDecisionRecordV1({ expectedActivationDecisionRecordCount: 99 });
    const result = runWorkerActivationDecisionRecordV1(config, { artifactRoot });
    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBe(1);
    expect(result.readyForOwnerReview).toBe(false);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.workerActivated).toBe(false);
    expect(result.workerExecuted).toBe(false);
    expect(result.activationTokenIssued).toBe(false);
    expect(result.activationCredentialIssued).toBe(false);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.status).toBe("worker-activation-decision-record-validation-failed");
    expect(packet.ownerReviewManifest.readyForOwnerReview).toBe(false);
    expect(packet.activationTokenManifest.activationTokenIssued).toBe(false);
    expect(packet.activationTokenManifest.activationCredentialIssued).toBe(false);
    expect(packet.checks.filter((check: { passed: boolean }) => !check.passed).length).toBe(1);
  });
});

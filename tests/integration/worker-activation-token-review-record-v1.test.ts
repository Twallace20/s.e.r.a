import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultWorkerActivationTokenReviewRecordV1, inspectWorkerActivationTokenReviewRecordV1, runWorkerActivationTokenReviewRecordV1 } from "../../scripts/lib/worker-activation-token-review-record-v1.mjs";

function tempRoot(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `sera-${name}-`));
}

describe("Phase 107 — Worker Activation Token Review Record v1", () => {
  it("produces owner-review worker activation token review records without issuing tokens or credentials", () => {
    const result = runWorkerActivationTokenReviewRecordV1(createDefaultWorkerActivationTokenReviewRecordV1(), { artifactRoot: tempRoot("phase107-worker-activation-token-review-record") });
    expect(result.ok).toBe(true);
    expect(result.workerActivationTokenReviewRecordStatus).toBe("worker-activation-token-review-record-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.workerActivationTokenReviewRecordRequirementCount).toBe(50);
    expect(result.workerActivationTokenReviewRecordFieldCount).toBe(122);
    expect(result.activationTokenReviewRecordCount).toBe(12);
    expect(result.ownerTokenReviewRecordCount).toBe(12);
    expect(result.tokenPolicyReviewRecordCount).toBe(12);
    expect(result.tokenAuditReviewRecordCount).toBe(12);
    expect(result.activationTokenReviewDenialRecordCount).toBe(12);
    expect(result.roadmapTrackCount).toBe(13);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.safetyGateCount).toBe(2220);
    expect(result.workerActivationTokenReviewRecordAllowed).toBe(true);
    expect(result.workerActivationTokenDraftReadAllowed).toBe(true);
    expect(result.activationTokenIssuanceAllowed).toBe(false);
    expect(result.activationCredentialIssuanceAllowed).toBe(false);
    expect(result.tokenMaterialGenerationAllowed).toBe(false);
    expect(result.secretMaterialGenerationAllowed).toBe(false);
    expect(result.workerActivationAllowed).toBe(false);
    expect(result.workerExecutionAllowed).toBe(false);
    expect(result.activationTokenIssued).toBe(false);
    expect(result.activationCredentialIssued).toBe(false);
    expect(result.tokenMaterialGenerated).toBe(false);
    expect(result.secretMaterialGenerated).toBe(false);
    expect(result.tokenImplementationBlocked).toBe(true);
    expect(result.activationImplementationBlocked).toBe(true);
    expect(result.activationTokenReviewRecordPacketProduced).toBe(true);
    expect(result.ownerReviewManifestProduced).toBe(true);
    expect(result.readyForOwnerReview).toBe(true);
    for (const file of [result.packetPath, result.activationTokenReviewRecordManifestPath, result.activationTokenReviewRecordsPath, result.ownerReviewManifestPath, result.tokenIssuanceBlockManifestPath, result.tokenReviewRecordLedgerPath, result.tokenSecretMaterialPath]) {
      expect(fs.existsSync(file)).toBe(true);
    }
  });

  it("requires Phase 106 token draft lineage and Tyler approval", () => {
    const config = createDefaultWorkerActivationTokenReviewRecordV1();
    config.phase106WorkerActivationTokenDraftReady = false;
    config.sourceWorkerActivationTokenDraftId = "wrong-decision-record";
    config.approvalRecord.approved = false;
    config.approvalRecord.selfApproved = true;
    const result = inspectWorkerActivationTokenReviewRecordV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Phase 106 Worker Activation Token Draft must be ready before Phase 107.");
    expect(result.blockers).toContain("Phase 107 must link to the Phase 106 Worker Activation Token Draft.");
    expect(result.blockers).toContain("Tyler Wallace approval record is required for Phase 107 Worker Activation Token Review Record.");
    expect(result.blockers).toContain("Self-approval is blocked for Phase 107 Worker Activation Token Review Record.");
  });

  it("fails closed for unsafe or incomplete activation token review records", () => {
    const config = createDefaultWorkerActivationTokenReviewRecordV1();
    Object.assign(config.activationTokenReviewRecords[0], {
      tokenDraftId: "unsafe-token", workerId: "phase-planner", sourceTokenDraftId: "unsafe-decision", tokenLevel: "issue", tokenStatus: "issued",
      draftedDecision: "issue token", tokenIssuanceApproved: true, ownerTokenReviewRequired: false, futureImplementationRequired: false,
      tokenImplementationBlocked: false, activationImplementationBlocked: false, tokenIssuanceBlocked: false, tokenIssued: true, credentialIssued: true,
      tokenMaterialGenerated: true, secretMaterialGenerated: true, activationAllowed: true, executionAllowed: true, tokenReviewRecordReferences: [],
      tokenPolicyReviewRecord: { status: "unsafe" }, tokenAuditReviewRecord: { auditStatus: "unsafe" },
      tokenDenialRecord: { tokenIssuanceDeniedForThisPhase: false, tokenIssued: true }, ownerTokenReviewRecord: { recordedDecision: "issue token", tokenIssuanceApproved: true },
    });
    config.declaredPaths = ["../unsafe.txt"];
    const result = inspectWorkerActivationTokenReviewRecordV1(config);
    expect(result.ok).toBe(false);
    for (const fragment of ["safe relative path", "activation-token-review-record.worker", "safe worker", "activation-token-draft.worker", "draft-only", "not-issued", "defer token issuance", "token issuance approval must remain false", "owner token decision review", "future token implementation phase", "token implementation must remain blocked", "No activation token or credential", "No token or secret material", "activation must remain blocked", "execution must remain blocked", "token draft references", "token policy review record", "token audit review record", "activation token review denial record", "owner token review record"]) {
      expect(result.blockers.some((blocker: string) => blocker.includes(fragment))).toBe(true);
    }
  });

  it("blocks unsafe token, credential, worker, automation, project, Git, shell, fleet, and self-governance powers", () => {
    const result = inspectWorkerActivationTokenReviewRecordV1(createDefaultWorkerActivationTokenReviewRecordV1({
      boundaries: { activationTokenIssuanceAllowed: true, activationCredentialIssuanceAllowed: true, tokenMaterialGenerationAllowed: true, secretMaterialGenerationAllowed: true, workerActivationAllowed: true, workerExecutionAllowed: true, projectRepoSourceMutationAllowed: true, gitPushAllowed: true, tagCreationAllowed: true, shellExecutionAllowed: true, selfApprovalAllowed: true, productionDeploymentAllowed: true },
      workerActivated: true, workerExecuted: true, projectRepoSourceMutated: true, gitPushPerformed: true, tagCreated: true, shellExecuted: true, productionDeployed: true,
      activationTokenIssued: true, activationCredentialIssued: true, tokenMaterialGenerated: true, secretMaterialGenerated: true, tokenImplementationBlocked: false, activationImplementationBlocked: false,
    }));
    expect(result.ok).toBe(false);
    for (const blocker of ["activationTokenIssuanceAllowed must remain false", "activationCredentialIssuanceAllowed must remain false", "tokenMaterialGenerationAllowed must remain false", "secretMaterialGenerationAllowed must remain false", "workerActivationAllowed must remain false", "workerExecutionAllowed must remain false", "projectRepoSourceMutationAllowed must remain false", "gitPushAllowed must remain false", "tagCreationAllowed must remain false", "shellExecutionAllowed must remain false", "selfApprovalAllowed must remain false", "productionDeploymentAllowed must remain false", "workerActivated must remain false", "workerExecuted must remain false", "activationTokenIssued must remain false", "activationCredentialIssued must remain false", "tokenMaterialGenerated must remain false", "secretMaterialGenerated must remain false", "tokenImplementationBlocked must remain true", "activationImplementationBlocked must remain true"]) {
      expect(result.blockers).toContain(blocker);
    }
  });

  it("records validation failure evidence when activation token review record counts do not match expectations", () => {
    const config = createDefaultWorkerActivationTokenReviewRecordV1({ expectedActivationTokenReviewRecordCount: 99 });
    const result = runWorkerActivationTokenReviewRecordV1(config, { artifactRoot: tempRoot("phase107-worker-activation-token-review-record-failure") });
    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBe(1);
    expect(result.readyForOwnerReview).toBe(false);
    expect(result.activationTokenIssued).toBe(false);
    expect(result.activationCredentialIssued).toBe(false);
    expect(result.tokenMaterialGenerated).toBe(false);
    expect(result.secretMaterialGenerated).toBe(false);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.status).toBe("worker-activation-token-review-record-validation-failed");
    expect(packet.ownerReviewManifest.readyForOwnerReview).toBe(false);
    expect(packet.tokenIssuanceBlockManifest.activationTokenIssued).toBe(false);
    expect(packet.tokenIssuanceBlockManifest.activationCredentialIssued).toBe(false);
    expect(packet.tokenIssuanceBlockManifest.tokenMaterialGenerated).toBe(false);
    expect(packet.tokenIssuanceBlockManifest.secretMaterialGenerated).toBe(false);
    expect(packet.checks.filter((check: { passed: boolean }) => !check.passed).length).toBe(1);
  });
});


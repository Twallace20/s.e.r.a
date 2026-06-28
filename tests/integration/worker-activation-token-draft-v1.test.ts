import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultWorkerActivationTokenDraftV1, inspectWorkerActivationTokenDraftV1, runWorkerActivationTokenDraftV1 } from "../../scripts/lib/worker-activation-token-draft-v1.mjs";

function tempRoot(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `sera-${name}-`));
}

describe("Phase 106 — Worker Activation Token Draft v1", () => {
  it("produces owner-review worker activation token drafts without issuing tokens or credentials", () => {
    const result = runWorkerActivationTokenDraftV1(createDefaultWorkerActivationTokenDraftV1(), { artifactRoot: tempRoot("phase106-worker-activation-token-draft") });
    expect(result.ok).toBe(true);
    expect(result.workerActivationTokenDraftStatus).toBe("worker-activation-token-draft-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.workerActivationTokenDraftRequirementCount).toBe(50);
    expect(result.workerActivationTokenDraftFieldCount).toBe(122);
    expect(result.activationTokenDraftCount).toBe(12);
    expect(result.ownerTokenDecisionDraftCount).toBe(12);
    expect(result.tokenPolicyDraftCount).toBe(12);
    expect(result.tokenAuditDraftCount).toBe(12);
    expect(result.activationTokenDenialRecordCount).toBe(12);
    expect(result.roadmapTrackCount).toBe(13);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.safetyGateCount).toBe(2160);
    expect(result.workerActivationTokenDraftAllowed).toBe(true);
    expect(result.workerActivationDecisionRecordReadAllowed).toBe(true);
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
    expect(result.activationTokenDraftPacketProduced).toBe(true);
    expect(result.ownerReviewManifestProduced).toBe(true);
    expect(result.readyForOwnerReview).toBe(true);
    for (const file of [result.packetPath, result.activationTokenDraftManifestPath, result.activationTokenDraftsPath, result.ownerReviewManifestPath, result.tokenIssuanceBlockManifestPath, result.tokenDraftLedgerPath, result.tokenSecretMaterialPath]) {
      expect(fs.existsSync(file)).toBe(true);
    }
  });

  it("requires Phase 105 lineage and Tyler approval", () => {
    const config = createDefaultWorkerActivationTokenDraftV1();
    config.phase105WorkerActivationDecisionRecordReady = false;
    config.sourceWorkerActivationDecisionRecordId = "wrong-decision-record";
    config.approvalRecord.approved = false;
    config.approvalRecord.selfApproved = true;
    const result = inspectWorkerActivationTokenDraftV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Phase 105 Worker Activation Decision Record must be ready before Phase 106.");
    expect(result.blockers).toContain("Phase 106 must link to the Phase 105 Worker Activation Decision Record.");
    expect(result.blockers).toContain("Tyler Wallace approval record is required for Phase 106 Worker Activation Token Draft.");
    expect(result.blockers).toContain("Self-approval is blocked for Phase 106 Worker Activation Token Draft.");
  });

  it("fails closed for unsafe or incomplete activation token drafts", () => {
    const config = createDefaultWorkerActivationTokenDraftV1();
    Object.assign(config.activationTokenDrafts[0], {
      tokenDraftId: "unsafe-token", workerId: "phase-planner", sourceDecisionRecordId: "unsafe-decision", tokenLevel: "issue", tokenStatus: "issued",
      draftedDecision: "issue token", tokenIssuanceApproved: true, ownerTokenReviewRequired: false, futureImplementationRequired: false,
      tokenImplementationBlocked: false, activationImplementationBlocked: false, tokenIssuanceBlocked: false, tokenIssued: true, credentialIssued: true,
      tokenMaterialGenerated: true, secretMaterialGenerated: true, activationAllowed: true, executionAllowed: true, decisionRecordReferences: [],
      tokenPolicyDraft: { status: "unsafe" }, tokenAuditDraft: { auditStatus: "unsafe" },
      tokenDenialRecord: { tokenIssuanceDeniedForThisPhase: false, tokenIssued: true }, ownerTokenDecisionDraft: { recordedDecision: "issue token", tokenIssuanceApproved: true },
    });
    config.declaredPaths = ["../unsafe.txt"];
    const result = inspectWorkerActivationTokenDraftV1(config);
    expect(result.ok).toBe(false);
    for (const fragment of ["safe relative path", "activation-token-draft.worker", "safe worker", "activation-decision-record.worker", "draft-only", "not-issued", "defer token issuance", "token issuance approval must remain false", "owner token decision review", "future token implementation phase", "token implementation must remain blocked", "No activation token or credential", "No token or secret material", "activation must remain blocked", "execution must remain blocked", "decision record references", "token policy draft", "token audit draft", "activation token denial record", "owner token decision draft"]) {
      expect(result.blockers.some((blocker: string) => blocker.includes(fragment))).toBe(true);
    }
  });

  it("blocks unsafe token, credential, worker, automation, project, Git, shell, fleet, and self-governance powers", () => {
    const result = inspectWorkerActivationTokenDraftV1(createDefaultWorkerActivationTokenDraftV1({
      boundaries: { activationTokenIssuanceAllowed: true, activationCredentialIssuanceAllowed: true, tokenMaterialGenerationAllowed: true, secretMaterialGenerationAllowed: true, workerActivationAllowed: true, workerExecutionAllowed: true, projectRepoSourceMutationAllowed: true, gitPushAllowed: true, tagCreationAllowed: true, shellExecutionAllowed: true, selfApprovalAllowed: true, productionDeploymentAllowed: true },
      workerActivated: true, workerExecuted: true, projectRepoSourceMutated: true, gitPushPerformed: true, tagCreated: true, shellExecuted: true, productionDeployed: true,
      activationTokenIssued: true, activationCredentialIssued: true, tokenMaterialGenerated: true, secretMaterialGenerated: true, tokenImplementationBlocked: false, activationImplementationBlocked: false,
    }));
    expect(result.ok).toBe(false);
    for (const blocker of ["activationTokenIssuanceAllowed must remain false", "activationCredentialIssuanceAllowed must remain false", "tokenMaterialGenerationAllowed must remain false", "secretMaterialGenerationAllowed must remain false", "workerActivationAllowed must remain false", "workerExecutionAllowed must remain false", "projectRepoSourceMutationAllowed must remain false", "gitPushAllowed must remain false", "tagCreationAllowed must remain false", "shellExecutionAllowed must remain false", "selfApprovalAllowed must remain false", "productionDeploymentAllowed must remain false", "workerActivated must remain false", "workerExecuted must remain false", "activationTokenIssued must remain false", "activationCredentialIssued must remain false", "tokenMaterialGenerated must remain false", "secretMaterialGenerated must remain false", "tokenImplementationBlocked must remain true", "activationImplementationBlocked must remain true"]) {
      expect(result.blockers).toContain(blocker);
    }
  });

  it("records validation failure evidence when activation token draft counts do not match expectations", () => {
    const config = createDefaultWorkerActivationTokenDraftV1({ expectedActivationTokenDraftCount: 99 });
    const result = runWorkerActivationTokenDraftV1(config, { artifactRoot: tempRoot("phase106-worker-activation-token-draft-failure") });
    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBe(1);
    expect(result.readyForOwnerReview).toBe(false);
    expect(result.activationTokenIssued).toBe(false);
    expect(result.activationCredentialIssued).toBe(false);
    expect(result.tokenMaterialGenerated).toBe(false);
    expect(result.secretMaterialGenerated).toBe(false);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.status).toBe("worker-activation-token-draft-validation-failed");
    expect(packet.ownerReviewManifest.readyForOwnerReview).toBe(false);
    expect(packet.tokenIssuanceBlockManifest.activationTokenIssued).toBe(false);
    expect(packet.tokenIssuanceBlockManifest.activationCredentialIssued).toBe(false);
    expect(packet.tokenIssuanceBlockManifest.tokenMaterialGenerated).toBe(false);
    expect(packet.tokenIssuanceBlockManifest.secretMaterialGenerated).toBe(false);
    expect(packet.checks.filter((check: { passed: boolean }) => !check.passed).length).toBe(1);
  });
});

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CAPABILITY_POLICY_VERSION,
  CapabilityEngine,
  createCapabilityAuthorization,
  type CapabilityProposal
} from "@sera/capability-engine";
import { IsolatedExecutionEngine, createExecutionAuthorization, type ExecutionRequest } from "@sera/execution-engine";
import { OperatorGateway } from "@sera/operator-gateway";
import {
  GovernedCapabilityEngineComposition,
  M16_A1_EXECUTABLE_ID,
  M16_A1_PROFILE_ID,
  ReleaseRelativeRuntimeCapabilityRegistryReader,
  determineCapabilityGap,
  resolveBoundedAcquisitionProfile
} from "@sera/runtime-capability-composition";
import { openRuntimeState } from "@sera/runtime-state";

const canonicalRegistry = path.join(process.cwd(), "architecture", "runtime-capability-registry-v1.json");

function hashFile(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function tempRelease(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `sera-m16-a1-${label}-`));
  fs.mkdirSync(path.join(root, "architecture"), { recursive: true });
  fs.copyFileSync(canonicalRegistry, path.join(root, "architecture", "runtime-capability-registry-v1.json"));
  fs.writeFileSync(path.join(root, "architecture", "runtime-capability-registry-v1.sha256"), `${hashFile(canonicalRegistry)}\n`, "utf8");
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ private: true }), "utf8");
  return root;
}

async function post(port: number, route: string, body: unknown, headers: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body));
    const request = http.request({ host: "127.0.0.1", port, path: route, method: "POST", headers: { "content-type": "application/json", "content-length": String(payload.length), host: `127.0.0.1:${port}`, ...headers } }, (response) => {
      let text = "";
      response.on("data", (chunk) => { text += String(chunk); });
      response.on("end", () => resolve(JSON.parse(text)));
    });
    request.on("error", reject);
    request.end(payload);
  });
}

async function withGateway<T>(label: string, fn: (input: { root: string; gateway: OperatorGateway; port: number; executionStore: ReturnType<typeof openRuntimeState> }) => Promise<T>): Promise<T> {
  const root = tempRelease(label);
  const executionStore = openRuntimeState({ projectRoot: root, installationId: `installation_${label}`, runtimeInstanceId: `execution_${label}` });
  const executionAuthority = new IsolatedExecutionEngine(executionStore, { projectRoot: root });
  const gateway = new OperatorGateway({ projectRoot: root, executionAuthority, installationId: `installation_${label}`, runtimeInstanceId: `gateway_${label}` });
  const { port } = await gateway.start();
  try {
    return await fn({ root, gateway, port, executionStore });
  } finally {
    await gateway.stop();
    gateway.close();
    executionStore.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function authenticatedRequest(port: number, acquisitionRequest: Record<string, unknown>, objective = "Acquire a deterministic offline capability that returns unique non-empty lines in lexicographic order while preserving each exact retained line."): Promise<any> {
  const sessionEnvelope = await post(port, "/api/v1/operator/session", { idempotencyKey: `m16-a1-session-${Math.random()}` });
  const session = sessionEnvelope.data;
  return post(port, "/api/v1/operator/requests", {
    category: "propose-capability",
    text: objective,
    idempotencyKey: `m16-a1-request-${Math.random()}`,
    acquisitionRequest
  }, {
    authorization: `Bearer ${session.token}`,
    "x-sera-csrf": session.csrfToken,
    origin: `http://127.0.0.1:${port}`
  });
}

describe("M16-A1 usable governed capability acquisition", () => {
  it("routes an authenticated structured request through the Control Plane into a tested inactive candidate and preserves it across restart", async () => {
    await withGateway("success", async ({ root, port }) => {
      const envelope = await authenticatedRequest(port, { profileId: M16_A1_PROFILE_ID });
      expect(envelope.ok).toBe(true);
      const result = envelope.data;
      expect(result.status).toBe("COMPLETED");
      expect(result.offline).toBe(true);
      expect(result.publicNetworkUse).toBe(false);
      expect(result.cloudProviderUse).toBe(false);
      expect(result.modelUse).toBe(false);
      expect(result.externalPackageAcquisition).toBe(false);
      expect(result.repositoryMutation).toBe(false);
      expect(result.acquisition.gapStatus).toBe("UNSATISFIED");
      expect(result.acquisition.candidateCreated).toBe(true);
      expect(result.acquisition.lifecycleStatus).toBe("CANDIDATE");
      expect(result.acquisition.candidateTestsPass).toBe(true);
      expect(result.acquisition.deterministicReplay).toBe(true);
      expect(result.acquisition.executableId).toBe(M16_A1_EXECUTABLE_ID);
      expect(result.acquisition.certified).toBe(false);
      expect(result.acquisition.promoted).toBe(false);
      expect(result.acquisition.activePointerChanged).toBe(false);
      expect(result.acquisition.selectableForOrdinaryExecution).toBe(false);
      expect(result.acquisition.candidateDigest).toMatch(/^[a-f0-9]{64}$/);
      expect(fs.existsSync(result.acquisition.evidencePath)).toBe(true);
      expect(hashFile(result.acquisition.evidencePath)).toBe(result.acquisition.evidenceHash);

      const state = openRuntimeState({ projectRoot: root, installationId: "installation_restart", runtimeInstanceId: "runtime_restart" });
      try {
        const candidate = state.recoveryGet("SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?", [result.acquisition.capabilityId, result.acquisition.candidateDigest]);
        expect(candidate?.lifecycle_status).toBe("CANDIDATE");
        expect(state.recoveryGet("SELECT certification_id FROM capability_certifications WHERE capability_id = ? AND version_digest = ?", [result.acquisition.capabilityId, result.acquisition.candidateDigest])).toBeUndefined();
        expect(state.recoveryGet("SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?", [result.acquisition.capabilityId, result.acquisition.candidateDigest])).toBeUndefined();
        expect(state.recoveryGet("SELECT active_version_digest FROM capability_active_versions WHERE capability_id = ?", [result.acquisition.capabilityId])).toBeUndefined();
        expect(state.recoveryGet("SELECT current_state FROM attempts WHERE attempt_id = ?", [result.attemptId])?.current_state).toBe("COMPLETED");
      } finally {
        state.close();
      }
    });
  }, 30_000);

  it("evaluates the exact A1 inactive candidate twice, produces a review packet, and leaves it uncertified and inactive", async () => {
    await withGateway("a2-evaluation", async ({ root, port, executionStore }) => {
      const envelope = await authenticatedRequest(
        port,
        { profileId: M16_A1_PROFILE_ID }
      );

      expect(envelope.ok).toBe(true);

      const acquisition = envelope.data.acquisition;

      expect(envelope.data.status).toBe("COMPLETED");
      expect(acquisition.candidateCreated).toBe(true);
      expect(acquisition.lifecycleStatus).toBe("CANDIDATE");
      expect(acquisition.certified).toBe(false);
      expect(acquisition.promoted).toBe(false);

      expect(acquisition.proposalId).toMatch(/^m16_a1_proposal_/);
      expect(acquisition.sessionId).toMatch(/^m16_a1_learning_session_/);
      expect(acquisition.candidateDigest).toMatch(/^[a-f0-9]{64}$/);

      const a2Command = executionStore.acceptCommand({
        idempotencyKey: `m16-a2-evaluation:${acquisition.candidateDigest}`,
        commandType: "m16-a2-governed-evaluation",
        payload: {
          operatorRequestId: envelope.data.requestId,
          sourceProposalId: acquisition.proposalId,
          sourceSessionId: acquisition.sessionId,
          capabilityId: acquisition.capabilityId,
          candidateDigest: acquisition.candidateDigest
        },
        capability: "capability-engine"
      });

      expect(a2Command.attemptId).toBeTruthy();

      const attemptId = a2Command.attemptId!;

      executionStore.transitionAttempt({
        attemptId,
        fromState: "PENDING",
        toState: "RUNNING",
        actor: "control-plane",
        reason: "M16-A2 focused proof opened governed evaluation attempt."
      });

      const executionAuthority = new IsolatedExecutionEngine(
        executionStore,
        { projectRoot: root }
      );

      const controlPlanePort = {
        recoveryGet(sql: string, params: unknown[] = []) {
          return executionStore.recoveryGet(sql, params as any);
        },

        recordEvidenceReference(
          input: Parameters<typeof executionStore.recordEvidenceReference>[0]
        ) {
          return executionStore.recordEvidenceReference(input);
        },

        requireExecutionAuthority() {
          return executionAuthority;
        }
      };

      const composition = new GovernedCapabilityEngineComposition(
        controlPlanePort,
        executionStore,
        root
      );

      const activeBefore = executionStore.recoveryGet(
        "SELECT active_version_digest FROM capability_active_versions WHERE capability_id = ?",
        [acquisition.capabilityId]
      );

      const review = await composition.evaluateBoundedCandidate({
        attemptId,
        operatorRequestId: envelope.data.requestId,
        sourceProposalId: acquisition.proposalId,
        sourceSessionId: acquisition.sessionId,
        capabilityId: acquisition.capabilityId,
        candidateDigest: acquisition.candidateDigest
      });

      expect(review.capabilityId).toBe(acquisition.capabilityId);
      expect(review.candidateDigest).toBe(acquisition.candidateDigest);
      expect(review.sourceProposalId).toBe(acquisition.proposalId);
      expect(review.sourceSessionId).toBe(acquisition.sessionId);

      expect(review.experimentIds).toHaveLength(2);
      expect(review.evaluationIds).toHaveLength(2);
      expect(new Set(review.experimentIds).size).toBe(2);
      expect(new Set(review.evaluationIds).size).toBe(2);

      expect(review.reproducibilityRuns).toBe(2);
      expect(review.reproducible).toBe(true);
      expect(review.rollbackReady).toBe(true);
      expect(review.comparisonHash).toMatch(/^[a-f0-9]{64}$/);

      expect(
        review.runs.every(
          (run: any) =>
            run.actualOutput === "alpha\nbeta" &&
            run.expectedOutput === "alpha\nbeta" &&
            run.actualOutputHash === run.expectedOutputHash &&
            run.sourceNotMutated === true &&
            run.workspaceOutsideRepository === true &&
            run.cleanupCleaned === true &&
            run.undeclaredOutputCount === 0 &&
            (
              run.evaluationStatus === "PASSED" ||
              run.evaluationStatus === "PASSED_WITH_WARNINGS"
            )
        )
      ).toBe(true);

      expect(review.permissions).toContain("read isolated input");
      expect(review.permissions).toContain("emit immutable evaluation evidence");
      expect(review.limitations).toContain("no shell");
      expect(review.limitations).toContain("no public network");
      expect(review.riskClass).toBe("low");

      expect(review.lifecycleStatus).toBe("CANDIDATE");
      expect(review.certificationPerformed).toBe(false);
      expect(review.promotionPerformed).toBe(false);
      expect(review.activePointerChanged).toBe(false);
      expect(review.selectableForOrdinaryExecution).toBe(false);

      expect(review.offline).toBe(true);
      expect(review.publicNetworkUse).toBe(false);
      expect(review.cloudProviderUse).toBe(false);
      expect(review.modelUse).toBe(false);

      expect(fs.existsSync(review.reviewPacketPath)).toBe(true);
      expect(hashFile(review.reviewPacketPath)).toBe(review.reviewPacketHash);

      const reviewPacket = JSON.parse(
        fs.readFileSync(review.reviewPacketPath, "utf8")
      );

      expect(reviewPacket.schemaVersion).toBe(
        "sera.m16-a2-evaluation-review-packet.v1"
      );
      expect(reviewPacket.candidate.versionDigest).toBe(
        acquisition.candidateDigest
      );
      expect(reviewPacket.candidate.lifecycleStatus).toBe("CANDIDATE");
      expect(reviewPacket.reproducibility.reproducible).toBe(true);
      expect(reviewPacket.operatorReviewRequired).toBe(true);
      expect(reviewPacket.operatorDecision).toBeNull();
      expect(reviewPacket.certificationPerformed).toBe(false);
      expect(reviewPacket.promotionPerformed).toBe(false);

      const candidateAfter = executionStore.recoveryGet(
        "SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
        [acquisition.capabilityId, acquisition.candidateDigest]
      );

      expect(candidateAfter?.lifecycle_status).toBe("CANDIDATE");

      expect(
        executionStore.recoveryGet(
          "SELECT certification_id FROM capability_certifications WHERE capability_id = ? AND version_digest = ?",
          [acquisition.capabilityId, acquisition.candidateDigest]
        )
      ).toBeUndefined();

      expect(
        executionStore.recoveryGet(
          "SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
          [acquisition.capabilityId, acquisition.candidateDigest]
        )
      ).toBeUndefined();

      const activeAfter = executionStore.recoveryGet(
        "SELECT active_version_digest FROM capability_active_versions WHERE capability_id = ?",
        [acquisition.capabilityId]
      );

      expect(activeAfter?.active_version_digest ?? null).toBe(
        activeBefore?.active_version_digest ?? null
      );

      expect(
        executionStore.recoveryGet(
          "SELECT COUNT(*) AS count FROM evaluations WHERE evaluation_id IN (?, ?)",
          review.evaluationIds
        )?.count
      ).toBe(2);

      const evidenceReference = executionStore.recoveryGet(
        "SELECT integrity_hash FROM evidence_references WHERE attempt_id = ? AND evidence_type = ?",
        [
          attemptId,
          "m16-a2-candidate-evaluation-review-packet"
        ]
      );

      expect(evidenceReference?.integrity_hash).toBe(
        review.reviewPacketHash
      );

      executionStore.transitionAttempt({
        attemptId,
        fromState: "RUNNING",
        toState: "COMPLETED",
        actor: "control-plane",
        reason:
          "M16-A2 evaluation/review preparation completed without certification or promotion."
      });

      expect(
        executionStore.recoveryGet(
          "SELECT current_state FROM attempts WHERE attempt_id = ?",
          [attemptId]
        )?.current_state
      ).toBe("COMPLETED");
    });
  }, 30_000);
  it("certifies the exact reviewed candidate after a Gateway restart and never promotes it", async () => {
    const root = tempRelease("a2-approved-restart");

    let executionStore =
      openRuntimeState({
        projectRoot: root,
        installationId: "installation_a2_approved_restart",
        runtimeInstanceId: "execution_a2_approved_restart"
      });

    const executionAuthority =
      new IsolatedExecutionEngine(
        executionStore,
        { projectRoot: root }
      );

    let gateway =
      new OperatorGateway({
        projectRoot: root,
        executionAuthority,
        installationId: "installation_a2_approved_restart",
        runtimeInstanceId: "gateway_a2_approved_before_restart"
      });

    try {
      let started = await gateway.start();
      let port = started.port;

      const acquisitionEnvelope =
        await authenticatedRequest(
          port,
          { profileId: M16_A1_PROFILE_ID }
        );

      expect(acquisitionEnvelope.ok).toBe(true);
      expect(acquisitionEnvelope.data.status).toBe("COMPLETED");

      const acquisition =
        acquisitionEnvelope.data.acquisition;

      expect(acquisition.lifecycleStatus).toBe("CANDIDATE");
      expect(acquisition.certified).toBe(false);
      expect(acquisition.promoted).toBe(false);

      const sessionEnvelope =
        await post(
          port,
          "/api/v1/operator/session",
          {
            idempotencyKey:
              "m16-a2-approved-review-session"
          }
        );

      expect(sessionEnvelope.ok).toBe(true);

      const session =
        sessionEnvelope.data;

      const headers = {
        authorization:
          `Bearer ${session.token}`,
        "x-sera-csrf":
          session.csrfToken,
        origin:
          `http://127.0.0.1:${port}`
      };

      const reviewEnvelope =
        await post(
          port,
          "/api/v1/operator/capability-reviews",
          {
            sourceProposalId:
              acquisition.proposalId,
            sourceSessionId:
              acquisition.sessionId,
            capabilityId:
              acquisition.capabilityId,
            candidateDigest:
              acquisition.candidateDigest,
            idempotencyKey:
              "m16-a2-approved-review"
          },
          headers
        );

      expect(reviewEnvelope.ok).toBe(true);

      const review =
        reviewEnvelope.data;

      expect(review.status).toBe("AWAITING_APPROVAL");
      expect(review.riskClass).toBe("HIGH");
      expect(review.review.candidateDigest).toBe(
        acquisition.candidateDigest
      );
      expect(review.review.reproducibilityRuns).toBe(2);
      expect(review.review.reproducible).toBe(true);
      expect(review.review.rollbackReady).toBe(true);
      expect(review.certified).toBe(false);
      expect(review.promoted).toBe(false);
      expect(review.operatorDecision).toBeNull();

      expect(
        executionStore.recoveryGet(
          "SELECT status FROM operator_requests WHERE request_id = ?",
          [review.requestId]
        )?.status
      ).toBe("AWAITING_APPROVAL");

      expect(
        executionStore.recoveryGet(
          "SELECT status FROM operator_approvals WHERE approval_id = ?",
          [review.approvalId]
        )?.status
      ).toBe("PENDING");

      expect(
        executionStore.recoveryGet(
          "SELECT current_state FROM attempts WHERE attempt_id = ?",
          [review.attemptId]
        )?.current_state
      ).toBe("RUNNING");

      expect(
        executionStore.recoveryGet(
          "SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
          [
            acquisition.capabilityId,
            acquisition.candidateDigest
          ]
        )?.lifecycle_status
      ).toBe("CANDIDATE");

      await gateway.stop();
      gateway.close();

      gateway =
        new OperatorGateway({
          projectRoot: root,
          executionAuthority,
          installationId:
            "installation_a2_approved_restart",
          runtimeInstanceId:
            "gateway_a2_approved_after_restart"
        });

      started = await gateway.start();
      port = started.port;

      const restartedSessionEnvelope =
        await post(
          port,
          "/api/v1/operator/session",
          {
            idempotencyKey:
              "m16-a2-approved-decision-session"
          }
        );

      const restartedSession =
        restartedSessionEnvelope.data;

      const restartedHeaders = {
        authorization:
          `Bearer ${restartedSession.token}`,
        "x-sera-csrf":
          restartedSession.csrfToken,
        origin:
          `http://127.0.0.1:${port}`
      };

      const missingConfirmation =
        await post(
          port,
          `/api/v1/operator/approvals/${review.approvalId}/decision`,
          {
            decision: "APPROVED",
            integrityHash:
              review.approvalIntegrityHash,
            idempotencyKey:
              "m16-a2-approved-without-second-confirmation",
            secondConfirmation: false
          },
          restartedHeaders
        );

      expect(missingConfirmation.ok).toBe(false);
      expect(missingConfirmation.errorCode).toBe(
        "second_confirmation_required"
      );

      expect(
        executionStore.recoveryGet(
          "SELECT status FROM operator_approvals WHERE approval_id = ?",
          [review.approvalId]
        )?.status
      ).toBe("PENDING");

      const decisionEnvelope =
        await post(
          port,
          `/api/v1/operator/approvals/${review.approvalId}/decision`,
          {
            decision: "APPROVED",
            integrityHash:
              review.approvalIntegrityHash,
            idempotencyKey:
              "m16-a2-approved-final-decision",
            secondConfirmation: true
          },
          restartedHeaders
        );

      expect(decisionEnvelope.ok).toBe(true);

      const decided =
        decisionEnvelope.data;

      expect(decided.status).toBe("COMPLETED");
      expect(decided.operatorDecision).toBe("APPROVED");
      expect(decided.certified).toBe(true);
      expect(decided.rejected).toBe(false);
      expect(decided.promoted).toBe(false);
      expect(decided.selectableForOrdinaryExecution).toBe(false);
      expect(decided.finalization.lifecycleStatus).toBe("CERTIFIED");
      expect(decided.finalization.activePointerChanged).toBe(false);
      expect(decided.finalization.promotionPerformed).toBe(false);

      expect(
        executionStore.recoveryGet(
          "SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
          [
            acquisition.capabilityId,
            acquisition.candidateDigest
          ]
        )?.lifecycle_status
      ).toBe("CERTIFIED");

      expect(
        executionStore.recoveryGet(
          "SELECT certification_id FROM capability_certifications WHERE capability_id = ? AND version_digest = ?",
          [
            acquisition.capabilityId,
            acquisition.candidateDigest
          ]
        )
      ).toBeTruthy();

      expect(
        executionStore.recoveryGet(
          "SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
          [
            acquisition.capabilityId,
            acquisition.candidateDigest
          ]
        )
      ).toBeUndefined();

      expect(
        executionStore.recoveryGet(
          "SELECT active_version_digest FROM capability_active_versions WHERE capability_id = ?",
          [acquisition.capabilityId]
        )
      ).toBeUndefined();

      expect(
        executionStore.recoveryGet(
          "SELECT current_state FROM attempts WHERE attempt_id = ?",
          [review.attemptId]
        )?.current_state
      ).toBe("COMPLETED");

      await gateway.stop();
      gateway.close();

      executionStore.close();

      executionStore =
        openRuntimeState({
          projectRoot: root,
          installationId:
            "installation_a2_approved_restart",
          runtimeInstanceId:
            "execution_a2_approved_persistence_check"
        });

      expect(
        executionStore.recoveryGet(
          "SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
          [
            acquisition.capabilityId,
            acquisition.candidateDigest
          ]
        )?.lifecycle_status
      ).toBe("CERTIFIED");

      expect(
        executionStore.recoveryGet(
          "SELECT status FROM operator_approvals WHERE approval_id = ?",
          [review.approvalId]
        )?.status
      ).toBe("APPROVED");

      expect(
        executionStore.recoveryGet(
          "SELECT decision FROM operator_approval_decisions WHERE approval_id = ?",
          [review.approvalId]
        )?.decision
      ).toBe("APPROVED");

      expect(
        executionStore.recoveryGet(
          "SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
          [
            acquisition.capabilityId,
            acquisition.candidateDigest
          ]
        )
      ).toBeUndefined();
    } finally {
      try {
        await gateway.stop();
      } catch {}

      try {
        gateway.close();
      } catch {}

      try {
        executionStore.close();
      } catch {}

      fs.rmSync(
        root,
        {
          recursive: true,
          force: true
        }
      );
    }
  }, 60_000);

  it("rejects the exact reviewed candidate after a Gateway restart and keeps it permanently inactive", async () => {
    const root = tempRelease("a2-rejected-restart");

    let executionStore =
      openRuntimeState({
        projectRoot: root,
        installationId: "installation_a2_rejected_restart",
        runtimeInstanceId: "execution_a2_rejected_restart"
      });

    const executionAuthority =
      new IsolatedExecutionEngine(
        executionStore,
        { projectRoot: root }
      );

    let gateway =
      new OperatorGateway({
        projectRoot: root,
        executionAuthority,
        installationId: "installation_a2_rejected_restart",
        runtimeInstanceId: "gateway_a2_rejected_before_restart"
      });

    try {
      let started = await gateway.start();
      let port = started.port;

      const acquisitionEnvelope =
        await authenticatedRequest(
          port,
          { profileId: M16_A1_PROFILE_ID }
        );

      expect(acquisitionEnvelope.ok).toBe(true);

      const acquisition =
        acquisitionEnvelope.data.acquisition;

      const sessionEnvelope =
        await post(
          port,
          "/api/v1/operator/session",
          {
            idempotencyKey:
              "m16-a2-rejected-review-session"
          }
        );

      const session =
        sessionEnvelope.data;

      const reviewEnvelope =
        await post(
          port,
          "/api/v1/operator/capability-reviews",
          {
            sourceProposalId:
              acquisition.proposalId,
            sourceSessionId:
              acquisition.sessionId,
            capabilityId:
              acquisition.capabilityId,
            candidateDigest:
              acquisition.candidateDigest,
            idempotencyKey:
              "m16-a2-rejected-review"
          },
          {
            authorization:
              `Bearer ${session.token}`,
            "x-sera-csrf":
              session.csrfToken,
            origin:
              `http://127.0.0.1:${port}`
          }
        );

      expect(reviewEnvelope.ok).toBe(true);

      const review =
        reviewEnvelope.data;

      expect(review.status).toBe("AWAITING_APPROVAL");

      await gateway.stop();
      gateway.close();

      gateway =
        new OperatorGateway({
          projectRoot: root,
          executionAuthority,
          installationId:
            "installation_a2_rejected_restart",
          runtimeInstanceId:
            "gateway_a2_rejected_after_restart"
        });

      started = await gateway.start();
      port = started.port;

      const restartedSessionEnvelope =
        await post(
          port,
          "/api/v1/operator/session",
          {
            idempotencyKey:
              "m16-a2-rejected-decision-session"
          }
        );

      const restartedSession =
        restartedSessionEnvelope.data;

      const decisionEnvelope =
        await post(
          port,
          `/api/v1/operator/approvals/${review.approvalId}/decision`,
          {
            decision: "REJECTED",
            integrityHash:
              review.approvalIntegrityHash,
            idempotencyKey:
              "m16-a2-rejected-final-decision",
            secondConfirmation: true
          },
          {
            authorization:
              `Bearer ${restartedSession.token}`,
            "x-sera-csrf":
              restartedSession.csrfToken,
            origin:
              `http://127.0.0.1:${port}`
          }
        );

      expect(decisionEnvelope.ok).toBe(true);

      const decided =
        decisionEnvelope.data;

      expect(decided.status).toBe("COMPLETED");
      expect(decided.operatorDecision).toBe("REJECTED");
      expect(decided.certified).toBe(false);
      expect(decided.rejected).toBe(true);
      expect(decided.promoted).toBe(false);
      expect(decided.selectableForOrdinaryExecution).toBe(false);
      expect(decided.finalization.lifecycleStatus).toBe("REJECTED");
      expect(decided.finalization.activePointerChanged).toBe(false);
      expect(decided.finalization.promotionPerformed).toBe(false);

      expect(
        executionStore.recoveryGet(
          "SELECT lifecycle_status, terminal FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
          [
            acquisition.capabilityId,
            acquisition.candidateDigest
          ]
        )
      ).toMatchObject({
        lifecycle_status: "REJECTED",
        terminal: 1
      });

      expect(
        executionStore.recoveryGet(
          "SELECT certification_id FROM capability_certifications WHERE capability_id = ? AND version_digest = ?",
          [
            acquisition.capabilityId,
            acquisition.candidateDigest
          ]
        )
      ).toBeUndefined();

      expect(
        executionStore.recoveryGet(
          "SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
          [
            acquisition.capabilityId,
            acquisition.candidateDigest
          ]
        )
      ).toBeUndefined();

      expect(
        executionStore.recoveryGet(
          "SELECT active_version_digest FROM capability_active_versions WHERE capability_id = ?",
          [acquisition.capabilityId]
        )
      ).toBeUndefined();

      await gateway.stop();
      gateway.close();

      executionStore.close();

      executionStore =
        openRuntimeState({
          projectRoot: root,
          installationId:
            "installation_a2_rejected_restart",
          runtimeInstanceId:
            "execution_a2_rejected_persistence_check"
        });

      expect(
        executionStore.recoveryGet(
          "SELECT lifecycle_status, terminal FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
          [
            acquisition.capabilityId,
            acquisition.candidateDigest
          ]
        )
      ).toMatchObject({
        lifecycle_status: "REJECTED",
        terminal: 1
      });

      expect(
        executionStore.recoveryGet(
          "SELECT status FROM operator_approvals WHERE approval_id = ?",
          [review.approvalId]
        )?.status
      ).toBe("REJECTED");

      expect(
        executionStore.recoveryGet(
          "SELECT decision FROM operator_approval_decisions WHERE approval_id = ?",
          [review.approvalId]
        )?.decision
      ).toBe("REJECTED");
    } finally {
      try {
        await gateway.stop();
      } catch {}

      try {
        gateway.close();
      } catch {}

      try {
        executionStore.close();
      } catch {}

      fs.rmSync(
        root,
        {
          recursive: true,
          force: true
        }
      );
    }
  }, 60_000);
  it("computes a SATISFIED gap from registry fields without creating a candidate", () => {
    const root = tempRelease("satisfied");
    try {
      const snapshot = new ReleaseRelativeRuntimeCapabilityRegistryReader(root).read();
      const { requirement } = resolveBoundedAcquisitionProfile({ profileId: M16_A1_PROFILE_ID }, "bounded requirement");
      const syntheticRequirement = { ...requirement, operation: "text-normalization" as any };
      const report = determineCapabilityGap(snapshot, syntheticRequirement);
      expect(report.gapStatus).toBe("SATISFIED");
      expect(["worker", "tool"]).toContain(report.satisfyingCapabilityId);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  const blockedRequests: Array<[string, Record<string, unknown>]> = [
    ["unknown executable IDs", { profileId: M16_A1_PROFILE_ID, requestedExecutableId: "arbitrary-executable" }],
    ["public network", { profileId: M16_A1_PROFILE_ID, networkPolicy: "online" }],
    ["shell", { profileId: M16_A1_PROFILE_ID, shell: true }],
    ["package acquisition", { profileId: M16_A1_PROFILE_ID, packageAcquisition: true }],
    ["cloud model", { profileId: M16_A1_PROFILE_ID, cloudProviderUse: true }],
    ["model use", { profileId: M16_A1_PROFILE_ID, modelUse: true }],
    ["side effects", { profileId: M16_A1_PROFILE_ID, sideEffectPolicy: "external-write" }],
    ["outside profile", { profileId: "unbounded-dynamic-acquisition-v1" }]
  ];

  it.each(blockedRequests)("blocks %s before candidate creation", async (_name, acquisitionRequest) => {
    await withGateway(`blocked-${String(_name).replace(/[^a-z]+/gi, "-")}`, async ({ port }) => {
      const envelope = await authenticatedRequest(port, acquisitionRequest);
      expect(envelope.ok).toBe(true);
      expect(envelope.data.status).toBe("BLOCKED");
      expect(envelope.data.failureCode).toBe("capability_acquisition_blocked");
    });
  });

  it("blocks registry hash mismatch before candidate construction", async () => {
    await withGateway("registry-mismatch", async ({ root, port }) => {
      fs.writeFileSync(path.join(root, "architecture", "runtime-capability-registry-v1.sha256"), `${"0".repeat(64)}\n`, "utf8");
      const envelope = await authenticatedRequest(port, { profileId: M16_A1_PROFILE_ID });
      expect(envelope.data.status).toBe("BLOCKED");
      expect(envelope.data.safeMessage).toContain("registry hash mismatch");
      const store = openRuntimeState({ projectRoot: root, installationId: "inspect", runtimeInstanceId: "inspect" });
      try {
        expect(store.recoveryGet("SELECT version_digest FROM capability_versions WHERE capability_id = ?", ["stable-unique-line-sort-v1"])).toBeUndefined();
      } finally {
        store.close();
      }
    });
  });

  it("retains Capability Engine authorization and closed executable policy boundaries", () => {
    const root = tempRelease("authorization");
    const store = openRuntimeState({ projectRoot: root });
    const engine = new CapabilityEngine(store, { projectRoot: root });
    try {
      const proposal: Omit<CapabilityProposal, "integrityHash"> = {
        proposalId: "proposal_m16_a1_negative",
        sessionId: "session_m16_a1_negative",
        capabilityId: "negative.authorization.test",
        displayName: "Negative Authorization Test",
        source: "operator-request",
        sourceEvidence: [{ id: "registry", uri: canonicalRegistry, sha256: hashFile(canonicalRegistry), kind: "test" }],
        learningLane: "acquisition",
        riskClass: "low",
        requestedType: "deterministic-transform",
        desiredOutcome: "authorization negative proof",
        candidateRequestHash: "a".repeat(64),
        modelGenerated: false,
        candidateIntelligence: false,
        createdAt: new Date().toISOString(),
        policyVersion: CAPABILITY_POLICY_VERSION
      };
      expect(() => engine.createProposal(proposal, undefined)).toThrow();
      const valid = createCapabilityAuthorization({ authorizationType: "proposal", attemptId: "attempt", sessionId: proposal.sessionId, proposalId: proposal.proposalId, capabilityId: proposal.capabilityId, candidateRequestHash: proposal.candidateRequestHash, learningLane: proposal.learningLane, riskClass: proposal.riskClass, approvedExecutableIds: [M16_A1_EXECUTABLE_ID] });
      expect(() => engine.createProposal(proposal, { ...valid, expiresAt: "2000-01-01T00:00:00.000Z" } as any)).toThrow();
      expect(() => engine.createProposal(proposal, { ...valid, integrityHash: "0".repeat(64) } as any)).toThrow();
      expect(() => engine.validateManifest({ approvedExecutionRecipe: { executableId: "arbitrary" as any, args: [], profileId: "offline-minimal", shell: false, timeoutMs: 1 } } as any)).toThrow();
    } finally {
      store.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("blocks deterministic candidate execution outside its declared argument bounds", async () => {
    const root = tempRelease("execution-bounds");
    const store = openRuntimeState({ projectRoot: root });
    try {
      const command = store.acceptCommand({ idempotencyKey: "m16-a1-exec-bound", commandType: "candidate-test", payload: {}, capability: "capability-engine" });
      const attemptId = command.attemptId!;
      store.transitionAttempt({ attemptId, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
      const engine = new IsolatedExecutionEngine(store, { projectRoot: root });
      const request: ExecutionRequest = {
        executionId: "execution_m16_a1_outside_bounds",
        attemptId,
        authorizationId: "authorization_m16_a1_outside_bounds",
        executableId: M16_A1_EXECUTABLE_ID,
        args: ["stable-unique-line-sort", "../escape.txt", "out/result.txt", "65536"],
        inputs: [{ id: "source", sourceType: "inline-text", workspacePath: "input/source.txt", content: "b\na" }],
        outputs: [{ id: "result", workspacePath: "out/result.txt", required: true }],
        workingDirectory: ".",
        environmentProfile: "offline-minimal",
        timeoutMs: 5000,
        gracefulCancellationMs: 100,
        maxStdoutBytes: 1024,
        maxStderrBytes: 1024,
        maxCombinedOutputBytes: 2048,
        expectedExitCodes: [0],
        networkPolicy: "offline-strict",
        cleanupPolicy: "delete-workspace",
        correlation: {}
      };
      const blocked = await engine.execute(
        request,
        createExecutionAuthorization({
          request,
          requiredGateRefs: ["candidate-test"],
          completedGateRefs: ["candidate-test"]
        })
      );
      expect(blocked.ok).toBe(false);
      expect(blocked.status).toBe("BLOCKED");
      expect(blocked.outputs).toEqual([]);
    } finally {
      store.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

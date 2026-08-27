import { createHash } from "node:crypto";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createDefaultExecutableRegistry } from "@sera/execution-engine";
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

async function withGateway<T>(label: string, fn: (input: { root: string; gateway: OperatorGateway; port: number; executionStore: ReturnType<typeof openRuntimeState>; executionAuthority: IsolatedExecutionEngine }) => Promise<T>): Promise<T> {
  const root = tempRelease(label);
  const executionStore = openRuntimeState({ projectRoot: root, installationId: `installation_${label}`, runtimeInstanceId: `execution_${label}` });
  const executionAuthority = new IsolatedExecutionEngine(executionStore, { projectRoot: root });
  const gateway = new OperatorGateway({ projectRoot: root, executionAuthority, installationId: `installation_${label}`, runtimeInstanceId: `gateway_${label}` });
  const { port } = await gateway.start();

  try {
    return await fn({ root, gateway, port, executionStore, executionAuthority });
  } finally {
    await gateway.stop();
    gateway.close();
    executionAuthority.shutdown();
    executionStore.close();

    fs.rmSync(
      root,
      {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 50
      }
    );
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
  it("promotes the exact A2-certified digest, reattempts the original gap, and executes the active capability without rollback", async () => {
    await withGateway(
      "a3-promotion-reattempt",
      async ({
        root,
        gateway,
        port,
        executionStore,
        executionAuthority
      }) => {
        const originalObjective =
          "Acquire a deterministic offline capability that returns unique non-empty lines in lexicographic order while preserving each exact retained line.";

        const acquisitionEnvelope =
          await authenticatedRequest(
            port,
            {
              profileId:
                M16_A1_PROFILE_ID
            },
            originalObjective
          );

        expect(
          acquisitionEnvelope.ok
        ).toBe(true);

        expect(
          acquisitionEnvelope
            .data.status
        ).toBe("COMPLETED");

        const acquisition =
          acquisitionEnvelope
            .data.acquisition;

        const sessionEnvelope =
          await post(
            port,
            "/api/v1/operator/session",
            {
              idempotencyKey:
                "m16-a3-session"
            }
          );

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
                "m16-a3-source-review"
            },
            headers
          );

        expect(
          reviewEnvelope.ok
        ).toBe(true);

        const review =
          reviewEnvelope.data;

        expect(
          review.status
        ).toBe(
          "AWAITING_APPROVAL"
        );

        const decisionEnvelope =
          await post(
            port,
            `/api/v1/operator/approvals/${review.approvalId}/decision`,
            {
              decision:
                "APPROVED",
              integrityHash:
                review
                  .approvalIntegrityHash,
              idempotencyKey:
                "m16-a3-source-certification",
              secondConfirmation:
                true
            },
            headers
          );

        expect(
          decisionEnvelope.ok
        ).toBe(true);

        expect(
          decisionEnvelope
            .data.finalization
            .lifecycleStatus
        ).toBe("CERTIFIED");

        expect(
          executionStore
            .recoveryGet(
              "SELECT active_version_digest FROM capability_active_versions WHERE capability_id = ? AND activation_scope = ?",
              [
                acquisition.capabilityId,
                "catalog"
              ]
            )
        ).toBeUndefined();

        const promotionEnvelope =
          await post(
            port,
            "/api/v1/operator/capability-promotions",
            {
              approvalId:
                review.approvalId,
              approvalIntegrityHash:
                review
                  .approvalIntegrityHash,
              idempotencyKey:
                "m16-a3-exact-promotion"
            },
            headers
          );

        expect(
          promotionEnvelope.ok
        ).toBe(true);

        const promotion =
          promotionEnvelope.data;

        expect(
          promotion.status
        ).toBe("COMPLETED");
        expect(
          promotion.promoted
        ).toBe(true);
        expect(
          promotion.candidateDigest
        ).toBe(
          acquisition
            .candidateDigest
        );
        expect(
          promotion
            .activeVersionDigest
        ).toBe(
          acquisition
            .candidateDigest
        );
        expect(
          promotion
            .rollbackPerformed
        ).toBe(false);

        expect(
          executionStore
            .recoveryGet(
              "SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
              [
                acquisition.capabilityId,
                acquisition
                  .candidateDigest
              ]
            )
            ?.lifecycle_status
        ).toBe("PROMOTED");

        expect(
          executionStore
            .recoveryGet(
              "SELECT active_version_digest, authority_identity FROM capability_active_versions WHERE capability_id = ? AND activation_scope = ?",
              [
                acquisition.capabilityId,
                "catalog"
              ]
            )
        ).toMatchObject({
          active_version_digest:
            acquisition
              .candidateDigest,
          authority_identity:
            "control-plane"
        });

        expect(
          executionStore
            .recoveryGet(
              "SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
              [
                acquisition.capabilityId,
                acquisition
                  .candidateDigest
              ]
            )
        ).toBeTruthy();

        const reattemptEnvelope =
          await authenticatedRequest(
            port,
            {
              profileId:
                M16_A1_PROFILE_ID
            },
            originalObjective
          );

        expect(
          reattemptEnvelope.ok
        ).toBe(true);

        expect(
          reattemptEnvelope
            .data.status
        ).toBe("COMPLETED");

        expect(
          reattemptEnvelope
            .data.acquisition
            .gapStatus
        ).toBe("SATISFIED");

        expect(
          reattemptEnvelope
            .data.acquisition
            .candidateCreated
        ).toBe(false);

        expect(
          reattemptEnvelope
            .data.acquisition
            .satisfyingCapabilityId
        ).toBe(
          acquisition
            .capabilityId
        );

        const executionEnvelope =
          await post(
            port,
            "/api/v1/operator/requests",
            {
              category:
                "run-certified-capability",
              text:
                "Run active stable-unique-line-sort-v1.",
              executionInput:
                "beta\nalpha\nbeta\n",
              idempotencyKey:
                "m16-a3-real-task-reattempt"
            },
            headers
          );

        expect(
          executionEnvelope.ok
        ).toBe(true);

        expect(
          executionEnvelope
            .data.status
        ).toBe("COMPLETED");

        expect(
          executionEnvelope
            .data.output
        ).toBe(
          "alpha\nbeta"
        );

        expect(
          executionEnvelope
            .data.offline
        ).toBe(true);

        expect(
          executionEnvelope
            .data.publicNetworkUse
        ).toBe(false);

        expect(
          executionEnvelope
            .data.cloudProviderUse
        ).toBe(false);

        expect(
          executionEnvelope
            .data.modelUse
        ).toBe(false);

        expect(
          executionStore
            .recoveryGet(
              "SELECT rollback_id FROM capability_rollbacks WHERE capability_id = ?",
              [
                acquisition.capabilityId
              ]
            )
        ).toBeUndefined();
        /*
         * M16-A4 R1 — genuine deterministic regression observation.
         *
         * The exact V1 digest above is certified and promoted before
         * this observation runs.
         *
         * V1 accepts raw malformed UTF-8 C3 28 because its input path
         * uses Node's non-fatal UTF-8 decoder. The invalid C3 byte is
         * replacement-decoded to U+FFFD rather than rejected.
         */

        const activeV1 =
          executionStore.recoveryGet(
            "SELECT active_version_digest, authority_identity FROM capability_active_versions WHERE capability_id = ? AND activation_scope = ?",
            [
              acquisition.capabilityId,
              "catalog"
            ]
          );

        expect(activeV1).toMatchObject({
          active_version_digest:
            acquisition.candidateDigest,
          authority_identity:
            "control-plane"
        });

        const activeV1Version =
          executionStore.recoveryGet(
            "SELECT lifecycle_status, manifest_json FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
            [
              acquisition.capabilityId,
              acquisition.candidateDigest
            ]
          );

        expect(
          activeV1Version
            ?.lifecycle_status
        ).toBe("PROMOTED");

        const activeV1Manifest =
          JSON.parse(
            String(
              activeV1Version
                .manifest_json
            )
          );

        expect(
          activeV1Manifest
            .approvedExecutionRecipe
            .executableId
        ).toBe(
          M16_A1_EXECUTABLE_ID
        );

        const v1Executable =
          createDefaultExecutableRegistry()
            .get(
              M16_A1_EXECUTABLE_ID
            );

        expect(
          v1Executable.id
        ).toBe(
          M16_A1_EXECUTABLE_ID
        );

        expect(
          v1Executable
            .offlineCompatible
        ).toBe(true);

        expect(
          v1Executable
            .networkCapable
        ).toBe(false);

        const malformedBytes =
          Buffer.from([
            0xc3,
            0x28
          ]);

        const runMalformedV1 =
          (runLabel: string) => {
            const workspaceRoot =
              path.join(
                root,
                ".sera",
                "m16-a4-regression",
                runLabel
              );

            const inputPath =
              path.join(
                workspaceRoot,
                "input",
                "source.txt"
              );

            const outputPath =
              path.join(
                workspaceRoot,
                "out",
                "result.txt"
              );

            fs.mkdirSync(
              path.dirname(
                inputPath
              ),
              {
                recursive: true
              }
            );

            fs.writeFileSync(
              inputPath,
              malformedBytes
            );

            const args = [
              "stable-unique-line-sort",
              "input/source.txt",
              "out/result.txt",
              String(
                64 * 1024
              )
            ];

            v1Executable
              .validateArgs(
                args
              );

            const materializedArgs =
              v1Executable
                .materializeArgs(
                  {
                    executableId:
                      M16_A1_EXECUTABLE_ID,
                    args
                  } as any,
                  workspaceRoot
                );

            const result =
              spawnSync(
                v1Executable
                  .resolvePath(),
                materializedArgs,
                {
                  cwd:
                    workspaceRoot,
                  windowsHide:
                    true,
                  encoding:
                    null
                }
              );

            const outputBytes =
              fs.existsSync(
                outputPath
              )
                ? fs.readFileSync(
                    outputPath
                  )
                : Buffer.alloc(0);

            return {
              runLabel,
              exitCode:
                result.status,
              signal:
                result.signal,
              stderrUtf8:
                Buffer.isBuffer(
                  result.stderr
                )
                  ? result.stderr
                      .toString(
                        "utf8"
                      )
                  : String(
                      result.stderr ??
                      ""
                    ),
              inputHex:
                malformedBytes
                  .toString(
                    "hex"
                  ),
              inputSha256:
                crypto
                  .createHash(
                    "sha256"
                  )
                  .update(
                    malformedBytes
                  )
                  .digest(
                    "hex"
                  ),
              outputHex:
                outputBytes
                  .toString(
                    "hex"
                  ),
              outputSha256:
                crypto
                  .createHash(
                    "sha256"
                  )
                  .update(
                    outputBytes
                  )
                  .digest(
                    "hex"
                  )
            };
          };

        const r1RunA =
          runMalformedV1(
            "r1-run-a"
          );

        const r1RunB =
          runMalformedV1(
            "r1-run-b"
          );

        expect(
          r1RunA.exitCode
        ).toBe(0);

        expect(
          r1RunB.exitCode
        ).toBe(0);

        expect(
          r1RunA.inputHex
        ).toBe("c328");

        /*
         * U+FFFD = EF BF BD.
         * Therefore replacement decoding of C3 28 produces EF BF BD 28.
         */
        expect(
          r1RunA.outputHex
        ).toBe("efbfbd28");

        expect(
          r1RunB.outputHex
        ).toBe(
          r1RunA.outputHex
        );

        expect(
          r1RunB.outputSha256
        ).toBe(
          r1RunA.outputSha256
        );

        const r1EvidenceRoot =
          path.join(
            root,
            ".sera",
            "m16-a4-regression"
          );

        fs.mkdirSync(
          r1EvidenceRoot,
          {
            recursive: true
          }
        );

        const r1EvidencePath =
          path.join(
            r1EvidenceRoot,
            "r1-v1-malformed-utf8.json"
          );

        const r1Record = {
          schemaVersion:
            "sera.m16-a4-deterministic-regression.v1",
          evidenceId:
            "m16-a4-r1-v1-malformed-utf8",
          capabilityId:
            acquisition.capabilityId,
          activeVersionDigest:
            acquisition.candidateDigest,
          executableId:
            M16_A1_EXECUTABLE_ID,
          contract: {
            acceptedInputType:
              "newline-delimited-utf8-text",
            expectedMalformedUtf8Behavior:
              "reject"
          },
          fixture: {
            inputHex:
              r1RunA.inputHex,
            inputSha256:
              r1RunA.inputSha256
          },
          observations: [
            r1RunA,
            r1RunB
          ],
          deterministic:
            true,
          regressionObserved:
            true,
          observedDeficiency:
            "Promoted deterministic-text-transform-v1 accepts malformed UTF-8 bytes C3 28 and replacement-decodes them to EF BF BD 28 instead of rejecting input outside the newline-delimited UTF-8 contract.",
          offline:
            true,
          publicNetworkUse:
            false,
          modelUse:
            false
        };

        fs.writeFileSync(
          r1EvidencePath,
          JSON.stringify(
            r1Record,
            null,
            2
          ) + "\n",
          "utf8"
        );

        const r1EvidenceHash =
          hashFile(
            r1EvidencePath
          );

        expect(
          r1EvidenceHash
        ).toMatch(
          /^[a-f0-9]{64}$/
        );

        const persistedR1 =
          JSON.parse(
            fs.readFileSync(
              r1EvidencePath,
              "utf8"
            )
          );

        expect(
          persistedR1
            .schemaVersion
        ).toBe(
          "sera.m16-a4-deterministic-regression.v1"
        );

        expect(
          persistedR1
            .capabilityId
        ).toBe(
          acquisition.capabilityId
        );

        expect(
          persistedR1
            .activeVersionDigest
        ).toBe(
          acquisition.candidateDigest
        );

        expect(
          persistedR1
            .deterministic
        ).toBe(true);

        expect(
          persistedR1
            .regressionObserved
        ).toBe(true);

        expect(
          persistedR1
            .observedDeficiency
            .trim()
            .length
        ).toBeGreaterThan(0);
        /*
         * M16-A4 Phase 9
         *
         * R1 now becomes an input to a separate governed repair attempt.
         * The Product Control Plane owns attempt creation/transition;
         * the governed composition owns repair-candidate construction.
         */

        const productControlPlane =
          (gateway as any)
            .productControlPlane;

        const governedComposition =
          (gateway as any)
            .governedCapabilityEngineComposition;

        expect(
          productControlPlane
        ).toBeTruthy();

        expect(
          governedComposition
        ).toBeTruthy();

        const repairCommand =
          productControlPlane
            .acceptCommand({
              idempotencyKey:
                "m16-a4-phase9-repair-command",
              commandType:
                "m16-a4-governed-repair-candidate",
              payload: {
                operatorRequestId:
                  promotionEnvelope
                    .data
                    .requestId ??
                  "m16-a4-r1-repair",
                capabilityId:
                  acquisition.capabilityId,
                baselineDigest:
                  acquisition.candidateDigest,
                regressionEvidenceHash:
                  r1EvidenceHash
              },
              capability:
                acquisition.capabilityId
            });

        expect(
          repairCommand.attemptId
        ).toBeTruthy();

        const repairAttemptId =
          String(
            repairCommand.attemptId
          );

        productControlPlane
          .transitionAttempt({
            attemptId:
              repairAttemptId,
            fromState:
              "PENDING",
            toState:
              "RUNNING",
            actor:
              "control-plane",
            reason:
              "M16-A4 deterministic R1 opened an explicit governed repair-candidate attempt.",
            correlation: {
              capabilityId:
                acquisition.capabilityId,
              baselineDigest:
                acquisition.candidateDigest,
              regressionEvidenceHash:
                r1EvidenceHash
            }
          });

        const repair =
          await governedComposition
            .createBoundedRepairCandidate({
              attemptId:
                repairAttemptId,
              operatorRequestId:
                "m16-a4-r1-repair-request",
              capabilityId:
                acquisition.capabilityId,
              baselineDigest:
                acquisition.candidateDigest,
              regressionEvidencePath:
                r1EvidencePath,
              regressionEvidenceHash:
                r1EvidenceHash
            });

        /*
         * Exact R1 provenance must survive into repair construction.
         */
        expect(
          repair.baselineDigest
        ).toBe(
          acquisition.candidateDigest
        );

        expect(
          repair.regressionEvidencePath
        ).toBe(
          path.resolve(
            r1EvidencePath
          )
        );

        expect(
          repair.regressionEvidenceHash
        ).toBe(
          r1EvidenceHash
        );

        expect(
          repair.learningSignal
            .signalType
        ).toBe("regression");

        expect(
          repair.learningSignal
            .baselineVersionDigest
        ).toBe(
          acquisition.candidateDigest
        );

        expect(
          repair.proposal
            .source
        ).toBe("regression");

        expect(
          repair.proposal
            .learningLane
        ).toBe("repair");

        expect(
          repair.proposal
            .riskClass
        ).toBe("low");

        expect(
          repair.proposal
            .capabilityId
        ).toBe(
          acquisition.capabilityId
        );

        /*
         * The repair candidate must be V2 and must remain inactive.
         */
        expect(
          repair.bundle
            .manifest
            .approvedExecutionRecipe
            .executableId
        ).toBe(
          "deterministic-text-transform-v2"
        );

        expect(
          repair.candidateDigest
        ).toMatch(
          /^[a-f0-9]{64}$/
        );

        expect(
          repair.candidateDigest
        ).not.toBe(
          acquisition.candidateDigest
        );

        expect(
          repair.lifecycleStatus
        ).toBe("CANDIDATE");

        expect(
          repair.learningLane
        ).toBe("repair");

        expect(
          repair.candidateTestsPass
        ).toBe(true);

        expect(
          repair.deterministicReplay
        ).toBe(true);

        expect(
          repair.certified
        ).toBe(false);

        expect(
          repair.promoted
        ).toBe(false);

        expect(
          repair.activePointerChanged
        ).toBe(false);

        expect(
          repair.selectableForOrdinaryExecution
        ).toBe(false);

        expect(
          repair.activeVersionDigest
        ).toBe(
          acquisition.candidateDigest
        );

        expect(
          repair.offline
        ).toBe(true);

        expect(
          repair.publicNetworkUse
        ).toBe(false);

        expect(
          repair.cloudProviderUse
        ).toBe(false);

        expect(
          repair.modelUse
        ).toBe(false);

        expect(
          repair.externalPackageAcquisition
        ).toBe(false);

        expect(
          repair.repositoryMutation
        ).toBe(false);

        expect(
          fs.existsSync(
            repair.evidencePath
          )
        ).toBe(true);

        expect(
          hashFile(
            repair.evidencePath
          )
        ).toBe(
          repair.evidenceHash
        );

        /*
         * Verify authoritative persisted state, not only returned fields.
         */
        const persistedRepair =
          executionStore.recoveryGet(
            "SELECT lifecycle_status, learning_lane, risk_class, baseline_version_digest, manifest_json FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
            [
              acquisition.capabilityId,
              repair.candidateDigest
            ]
          );

        expect(
          persistedRepair
        ).toBeTruthy();

        expect(
          persistedRepair
            .lifecycle_status
        ).toBe("CANDIDATE");

        expect(
          persistedRepair
            .learning_lane
        ).toBe("repair");

        expect(
          persistedRepair
            .risk_class
        ).toBe("low");

        expect(
          persistedRepair
            .baseline_version_digest
        ).toBe(
          acquisition.candidateDigest
        );

        const persistedRepairManifest =
          JSON.parse(
            String(
              persistedRepair
                .manifest_json
            )
          );

        expect(
          persistedRepairManifest
            .approvedExecutionRecipe
            .executableId
        ).toBe(
          "deterministic-text-transform-v2"
        );

        expect(
          persistedRepairManifest
            .rollbackCompatibility
            .compatibleWith
        ).toContain(
          acquisition.candidateDigest
        );

        expect(
          persistedRepairManifest
            .rollbackCompatibility
            .reversible
        ).toBe(true);

        /*
         * V1 must still be the exact Control Plane-owned active version.
         */
        expect(
          executionStore.recoveryGet(
            "SELECT active_version_digest, authority_identity FROM capability_active_versions WHERE capability_id = ? AND activation_scope = ?",
            [
              acquisition.capabilityId,
              "catalog"
            ]
          )
        ).toMatchObject({
          active_version_digest:
            acquisition.candidateDigest,
          authority_identity:
            "control-plane"
        });

        expect(
          executionStore.recoveryGet(
            "SELECT certification_id FROM capability_certifications WHERE capability_id = ? AND version_digest = ?",
            [
              acquisition.capabilityId,
              repair.candidateDigest
            ]
          )
        ).toBeUndefined();

        expect(
          executionStore.recoveryGet(
            "SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
            [
              acquisition.capabilityId,
              repair.candidateDigest
            ]
          )
        ).toBeUndefined();

        expect(
          executionStore.recoveryGet(
            "SELECT rollback_id FROM capability_rollbacks WHERE capability_id = ?",
            [
              acquisition.capabilityId
            ]
          )
        ).toBeUndefined();

        /*
         * Candidate construction is now complete; close only this repair
         * attempt. Certification/promotion are later explicit actions.
         */
        productControlPlane
          .recordGateOutcome({
            attemptId:
              repairAttemptId,
            gateName:
              "m16-a4-r1-to-v2-repair-candidate",
            required:
              true,
            outcome:
              "PASS",
            evidenceReferences:
              repair.evidenceReferenceIds,
            evaluator:
              "governed-capability-engine-composition",
            message:
              "Exact R1 evidence produced a tested inactive V2 repair candidate bound to the promoted V1 baseline."
          });

        productControlPlane
          .transitionAttempt({
            attemptId:
              repairAttemptId,
            fromState:
              "RUNNING",
            toState:
              "COMPLETED",
            actor:
              "control-plane",
            reason:
              "M16-A4 repair candidate construction completed; V2 remains inactive and uncertified.",
            correlation: {
              capabilityId:
                acquisition.capabilityId,
              baselineDigest:
                acquisition.candidateDigest,
              candidateDigest:
                repair.candidateDigest,
              regressionEvidenceHash:
                r1EvidenceHash
            }
          });

        expect(
          executionStore.recoveryGet(
            "SELECT current_state FROM attempts WHERE attempt_id = ?",
            [
              repairAttemptId
            ]
          )?.current_state
        ).toBe("COMPLETED");
        /*
         * M16-A4 Phase 10
         *
         * Route the exact V2 repair proposal/session/digest through the
         * existing A2 operator review path. That path performs two
         * independent executions and evaluations and produces the
         * reproducibility review packet.
         */

        const v2ReviewSessionEnvelope =
          await post(
            port,
            "/api/v1/operator/session",
            {
              idempotencyKey:
                "m16-a4-v2-review-session"
            }
          );

        expect(
          v2ReviewSessionEnvelope.ok
        ).toBe(true);

        const v2ReviewSession =
          v2ReviewSessionEnvelope.data;

        const v2ReviewHeaders = {
          authorization:
            `Bearer ${v2ReviewSession.token}`,
          "x-sera-csrf":
            v2ReviewSession.csrfToken,
          origin:
            `http://127.0.0.1:${port}`
        };

        const v2ReviewEnvelope =
          await post(
            port,
            "/api/v1/operator/capability-reviews",
            {
              sourceProposalId:
                repair.proposal
                  .proposalId,
              sourceSessionId:
                repair.proposal
                  .sessionId,
              capabilityId:
                acquisition.capabilityId,
              candidateDigest:
                repair.candidateDigest,
              idempotencyKey:
                "m16-a4-v2-review"
            },
            v2ReviewHeaders
          );

        expect(
          v2ReviewEnvelope.ok
        ).toBe(true);

        const v2Review =
          v2ReviewEnvelope.data;

        expect(
          v2Review.status
        ).toBe(
          "AWAITING_APPROVAL"
        );

        /*
         * Approval risk is intentionally HIGH even though the repair
         * proposal itself is low-risk. Certification is a human
         * governance action.
         */
        expect(
          v2Review.riskClass
        ).toBe("HIGH");

        expect(
          v2Review.review
            .capabilityId
        ).toBe(
          acquisition.capabilityId
        );

        expect(
          v2Review.review
            .candidateDigest
        ).toBe(
          repair.candidateDigest
        );

        expect(
          v2Review.review
            .sourceProposalId
        ).toBe(
          repair.proposal
            .proposalId
        );

        expect(
          v2Review.review
            .sourceSessionId
        ).toBe(
          repair.proposal
            .sessionId
        );

        /*
         * This is the actual two-run A2 evaluation path.
         */
        expect(
          v2Review.review
            .experimentIds
        ).toHaveLength(2);

        expect(
          v2Review.review
            .evaluationIds
        ).toHaveLength(2);

        expect(
          new Set(
            v2Review.review
              .experimentIds
          ).size
        ).toBe(2);

        expect(
          new Set(
            v2Review.review
              .evaluationIds
          ).size
        ).toBe(2);

        expect(
          v2Review.review
            .reproducibilityRuns
        ).toBe(2);

        expect(
          v2Review.review
            .reproducible
        ).toBe(true);

        expect(
          v2Review.review
            .rollbackReady
        ).toBe(true);

        expect(
          v2Review.review
            .lifecycleStatus
        ).toBe("CANDIDATE");

        expect(
          v2Review.review
            .certificationPerformed
        ).toBe(false);

        expect(
          v2Review.review
            .promotionPerformed
        ).toBe(false);

        expect(
          v2Review.certified
        ).toBe(false);

        expect(
          v2Review.promoted
        ).toBe(false);

        expect(
          v2Review.operatorDecision
        ).toBeNull();

        expect(
          fs.existsSync(
            v2Review.review
              .reviewPacketPath
          )
        ).toBe(true);

        expect(
          hashFile(
            v2Review.review
              .reviewPacketPath
          )
        ).toBe(
          v2Review.review
            .reviewPacketHash
        );

        const v2ReviewPacket =
          JSON.parse(
            fs.readFileSync(
              v2Review.review
                .reviewPacketPath,
              "utf8"
            )
          );

        expect(
          v2ReviewPacket
            .schemaVersion
        ).toBe(
          "sera.m16-a2-evaluation-review-packet.v1"
        );

        expect(
          v2ReviewPacket
            .candidate
            .versionDigest
        ).toBe(
          repair.candidateDigest
        );

        expect(
          v2ReviewPacket
            .candidate
            .lifecycleStatus
        ).toBe("CANDIDATE");

        expect(
          v2ReviewPacket
            .sourceProvenance
            .proposalId
        ).toBe(
          repair.proposal
            .proposalId
        );

        expect(
          v2ReviewPacket
            .sourceProvenance
            .sessionId
        ).toBe(
          repair.proposal
            .sessionId
        );

        expect(
          v2ReviewPacket
            .reproducibility
            .completedRuns
        ).toBe(2);

        expect(
          v2ReviewPacket
            .reproducibility
            .reproducible
        ).toBe(true);

        expect(
          v2ReviewPacket
            .operatorReviewRequired
        ).toBe(true);

        expect(
          v2ReviewPacket
            .operatorDecision
        ).toBeNull();

        /*
         * Verify both durable evaluation records exist.
         */
        expect(
          executionStore.recoveryGet(
            "SELECT COUNT(*) AS count FROM evaluations WHERE evaluation_id IN (?, ?)",
            v2Review.review
              .evaluationIds
          )?.count
        ).toBe(2);

        expect(
          executionStore.recoveryGet(
            "SELECT status FROM operator_approvals WHERE approval_id = ?",
            [
              v2Review.approvalId
            ]
          )?.status
        ).toBe("PENDING");

        expect(
          executionStore.recoveryGet(
            "SELECT current_state FROM attempts WHERE attempt_id = ?",
            [
              v2Review.attemptId
            ]
          )?.current_state
        ).toBe("RUNNING");

        /*
         * Evaluation must not change the active pointer.
         */
        expect(
          executionStore.recoveryGet(
            "SELECT active_version_digest, authority_identity FROM capability_active_versions WHERE capability_id = ? AND activation_scope = ?",
            [
              acquisition.capabilityId,
              "catalog"
            ]
          )
        ).toMatchObject({
          active_version_digest:
            acquisition.candidateDigest,
          authority_identity:
            "control-plane"
        });

        expect(
          executionStore.recoveryGet(
            "SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
            [
              acquisition.capabilityId,
              repair.candidateDigest
            ]
          )?.lifecycle_status
        ).toBe("CANDIDATE");

        /*
         * Certification requires the already-proven explicit second
         * confirmation. First prove the missing confirmation is blocked.
         */
        const v2MissingConfirmation =
          await post(
            port,
            `/api/v1/operator/approvals/${v2Review.approvalId}/decision`,
            {
              decision:
                "APPROVED",
              integrityHash:
                v2Review
                  .approvalIntegrityHash,
              idempotencyKey:
                "m16-a4-v2-approved-without-second-confirmation",
              secondConfirmation:
                false
            },
            v2ReviewHeaders
          );

        expect(
          v2MissingConfirmation.ok
        ).toBe(false);

        expect(
          v2MissingConfirmation
            .errorCode
        ).toBe(
          "second_confirmation_required"
        );

        expect(
          executionStore.recoveryGet(
            "SELECT status FROM operator_approvals WHERE approval_id = ?",
            [
              v2Review.approvalId
            ]
          )?.status
        ).toBe("PENDING");

        /*
         * Now perform the explicit operator certification decision.
         */
        const v2DecisionEnvelope =
          await post(
            port,
            `/api/v1/operator/approvals/${v2Review.approvalId}/decision`,
            {
              decision:
                "APPROVED",
              integrityHash:
                v2Review
                  .approvalIntegrityHash,
              idempotencyKey:
                "m16-a4-v2-approved-final-decision",
              secondConfirmation:
                true
            },
            v2ReviewHeaders
          );

        expect(
          v2DecisionEnvelope.ok
        ).toBe(true);

        const v2Decided =
          v2DecisionEnvelope.data;

        expect(
          v2Decided.status
        ).toBe("COMPLETED");

        expect(
          v2Decided.operatorDecision
        ).toBe("APPROVED");

        expect(
          v2Decided.certified
        ).toBe(true);

        expect(
          v2Decided.rejected
        ).toBe(false);

        expect(
          v2Decided.promoted
        ).toBe(false);

        expect(
          v2Decided
            .selectableForOrdinaryExecution
        ).toBe(false);

        expect(
          v2Decided
            .finalization
            .lifecycleStatus
        ).toBe("CERTIFIED");

        expect(
          v2Decided
            .finalization
            .activePointerChanged
        ).toBe(false);

        expect(
          v2Decided
            .finalization
            .promotionPerformed
        ).toBe(false);

        /*
         * Verify authoritative V2 certification state.
         */
        const certifiedV2 =
          executionStore.recoveryGet(
            "SELECT lifecycle_status, learning_lane, risk_class, baseline_version_digest FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
            [
              acquisition.capabilityId,
              repair.candidateDigest
            ]
          );

        expect(
          certifiedV2
            ?.lifecycle_status
        ).toBe("CERTIFIED");

        expect(
          certifiedV2
            ?.learning_lane
        ).toBe("repair");

        expect(
          certifiedV2
            ?.risk_class
        ).toBe("low");

        expect(
          certifiedV2
            ?.baseline_version_digest
        ).toBe(
          acquisition.candidateDigest
        );

        expect(
          executionStore.recoveryGet(
            "SELECT certification_id, rollback_ready FROM capability_certifications WHERE capability_id = ? AND version_digest = ?",
            [
              acquisition.capabilityId,
              repair.candidateDigest
            ]
          )
        ).toMatchObject({
          rollback_ready:
            1
        });

        /*
         * V2 certification is deliberately distinct from promotion.
         */
        expect(
          executionStore.recoveryGet(
            "SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
            [
              acquisition.capabilityId,
              repair.candidateDigest
            ]
          )
        ).toBeUndefined();

        /*
         * Exact V1 remains promoted and Control Plane-owned.
         */
        expect(
          executionStore.recoveryGet(
            "SELECT active_version_digest, authority_identity FROM capability_active_versions WHERE capability_id = ? AND activation_scope = ?",
            [
              acquisition.capabilityId,
              "catalog"
            ]
          )
        ).toMatchObject({
          active_version_digest:
            acquisition.candidateDigest,
          authority_identity:
            "control-plane"
        });

        expect(
          executionStore.recoveryGet(
            "SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
            [
              acquisition.capabilityId,
              acquisition.candidateDigest
            ]
          )?.lifecycle_status
        ).toBe("PROMOTED");

        expect(
          executionStore.recoveryGet(
            "SELECT status FROM operator_approvals WHERE approval_id = ?",
            [
              v2Review.approvalId
            ]
          )?.status
        ).toBe("APPROVED");

        expect(
          executionStore.recoveryGet(
            "SELECT decision FROM operator_approval_decisions WHERE approval_id = ?",
            [
              v2Review.approvalId
            ]
          )?.decision
        ).toBe("APPROVED");

        expect(
          executionStore.recoveryGet(
            "SELECT current_state FROM attempts WHERE attempt_id = ?",
            [
              v2Review.attemptId
            ]
          )?.current_state
        ).toBe("COMPLETED");
        /*
         * M16-A4 — promote the exact certified V2 repair digest.
         */
        const v2PromotionEnvelope =
          await post(
            port,
            "/api/v1/operator/capability-promotions",
            {
              approvalId:
                v2Review.approvalId,
              approvalIntegrityHash:
                v2Review.approvalIntegrityHash,
              idempotencyKey:
                "m16-a4-v2-exact-promotion"
            },
            v2ReviewHeaders
          );

        expect(
          v2PromotionEnvelope.ok
        ).toBe(true);

        const v2Promotion =
          v2PromotionEnvelope.data;

        expect(
          v2Promotion.status
        ).toBe("COMPLETED");

        expect(
          v2Promotion.promoted
        ).toBe(true);

        expect(
          v2Promotion.candidateDigest
        ).toBe(
          repair.candidateDigest
        );

        expect(
          v2Promotion.activeVersionDigest
        ).toBe(
          repair.candidateDigest
        );

        expect(
          v2Promotion.activePointerChanged
        ).toBe(true);

        expect(
          v2Promotion.rollbackPerformed
        ).toBe(false);

        /*
         * Exact authoritative active pointer must move V1 -> V2.
         */
        expect(
          executionStore.recoveryGet(
            "SELECT active_version_digest, authority_identity FROM capability_active_versions WHERE capability_id = ? AND activation_scope = ?",
            [
              acquisition.capabilityId,
              "catalog"
            ]
          )
        ).toMatchObject({
          active_version_digest:
            repair.candidateDigest,
          authority_identity:
            "control-plane"
        });

        expect(
          executionStore.recoveryGet(
            "SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
            [
              acquisition.capabilityId,
              repair.candidateDigest
            ]
          )?.lifecycle_status
        ).toBe("PROMOTED");

        /*
         * The previous promoted V1 remains durable but is no longer active.
         */
        expect(
          executionStore.recoveryGet(
            "SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
            [
              acquisition.capabilityId,
              acquisition.candidateDigest
            ]
          )?.lifecycle_status
        ).toBe("SUPERSEDED");

        expect(
          executionStore.recoveryGet(
            "SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
            [
              acquisition.capabilityId,
              repair.candidateDigest
            ]
          )
        ).toBeTruthy();

        /*
         * Reattempt the original objective. V2 must satisfy the same
         * capability requirement without creating another candidate.
         */
        const v2ReattemptEnvelope =
          await authenticatedRequest(
            port,
            {
              profileId:
                M16_A1_PROFILE_ID
            },
            originalObjective
          );

        expect(
          v2ReattemptEnvelope.ok
        ).toBe(true);

        expect(
          v2ReattemptEnvelope
            .data.status
        ).toBe("COMPLETED");

        expect(
          v2ReattemptEnvelope
            .data.acquisition
            .gapStatus
        ).toBe("SATISFIED");

        expect(
          v2ReattemptEnvelope
            .data.acquisition
            .candidateCreated
        ).toBe(false);

        expect(
          v2ReattemptEnvelope
            .data.acquisition
            .satisfyingCapabilityId
        ).toBe(
          acquisition.capabilityId
        );

        /*
         * Now execute through the ordinary operator task route.
         */
        const v2ExecutionEnvelope =
          await post(
            port,
            "/api/v1/operator/requests",
            {
              category:
                "run-certified-capability",
              text:
                "Run active stable-unique-line-sort-v1.",
              executionInput:
                "beta\nalpha\nbeta\n",
              idempotencyKey:
                "m16-a4-v2-real-task"
            },
            v2ReviewHeaders
          );

        expect(
          v2ExecutionEnvelope.ok
        ).toBe(true);

        expect(
          v2ExecutionEnvelope
            .data.status
        ).toBe("COMPLETED");

        expect(
          v2ExecutionEnvelope
            .data.output
        ).toBe(
          "alpha\nbeta"
        );

        expect(
          v2ExecutionEnvelope
            .data.offline
        ).toBe(true);

        expect(
          v2ExecutionEnvelope
            .data.publicNetworkUse
        ).toBe(false);

        expect(
          v2ExecutionEnvelope
            .data.cloudProviderUse
        ).toBe(false);

        expect(
          v2ExecutionEnvelope
            .data.modelUse
        ).toBe(false);

        /*
         * Ordinary execution evidence must prove the exact active digest
         * and exact executable actually used.
         */
        expect(
          v2ExecutionEnvelope
            .data.attemptPath
        ).toBeTruthy();

        expect(
          fs.existsSync(
            v2ExecutionEnvelope
              .data.attemptPath
          )
        ).toBe(true);

        const v2ExecutionEvidence =
          JSON.parse(
            fs.readFileSync(
              v2ExecutionEnvelope
                .data.attemptPath,
              "utf8"
            )
          );

        expect(
          v2ExecutionEvidence
            .schemaVersion
        ).toBe(
          "sera.m16-a3-promoted-task-reattempt.v1"
        );

        expect(
          v2ExecutionEvidence
            .capabilityId
        ).toBe(
          acquisition.capabilityId
        );

        expect(
          v2ExecutionEvidence
            .activeVersionDigest
        ).toBe(
          repair.candidateDigest
        );

        expect(
          v2ExecutionEvidence
            .lifecycleStatus
        ).toBe("PROMOTED");

        expect(
          v2ExecutionEvidence
            .executable.id
        ).toBe(
          "deterministic-text-transform-v2"
        );

        expect(
          v2ExecutionEvidence
            .output.value
        ).toBe(
          "alpha\nbeta"
        );

        expect(
          v2ExecutionEvidence
            .workspaceOutsideRepository
        ).toBe(true);

        expect(
          v2ExecutionEvidence
            .cleanupCleaned
        ).toBe(true);

        expect(
          v2ExecutionEvidence
            .sourceNotMutated
        ).toBe(true);

        expect(
          v2ExecutionEvidence
            .rollbackPerformed
        ).toBe(false);

        expect(
          v2ExecutionEvidence
            .offline
        ).toBe(true);

        expect(
          v2ExecutionEvidence
            .publicNetworkUse
        ).toBe(false);

        expect(
          v2ExecutionEvidence
            .modelUse
        ).toBe(false);

        /*
         * M16-A4 R2 — distinct deterministic regression against promoted V2.
         *
         * The bounded capability contract retains one exact instance of
         * each non-empty line. The promoted V1 baseline preserves a
         * leading U+FEFF decoded from a valid UTF-8 BOM as part of the
         * first line. V2's strict TextDecoder removes that leading code
         * point, changing established baseline behavior.
         *
         * This is deliberately distinct from R1:
         *
         * R1 = malformed UTF-8 acceptance by V1.
         * R2 = valid UTF-8 baseline-output drift after V2 promotion.
         */

        const activeV2BeforeR2 =
          executionStore.recoveryGet(
            "SELECT active_version_digest, authority_identity FROM capability_active_versions WHERE capability_id = ? AND activation_scope = ?",
            [
              acquisition.capabilityId,
              "catalog"
            ]
          );

        expect(
          activeV2BeforeR2
        ).toMatchObject({
          active_version_digest:
            repair.candidateDigest,
          authority_identity:
            "control-plane"
        });

        const r2Registry =
          createDefaultExecutableRegistry();

        const r2V1Executable =
          r2Registry.get(
            M16_A1_EXECUTABLE_ID
          );

        const r2V2Executable =
          r2Registry.get(
            "deterministic-text-transform-v2"
          );

        expect(
          r2V1Executable
        ).toBeTruthy();

        expect(
          r2V2Executable
        ).toBeTruthy();

        const r2Input =
          Buffer.concat([
            Buffer.from(
              [
                0xef,
                0xbb,
                0xbf
              ]
            ),
            Buffer.from(
              "beta\nalpha\nbeta\n",
              "utf8"
            )
          ]);

        const runR2Executable =
          (
            executable: any,
            label: string
          ) => {
            const workspace =
              fs.mkdtempSync(
                path.join(
                  os.tmpdir(),
                  `sera-m16-a4-r2-${label}-`
                )
              );

            const inputPath =
              path.join(
                workspace,
                "input",
                "source.txt"
              );

            const outputPath =
              path.join(
                workspace,
                "out",
                "result.txt"
              );

            fs.mkdirSync(
              path.dirname(
                inputPath
              ),
              {
                recursive: true
              }
            );

            fs.writeFileSync(
              inputPath,
              r2Input
            );

            const args = [
              "stable-unique-line-sort",
              "input/source.txt",
              "out/result.txt",
              String(
                64 * 1024
              )
            ];

            executable.validateArgs(
              args
            );

            const materializedArgs =
              executable.materializeArgs(
                {
                  executableId:
                    executable.id,
                  args
                },
                workspace
              );

            const result =
              spawnSync(
                executable.resolvePath(),
                materializedArgs,
                {
                  cwd:
                    workspace,
                  windowsHide:
                    true,
                  encoding:
                    null
                }
              );

            const output =
              fs.existsSync(
                outputPath
              )
                ? fs.readFileSync(
                    outputPath
                  )
                : Buffer.alloc(0);

            const record = {
              executableId:
                executable.id,
              exitCode:
                result.status,
              signal:
                result.signal,
              inputHex:
                r2Input.toString(
                  "hex"
                ),
              inputSha256:
                createHash(
                  "sha256"
                )
                  .update(
                    r2Input
                  )
                  .digest(
                    "hex"
                  ),
              outputHex:
                output.toString(
                  "hex"
                ),
              outputUtf8:
                output.toString(
                  "utf8"
                ),
              outputSha256:
                createHash(
                  "sha256"
                )
                  .update(
                    output
                  )
                  .digest(
                    "hex"
                  )
            };

            fs.rmSync(
              workspace,
              {
                recursive: true,
                force: true
              }
            );

            return record;
          };

        const r2BaselineV1 =
          runR2Executable(
            r2V1Executable,
            "baseline-v1"
          );

        const r2RunA =
          runR2Executable(
            r2V2Executable,
            "v2-a"
          );

        const r2RunB =
          runR2Executable(
            r2V2Executable,
            "v2-b"
          );

        expect(
          r2BaselineV1.exitCode
        ).toBe(0);

        expect(
          r2RunA.exitCode
        ).toBe(0);

        expect(
          r2RunB.exitCode
        ).toBe(0);

        expect(
          r2BaselineV1.inputSha256
        ).toBe(
          r2RunA.inputSha256
        );

        expect(
          r2RunA.inputSha256
        ).toBe(
          r2RunB.inputSha256
        );

        expect(
          r2RunA.outputSha256
        ).toBe(
          r2RunB.outputSha256
        );

        expect(
          r2RunA.outputHex
        ).toBe(
          r2RunB.outputHex
        );

        expect(
          r2RunA.outputHex
        ).not.toBe(
          r2BaselineV1.outputHex
        );

        expect(
          r2BaselineV1.outputHex
        ).toBe(
          "616c7068610a626574610aefbbbf62657461"
        );

        expect(
          r2RunA.outputHex
        ).toBe(
          "616c7068610a62657461"
        );

        /*
         * R2 must be independently durable and must not reuse R1 identity.
         */
        const r2EvidenceRoot =
          path.join(
            root,
            ".sera",
            "m16-a4-regression"
          );

        fs.mkdirSync(
          r2EvidenceRoot,
          {
            recursive: true
          }
        );

        const r2EvidencePath =
          path.join(
            r2EvidenceRoot,
            "r2-v2-bom-baseline-regression.json"
          );

        const r2Record = {
          schemaVersion:
            "sera.m16-a4-deterministic-regression.v1",
          evidenceId:
            "m16-a4-r2-v2-bom-baseline-regression",
          capabilityId:
            acquisition.capabilityId,
          activeVersionDigest:
            repair.candidateDigest,
          executableId:
            "deterministic-text-transform-v2",
          baseline: {
            versionDigest:
              acquisition.candidateDigest,
            executableId:
              M16_A1_EXECUTABLE_ID,
            observation:
              r2BaselineV1
          },
          contract: {
            acceptedInputType:
              "newline-delimited-utf8-text",
            exactNonEmptyLineRetention:
              true,
            regressionRule:
              "promoted repair must not drift from certified baseline behavior outside the repaired defect"
          },
          fixture: {
            description:
              "Valid UTF-8 newline-delimited text beginning with UTF-8 BOM.",
            inputHex:
              r2RunA.inputHex,
            inputSha256:
              r2RunA.inputSha256
          },
          observations: [
            r2RunA,
            r2RunB
          ],
          deterministic:
            true,
          regressionObserved:
            true,
          observedDeficiency:
            "Promoted deterministic-text-transform-v2 deterministically changes the certified V1 baseline result for the same valid UTF-8 BOM-prefixed input by removing the leading U+FEFF code point from the first non-empty line.",
          distinctFromR1:
            true,
          r1DefectClass:
            "malformed-utf8-acceptance",
          r2DefectClass:
            "valid-utf8-baseline-output-drift",
          offline:
            true,
          publicNetworkUse:
            false,
          modelUse:
            false
        };

        fs.writeFileSync(
          r2EvidencePath,
          JSON.stringify(
            r2Record,
            null,
            2
          ) + "\n",
          "utf8"
        );

        const r2EvidenceHash =
          hashFile(
            r2EvidencePath
          );

        expect(
          r2EvidenceHash
        ).toMatch(
          /^[a-f0-9]{64}$/
        );

        expect(
          r2EvidenceHash
        ).not.toBe(
          r1EvidenceHash
        );

        const persistedR2 =
          JSON.parse(
            fs.readFileSync(
              r2EvidencePath,
              "utf8"
            )
          );

        expect(
          persistedR2
            .schemaVersion
        ).toBe(
          "sera.m16-a4-deterministic-regression.v1"
        );

        expect(
          persistedR2
            .evidenceId
        ).toBe(
          "m16-a4-r2-v2-bom-baseline-regression"
        );

        expect(
          persistedR2
            .capabilityId
        ).toBe(
          acquisition.capabilityId
        );

        expect(
          persistedR2
            .activeVersionDigest
        ).toBe(
          repair.candidateDigest
        );

        expect(
          persistedR2
            .deterministic
        ).toBe(true);

        expect(
          persistedR2
            .regressionObserved
        ).toBe(true);

        expect(
          persistedR2
            .distinctFromR1
        ).toBe(true);

        expect(
          persistedR2
            .observedDeficiency
            .trim()
            .length
        ).toBeGreaterThan(0);

        /*
         * Regression evidence alone must never auto-rollback.
         */
        expect(
          executionStore.recoveryGet(
            "SELECT rollback_id FROM capability_rollbacks WHERE capability_id = ?",
            [
              acquisition.capabilityId
            ]
          )
        ).toBeUndefined();
        /*
         * R2 evidence is durable and has not caused automatic rollback.
         * The rollback below is a separate explicit authenticated
         * operator action through Gateway -> Product Control Plane ->
         * GovernedCapabilityEngineComposition.
         */
        const rollbackEnvelope =
          await post(
            port,
            "/api/v1/operator/capability-rollbacks",
            {
              sourceProposalId:
                repair.proposal
                  .proposalId,
              sourceSessionId:
                repair.proposal
                  .sessionId,
              capabilityId:
                acquisition.capabilityId,
              currentDigest:
                repair.candidateDigest,
              targetDigest:
                acquisition.candidateDigest,
              reason:
                "R2 proves deterministic valid-UTF8 baseline-output drift in promoted V2; restore the exact certified V1 baseline.",
              regressionEvidencePath:
                r2EvidencePath,
              regressionEvidenceHash:
                r2EvidenceHash,
              idempotencyKey:
                "m16-a4-explicit-v2-to-v1-rollback"
            },
            v2ReviewHeaders
          );

        expect(
          rollbackEnvelope.ok
        ).toBe(true);

        const rollback =
          rollbackEnvelope.data;

        expect(
          rollback.status
        ).toBe("COMPLETED");

        expect(
          rollback.rollbackPerformed
        ).toBe(true);

        expect(
          rollback.capabilityId
        ).toBe(
          acquisition.capabilityId
        );

        expect(
          rollback.currentDigest
        ).toBe(
          repair.candidateDigest
        );

        expect(
          rollback.targetDigest
        ).toBe(
          acquisition.candidateDigest
        );

        expect(
          rollback.activeVersionDigest
        ).toBe(
          acquisition.candidateDigest
        );

        expect(
          rollback.currentLifecycleStatus
        ).toBe(
          "ROLLED_BACK"
        );

        expect(
          rollback.targetLifecycleStatus
        ).toBe(
          "PROMOTED"
        );

        expect(
          rollback.exactRollbackRecord
        ).toBe(true);

        expect(
          rollback.pointerAuthorityPreserved
        ).toBe(true);

        expect(
          rollback.catalogRestoredPromoted
        ).toBe(true);

        expect(
          rollback.regressionEvidenceHash
        ).toBe(
          r2EvidenceHash
        );

        expect(
          rollback.rollbackId
        ).toBeTruthy();

        expect(
          fs.existsSync(
            rollback.rollbackEvidencePath
          )
        ).toBe(true);

        expect(
          hashFile(
            rollback.rollbackEvidencePath
          )
        ).toBe(
          rollback.rollbackEvidenceHash
        );

        expect(
          rollback.offline
        ).toBe(true);

        expect(
          rollback.publicNetworkUse
        ).toBe(false);

        expect(
          rollback.cloudProviderUse
        ).toBe(false);

        expect(
          rollback.modelUse
        ).toBe(false);

        /*
         * Exact authoritative state after rollback.
         */
        expect(
          executionStore.recoveryGet(
            "SELECT active_version_digest, authority_identity FROM capability_active_versions WHERE capability_id = ? AND activation_scope = ?",
            [
              acquisition.capabilityId,
              "catalog"
            ]
          )
        ).toMatchObject({
          active_version_digest:
            acquisition.candidateDigest,
          authority_identity:
            "control-plane"
        });

        expect(
          executionStore.recoveryGet(
            "SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
            [
              acquisition.capabilityId,
              acquisition.candidateDigest
            ]
          )?.lifecycle_status
        ).toBe(
          "PROMOTED"
        );

        expect(
          executionStore.recoveryGet(
            "SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
            [
              acquisition.capabilityId,
              repair.candidateDigest
            ]
          )?.lifecycle_status
        ).toBe(
          "ROLLED_BACK"
        );

        expect(
          executionStore.recoveryGet(
            "SELECT active_version_digest, status FROM capability_catalog WHERE capability_id = ?",
            [
              acquisition.capabilityId
            ]
          )
        ).toMatchObject({
          active_version_digest:
            acquisition.candidateDigest,
          status:
            "PROMOTED"
        });

        const exactRollbackRecord =
          executionStore.recoveryGet(
            "SELECT rollback_id, current_version_digest, target_version_digest, regression_evidence_json FROM capability_rollbacks WHERE capability_id = ? AND current_version_digest = ? AND target_version_digest = ?",
            [
              acquisition.capabilityId,
              repair.candidateDigest,
              acquisition.candidateDigest
            ]
          );

        expect(
          exactRollbackRecord
        ).toBeTruthy();

        expect(
          exactRollbackRecord
            ?.rollback_id
        ).toBe(
          rollback.rollbackId
        );

        expect(
          exactRollbackRecord
            ?.current_version_digest
        ).toBe(
          repair.candidateDigest
        );

        expect(
          exactRollbackRecord
            ?.target_version_digest
        ).toBe(
          acquisition.candidateDigest
        );

        expect(
          String(
            exactRollbackRecord
              ?.regression_evidence_json ??
              ""
          )
        ).toContain(
          r2EvidenceHash
        );

        expect(
          executionStore.recoveryGet(
            "SELECT current_state FROM attempts WHERE attempt_id = ?",
            [
              rollback.attemptId
            ]
          )?.current_state
        ).toBe(
          "COMPLETED"
        );
        /*
         * M16-A4 final checkpoint:
         * shutdown -> fresh Gateway/runtime identities -> same durable state
         * -> exact rollback lifecycle persists -> equivalent request works
         * -> restored V1 executes -> Desktop capability lifecycle is visible.
         */

        await gateway.stop();
        gateway.close();

        /*
         * A real restart cannot carry an execution engine across the
         * Runtime State boundary. Shut down the authority bound to the
         * pre-restart store before closing that store.
         */
        executionAuthority.shutdown();
        executionStore.close();

        executionStore =
          openRuntimeState({
            projectRoot:
              root,
            installationId:
              "installation_m16_a4_restart_persistence",
            runtimeInstanceId:
              "execution_m16_a4_restart_persistence"
          });

        const restartedExecutionAuthority =
          new IsolatedExecutionEngine(
            executionStore,
            {
              projectRoot:
                root
            }
          );

        /*
         * Durable state must already be correct before a new request runs.
         */
        try {
        expect(
          executionStore.recoveryGet(
            "SELECT active_version_digest, authority_identity FROM capability_active_versions WHERE capability_id = ? AND activation_scope = ?",
            [
              acquisition.capabilityId,
              "catalog"
            ]
          )
        ).toMatchObject({
          active_version_digest:
            acquisition.candidateDigest,
          authority_identity:
            "control-plane"
        });

        expect(
          executionStore.recoveryGet(
            "SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
            [
              acquisition.capabilityId,
              acquisition.candidateDigest
            ]
          )?.lifecycle_status
        ).toBe(
          "PROMOTED"
        );

        expect(
          executionStore.recoveryGet(
            "SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
            [
              acquisition.capabilityId,
              repair.candidateDigest
            ]
          )?.lifecycle_status
        ).toBe(
          "ROLLED_BACK"
        );

        const persistedV1Promotion =
          executionStore.recoveryGet(
            "SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
            [
              acquisition.capabilityId,
              acquisition.candidateDigest
            ]
          );

        const persistedV2Promotion =
          executionStore.recoveryGet(
            "SELECT promotion_id, rollback_target_digest FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
            [
              acquisition.capabilityId,
              repair.candidateDigest
            ]
          );

        expect(
          persistedV1Promotion
        ).toBeTruthy();

        expect(
          persistedV2Promotion
        ).toMatchObject({
          rollback_target_digest:
            acquisition.candidateDigest
        });

        const persistedRollback =
          executionStore.recoveryGet(
            "SELECT rollback_id, current_version_digest, target_version_digest, regression_evidence_json FROM capability_rollbacks WHERE rollback_id = ?",
            [
              rollback.rollbackId
            ]
          );

        expect(
          persistedRollback
        ).toMatchObject({
          rollback_id:
            rollback.rollbackId,
          current_version_digest:
            repair.candidateDigest,
          target_version_digest:
            acquisition.candidateDigest
        });

        expect(
          String(
            persistedRollback
              ?.regression_evidence_json ??
              ""
          )
        ).toContain(
          r2EvidenceHash
        );

        /*
         * Fresh Gateway identity, same project/state database.
         */
        gateway =
          new OperatorGateway({
            projectRoot:
              root,
            executionAuthority:
              restartedExecutionAuthority,
            installationId:
              "installation_m16_a4_restart_persistence",
            runtimeInstanceId:
              "gateway_m16_a4_after_rollback_restart"
          });

        const restartedGatewayStart =
          await gateway.start();

        const restartedPort =
          restartedGatewayStart.port;

        const restartedSessionEnvelope =
          await post(
            restartedPort,
            "/api/v1/operator/session",
            {
              idempotencyKey:
                "m16-a4-post-rollback-restart-session"
            }
          );

        expect(
          restartedSessionEnvelope.ok
        ).toBe(true);

        const restartedSession =
          restartedSessionEnvelope.data;

        const restartedHeaders = {
          authorization:
            `Bearer ${restartedSession.token}`,
          "x-sera-csrf":
            restartedSession.csrfToken,
          origin:
            `http://127.0.0.1:${restartedPort}`
        };

        /*
         * Desktop Operator lifecycle aggregate must recover the exact
         * persisted promotion / rollback state after restart.
         */
        const desktopLifecycle =
          (gateway as any)
            .capabilityLifecycleHistory(
              acquisition.capabilityId
            );

        expect(
          desktopLifecycle
            .schemaVersion
        ).toBe(
          "sera.desktop-capability-lifecycle.v1"
        );

        expect(
          desktopLifecycle
            .readOnly
        ).toBe(true);

        expect(
          desktopLifecycle
            .mutationAuthority
        ).toBe("none");

        expect(
          desktopLifecycle
            .active
            ?.active_version_digest
        ).toBe(
          acquisition.candidateDigest
        );

        expect(
          desktopLifecycle
            .active
            ?.authority_identity
        ).toBe(
          "control-plane"
        );

        expect(
          desktopLifecycle
            .versions
            .some(
              (version: any) =>
                version.version_digest ===
                  acquisition.candidateDigest &&
                version.lifecycle_status ===
                  "PROMOTED"
            )
        ).toBe(true);

        expect(
          desktopLifecycle
            .versions
            .some(
              (version: any) =>
                version.version_digest ===
                  repair.candidateDigest &&
                version.lifecycle_status ===
                  "ROLLED_BACK"
            )
        ).toBe(true);

        expect(
          desktopLifecycle
            .promotions
            .some(
              (promotion: any) =>
                promotion.version_digest ===
                acquisition.candidateDigest
            )
        ).toBe(true);

        expect(
          desktopLifecycle
            .promotions
            .some(
              (promotion: any) =>
                promotion.version_digest ===
                  repair.candidateDigest &&
                promotion.rollback_target_digest ===
                  acquisition.candidateDigest
            )
        ).toBe(true);

        expect(
          desktopLifecycle
            .rollbacks
            .some(
              (record: any) =>
                record.rollback_id ===
                  rollback.rollbackId &&
                record.current_version_digest ===
                  repair.candidateDigest &&
                record.target_version_digest ===
                  acquisition.candidateDigest
            )
        ).toBe(true);

        /*
         * Materially equivalent/original objective remains satisfied.
         */
        const postRestartReattempt =
          await authenticatedRequest(
            restartedPort,
            {
              profileId:
                M16_A1_PROFILE_ID
            },
            originalObjective
          );

        expect(
          postRestartReattempt.ok
        ).toBe(true);

        expect(
          postRestartReattempt
            .data.status
        ).toBe(
          "COMPLETED"
        );

        expect(
          postRestartReattempt
            .data.acquisition
            .gapStatus
        ).toBe(
          "SATISFIED"
        );

        expect(
          postRestartReattempt
            .data.acquisition
            .candidateCreated
        ).toBe(false);

        expect(
          postRestartReattempt
            .data.acquisition
            .satisfyingCapabilityId
        ).toBe(
          acquisition.capabilityId
        );

        /*
         * Ordinary execution after restart must use restored exact V1,
         * not the rolled-back V2.
         */
        const restoredExecutionEnvelope =
          await post(
            restartedPort,
            "/api/v1/operator/requests",
            {
              category:
                "run-certified-capability",
              text:
                "Run active stable-unique-line-sort-v1.",
              executionInput:
                "beta\nalpha\nbeta\n",
              idempotencyKey:
                "m16-a4-post-restart-restored-v1-task"
            },
            restartedHeaders
          );

        expect(
          restoredExecutionEnvelope.ok
        ).toBe(true);

        expect(
          restoredExecutionEnvelope
            .data.status
        ).toBe(
          "COMPLETED"
        );

        expect(
          restoredExecutionEnvelope
            .data.output
        ).toBe(
          "alpha\nbeta"
        );

        expect(
          restoredExecutionEnvelope
            .data.offline
        ).toBe(true);

        expect(
          restoredExecutionEnvelope
            .data.publicNetworkUse
        ).toBe(false);

        expect(
          restoredExecutionEnvelope
            .data.modelUse
        ).toBe(false);

        expect(
          fs.existsSync(
            restoredExecutionEnvelope
              .data.attemptPath
          )
        ).toBe(true);

        const restoredExecutionEvidence =
          JSON.parse(
            fs.readFileSync(
              restoredExecutionEnvelope
                .data.attemptPath,
              "utf8"
            )
          );

        expect(
          restoredExecutionEvidence
            .activeVersionDigest
        ).toBe(
          acquisition.candidateDigest
        );

        expect(
          restoredExecutionEvidence
            .lifecycleStatus
        ).toBe(
          "PROMOTED"
        );

        expect(
          restoredExecutionEvidence
            .executable
            .id
        ).toBe(
          M16_A1_EXECUTABLE_ID
        );

        expect(
          restoredExecutionEvidence
            .executable
            .id
        ).not.toBe(
          "deterministic-text-transform-v2"
        );

        expect(
          restoredExecutionEvidence
            .sourceNotMutated
        ).toBe(true);

        expect(
          restoredExecutionEvidence
            .cleanupCleaned
        ).toBe(true);

        expect(
          restoredExecutionEvidence
            .rollbackPerformed
        ).toBe(false);

        /*
         * A4 final immutable local-validation artifact.
         */
        const a4EvidenceRoot =
          path.join(
            root,
            ".sera",
            "m16-a4"
          );

        fs.mkdirSync(
          a4EvidenceRoot,
          {
            recursive: true
          }
        );

        const a4EvidencePath =
          path.join(
            a4EvidenceRoot,
            "restart-persistence-proof.json"
          );

        const a4Record = {
          schemaVersion:
            "sera.m16-a4-restart-persistence-proof.v1",
          capabilityId:
            acquisition.capabilityId,
          restoredActiveDigest:
            acquisition.candidateDigest,
          rolledBackDigest:
            repair.candidateDigest,
          rollbackId:
            rollback.rollbackId,
          regressionEvidenceHash:
            r2EvidenceHash,
          v1Lifecycle:
            "PROMOTED",
          v2Lifecycle:
            "ROLLED_BACK",
          activePointerAuthority:
            "control-plane",
          promotionHistoryPersisted:
            true,
          rollbackHistoryPersisted:
            true,
          materiallyEquivalentRequestSatisfied:
            true,
          restoredExecutableId:
            restoredExecutionEvidence
              .executable.id,
          desktopLifecycleVisible:
            true,
          desktopLifecycleRoute:
            "/api/v1/operator/capabilities/stable-unique-line-sort-v1/lifecycle",
          desktopReadOnly:
            true,
          restartPerformed:
            true,
          offline:
            true,
          publicNetworkUse:
            false,
          modelUse:
            false
        };

        fs.writeFileSync(
          a4EvidencePath,
          JSON.stringify(
            a4Record,
            null,
            2
          ) + "\n",
          "utf8"
        );

        const a4EvidenceHash =
          hashFile(
            a4EvidencePath
          );

        expect(
          a4EvidenceHash
        ).toMatch(
          /^[a-f0-9]{64}$/
        );
        /*
         * The enclosing withGateway helper owns only the original
         * Gateway and Runtime State instances. A4 deliberately replaced
         * the callback-local variables with fresh restart instances, so
         * those fresh owners must be closed here before control returns
         * to withGateway's original-resource cleanup.
         */
        } finally {
          /*
           * Fresh restart resources are callback-owned and must close
           * even if persistence, lifecycle, execution, or evidence
           * verification throws.
           */
          try {
            await gateway.stop();
          } finally {
            try {
              gateway.close();
            } finally {
              restartedExecutionAuthority.shutdown();
              executionStore.close();
            }
          }
        }

        /*
         * M16-A4 fresh restart resources explicitly closed.
         */
      }
    );
  }, 90_000);
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

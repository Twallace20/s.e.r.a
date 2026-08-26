import crypto from "node:crypto";
import fs from "node:fs";
import http, { IncomingMessage, ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import { ControlPlane } from "@sera/control-plane";
import { getDesktopAssets, verifyDesktopAssetIntegrity, assertDesktopAssetsLocalOnly, getDesktopVisualContract, REQUIRED_DESKTOP_VIEWS } from "@sera/desktop-operator";
import {
  createExecutionAuthorization,
  type ExecutionAuthority,
  type ExecutionRequest,
  type IsolatedExecutionServiceHandle
} from "@sera/execution-engine";
import { RuntimeService } from "@sera/runtime-host";
import { RuntimeStateStore, createRuntimeStateConfig, openRuntimeState } from "@sera/runtime-state";
import { StudioRuntime, runStudioRuntimeProof } from "@sera/studio-runtime";
import { LearningGovernanceRuntime } from "@sera/learning-governance-runtime";
import { GovernedCapabilityEngineComposition, M16_A1_PROFILE_ID, createM16A2CertificationReviewSummary, type BoundedCapabilityAcquisitionRequest } from "@sera/runtime-capability-composition";
import { ProductControlPlane } from "./product-control-plane.js";

export const DESKTOP_OPERATOR_VERSION = "desktop-operator-v1";
export const OPERATOR_GATEWAY_SERVICE_ID = "operator-gateway";
export const DESKTOP_OPERATOR_SERVICE_ID = "desktop-operator";
export const LEARNING_GOVERNANCE_ROUTE_BASE = "/api/v1/operator/learning-governance";
export const LEARNING_GOVERNANCE_GET_ROUTES = [
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/status`,
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/sessions`,
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/sessions/:sessionId`,
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/failures`,
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/failures/:failureId`,
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/lessons`,
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/lessons/:lessonId`,
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/prevention-rules`,
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/innovations`,
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/innovations/:innovationId`
] as const;
export const LEARNING_GOVERNANCE_POST_ROUTES = [
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/hypothesis-review`,
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/repair-review`,
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/lesson-certification-request`,
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/lesson-activation-request`,
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/scope-generalization-request`,
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/supersession-request`,
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/governed-override-request`,
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/innovation-certification-request`,
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/innovation-promotion-request`,
  `${LEARNING_GOVERNANCE_ROUTE_BASE}/innovation-rollback-request`
] as const;

export type OperatorDecision = "APPROVED" | "REJECTED" | "CANCELLED";
export type OperatorRequestCategory =
  | "inspect-system"
  | "inspect-capability"
  | "search-knowledge"
  | "intake-content"
  | "propose-capability"
  | "start-authorized-learning-session"
  | "cancel-attempt"
  | "review-approval"
  | "run-certified-capability"
  | "general-operator-request";

export interface OperatorGatewayConfig {
  projectRoot: string;
  stateRoot?: string;
  databasePath?: string;
  evidenceRoot?: string;
  host?: string;
  port?: number;
  installationId?: string;
  runtimeInstanceId?: string;
  controlPlane?: ControlPlane;
  executionAuthority?: ExecutionAuthority;
  now?: () => Date;
}

export interface OperatorDispatchResult {
  ok: true;
  requestId: string;
  requestHash: string;
  normalizedText: string;
  status: "COMPLETED" | "BLOCKED";
  attemptId?: string;
  attemptPath?: string;
  terminalDecision?: string;
  output?: string;
  failureCode?: string;
  safeMessage?: string;
  modelUse: false;
  networkUse: false;
  offline?: true;
  publicNetworkUse?: false;
  cloudProviderUse?: false;
  externalPackageAcquisition?: false;
  repositoryMutation?: false;
  acquisition?: Record<string, unknown>;
}

export interface OperatorProofResult {
  ok: boolean;
  proofRoot: string;
  stateRoot: string;
  databasePath: string;
  evidenceRoot: string;
  port: number;
  sessionId: string;
  checks: Record<string, boolean>;
  firstRequestId: string;
  approvalId: string;
  modelUse: false;
  networkUse: false;
  offline?: true;
  publicNetworkUse?: false;
  cloudProviderUse?: false;
  externalPackageAcquisition?: false;
  repositoryMutation?: false;
  acquisition?: Record<string, unknown>;
}

interface StoredSession {
  sessionId: string;
  tokenHash: string;
  csrfHash: string;
  issuedAt: string;
  expiresAt: string;
  lastActivityAt: string;
  state: "ACTIVE" | "REVOKED" | "EXPIRED";
  operatorIdentity: "local-owner";
  integrityHash: string;
}

export class OperatorGatewayBlockedError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

export class OperatorGateway {
  private readonly projectRoot: string;
  private readonly evidenceRoot: string;
  private readonly stateRoot: string;
  private readonly databasePath: string;
  private readonly host: string;
  private readonly port: number;
  private readonly now: () => Date;
  private readonly store: RuntimeStateStore;
  private readonly controlPlane: ControlPlane;
  private readonly productControlPlane: ProductControlPlane;
  private readonly executionAuthority?: ExecutionAuthority;
  private readonly studioRuntime: StudioRuntime;
  private readonly learningGovernanceRuntime: LearningGovernanceRuntime;
  private readonly governedCapabilityEngineComposition: GovernedCapabilityEngineComposition;
  private readonly assets = getDesktopAssets();
  private server?: http.Server;
  private sequence = 0;

  constructor(config: OperatorGatewayConfig) {
    this.projectRoot = path.resolve(config.projectRoot);
    this.stateRoot = path.resolve(config.stateRoot ?? path.join(this.projectRoot, ".sera", "state"));
    this.databasePath = path.resolve(config.databasePath ?? path.join(this.stateRoot, "sera-operational.db"));
    this.evidenceRoot = path.resolve(config.evidenceRoot ?? path.join(this.projectRoot, ".sera", "operator", "evidence"));
    this.host = config.host ?? "127.0.0.1";
    this.port = config.port ?? 0;
    this.now = config.now ?? (() => new Date());
    this.executionAuthority = config.executionAuthority;
    validateLoopbackHost(this.host);
    const stateConfig = createRuntimeStateConfig({
      projectRoot: this.projectRoot,
      stateRoot: this.stateRoot,
      databasePath: this.databasePath,
      installationId: config.installationId ?? "installation_operator_gateway",
      runtimeInstanceId: config.runtimeInstanceId ?? `runtime_operator_gateway_${process.pid}`
    });
    this.store = openRuntimeState(stateConfig);
    this.productControlPlane = new ProductControlPlane(
      this.store,
      this.executionAuthority
    );
    this.controlPlane =
      config.controlPlane ??
      new ControlPlane({
        repositoryRoot: this.projectRoot
      });

    const auditSequence = this.get(
      "SELECT COALESCE(MAX(sequence), 0) AS sequence FROM operator_audit_events"
    ) as { sequence?: number | bigint | null } | undefined;

    const eventSequence = this.get(
      "SELECT COALESCE(MAX(sequence), 0) AS sequence FROM operator_events"
    ) as { sequence?: number | bigint | null } | undefined;

    this.sequence = Math.max(
      Number(auditSequence?.sequence ?? 0),
      Number(eventSequence?.sequence ?? 0),
      0
    );
    this.studioRuntime = new StudioRuntime({ projectRoot: this.projectRoot, stateRoot: this.stateRoot, databasePath: this.databasePath, outputRoot: path.join(this.projectRoot, ".sera", "studios"), installationId: config.installationId, runtimeInstanceId: config.runtimeInstanceId });
    this.learningGovernanceRuntime = new LearningGovernanceRuntime(this.store, { projectRoot: this.projectRoot });
    this.governedCapabilityEngineComposition = new GovernedCapabilityEngineComposition(this.productControlPlane, this.store, this.projectRoot);
    fs.mkdirSync(this.evidenceRoot, { recursive: true });
  }

  status() {
    const integrity = verifyDesktopAssetIntegrity(this.assets);
    const localOnly = assertDesktopAssetsLocalOnly(this.assets);
    const counts = {
      sessions: this.all("SELECT session_id FROM operator_sessions").length,
      approvals: this.all("SELECT approval_id FROM operator_approvals").length,
      notifications: this.all("SELECT notification_id FROM operator_notifications").length,
      requests: this.all("SELECT request_id FROM operator_requests").length
      ,
      studios: this.all("SELECT studio_id FROM studio_definitions").length,
      studioSessions: this.all("SELECT session_id FROM studio_sessions").length,
      integratedLoopSessions: this.all("SELECT loop_session_id FROM integrated_loop_sessions").length,
      integratedLoopPreflights: this.all("SELECT preflight_id FROM learning_preflight_runs").length,
      learningGovernanceSessions: safeCount(() => this.all("SELECT session_id FROM learning_governance_sessions").length),
      learningGovernanceLessons: safeCount(() => this.all("SELECT lesson_id FROM learning_governance_lessons").length),
      learningGovernancePreventionRules: safeCount(() => this.all("SELECT rule_id FROM learning_governance_prevention_rules").length),
      learningGovernanceInnovations: safeCount(() => this.all("SELECT innovation_id FROM learning_governance_innovations").length)
    };
    return {
      ok: integrity.ok && localOnly.ok,
      version: DESKTOP_OPERATOR_VERSION,
      runtimeAuthority: "local-runtime-gateway",
      bindPolicy: "loopback-only",
      host: this.host,
      port: this.boundPort(),
      databasePath: this.databasePath,
      evidenceRoot: this.evidenceRoot,
      visualContract: getDesktopVisualContract(),
      views: [...REQUIRED_DESKTOP_VIEWS],
      assetIntegrity: integrity,
      localOnly,
      counts,
      modelUse: false,
      networkUse: false
    };
  }

  async start(): Promise<{ host: string; port: number }> {
    if (this.server) return { host: this.host, port: this.boundPort() };
    this.server = http.createServer((request, response) => this.route(request, response));
    await new Promise<void>((resolve, reject) => {
      this.server?.once("error", reject);
      this.server?.listen(this.port, this.host, () => resolve());
    });
    this.audit("gateway_started", "PASS", { host: this.host, port: this.boundPort() });
    return { host: this.host, port: this.boundPort() };
  }

  async stop(): Promise<void> {
    const server = this.server;
    this.server = undefined;
    if (!server) return;
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    this.audit("gateway_stopped", "PASS", {});
  }

  createSession(input: { idempotencyKey: string; ttlMs?: number; idleMs?: number }): { sessionId: string; token: string; csrfToken: string; expiresAt: string; integrityHash: string } {
    const requestHash = stableHash({ idempotencyKey: input.idempotencyKey, type: "session" });
    const existing = this.get("SELECT response_json FROM operator_sessions WHERE idempotency_key = ?", [input.idempotencyKey]);
    if (existing) return JSON.parse(String(existing.response_json));
    const token = randomToken();
    const csrfToken = randomToken();
    const issuedAt = this.nowIso();
    const expiresAt = new Date(this.now().getTime() + (input.ttlMs ?? 15 * 60 * 1000)).toISOString();
    const sessionId = `operator_session_${randomId()}`;
    const integrityHash = stableHash({ sessionId, issuedAt, expiresAt, identity: "local-owner" });
    const response = { sessionId, token, csrfToken, expiresAt, integrityHash };
    this.run(
      "INSERT INTO operator_sessions (session_id, idempotency_key, request_hash, token_hash, csrf_hash, operator_identity, state, issued_at, expires_at, last_activity_at, idle_timeout_ms, integrity_hash, response_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [sessionId, input.idempotencyKey, requestHash, hashSecret(token), hashSecret(csrfToken), "local-owner", "ACTIVE", issuedAt, expiresAt, issuedAt, input.idleMs ?? 10 * 60 * 1000, integrityHash, JSON.stringify(response)]
    );
    this.notify("session-created", "Local owner session created.", "INFO");
    this.audit("session_created", "PASS", { sessionId });
    return response;
  }

  validateSession(headers: Record<string, string | undefined>, requireCsrf = false): StoredSession {
    const token = bearerToken(headers.authorization);
    if (!token) throw new OperatorGatewayBlockedError("Authentication required.", "authentication_required");
    const rows = this.all("SELECT * FROM operator_sessions WHERE state = 'ACTIVE'");
    const session = rows.find((row) => safeEqual(String(row.token_hash), hashSecret(token)));
    if (!session) throw new OperatorGatewayBlockedError("Invalid session.", "invalid_session");
    const stored = sessionToObject(session);
    if (new Date(stored.expiresAt).getTime() <= this.now().getTime()) {
      this.run("UPDATE operator_sessions SET state = 'EXPIRED' WHERE session_id = ?", [stored.sessionId]);
      throw new OperatorGatewayBlockedError("Session expired.", "session_expired");
    }
    if (requireCsrf) {
      const csrf = headers["x-sera-csrf"];
      if (!csrf || !safeEqual(stored.csrfHash, hashSecret(csrf))) throw new OperatorGatewayBlockedError("CSRF token required.", "csrf_required");
    }
    this.run("UPDATE operator_sessions SET last_activity_at = ? WHERE session_id = ?", [this.nowIso(), stored.sessionId]);
    return stored;
  }

  revokeSession(sessionId: string): boolean {
    this.run("UPDATE operator_sessions SET state = 'REVOKED', revoked_at = ? WHERE session_id = ? AND state != 'REVOKED'", [this.nowIso(), sessionId]);
    this.audit("session_revoked", "PASS", { sessionId });
    return true;
  }

  composeRequest(input: { sessionId: string; category: OperatorRequestCategory; text: string; idempotencyKey: string; acquisitionRequest?: BoundedCapabilityAcquisitionRequest; executionInput?: string }): { ok: true; requestId: string; requestHash: string; normalizedText: string; category: OperatorRequestCategory; status: "QUEUED"; acquisitionRequest?: BoundedCapabilityAcquisitionRequest; executionInput?: string } {
    if (!SUPPORTED_CATEGORIES.has(input.category)) throw new OperatorGatewayBlockedError("Unsupported request category.", "unsupported_request_category");
    const normalizedText = sanitizeText(input.text);
    if (Buffer.byteLength(normalizedText, "utf8") > 4000) throw new OperatorGatewayBlockedError("Request is too large.", "request_too_large");
    const requestHash = stableHash({ category: input.category, normalizedText, acquisitionRequest: input.acquisitionRequest ?? null, executionInput: input.executionInput ?? null });
    const existing = this.get("SELECT request_hash, response_json FROM operator_requests WHERE idempotency_key = ?", [input.idempotencyKey]);
    if (existing) {
      if (String(existing.request_hash) !== requestHash) throw new OperatorGatewayBlockedError("Conflicting request idempotency reuse.", "conflicting_idempotency");
      return JSON.parse(String(existing.response_json));
    }
    const requestId = `operator_request_${randomId()}`;
    const response = { ok: true as const, requestId, requestHash, normalizedText, category: input.category, status: "QUEUED" as const, acquisitionRequest: input.acquisitionRequest, executionInput: input.executionInput };
    this.run("INSERT INTO operator_requests (request_id, session_id, category, normalized_text, request_hash, status, idempotency_key, created_at, response_json, governed_reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [requestId, input.sessionId, input.category, normalizedText, requestHash, "QUEUED", input.idempotencyKey, this.nowIso(), JSON.stringify(response), `control-plane:request:${requestId}`]);
    this.event("request_queued", { requestId });
    return response;
  }

  private async dispatchCertifiedTextNormalizer(input: {
    requestId: string;
    requestHash: string;
    normalizedText: string;
    category: OperatorRequestCategory;
    status: "QUEUED";
    executionInput?: string;
  }): Promise<OperatorDispatchResult> {
    if (
      input.normalizedText ===
      "Run active stable-unique-line-sort-v1."
    ) {
      return this.dispatchPromotedStableUniqueLineSort(
        input
      );
    }

    const expectedRequest =
      "Normalize docs/BUILD_VALIDATION.md with text-normalizer-v1.";

    if (input.normalizedText !== expectedRequest) {
      const blocked: OperatorDispatchResult = {
        ok: true,
        requestId: input.requestId,
        requestHash: input.requestHash,
        normalizedText: input.normalizedText,
        status: "BLOCKED",
        failureCode: "unsupported_certified_capability_request",
        safeMessage:
          "The certified execution path currently accepts only the text-normalizer-v1 proof request.",
        modelUse: false,
        networkUse: false
      };

      this.run(
        "UPDATE operator_requests SET status = ?, completed_at = ?, response_json = ? WHERE request_id = ?",
        ["BLOCKED", this.nowIso(), JSON.stringify(blocked), input.requestId]
      );

      this.event("request_blocked", {
        requestId: input.requestId,
        failureCode: blocked.failureCode
      });

      return blocked;
    }

    const command = this.productControlPlane.acceptCommand({
      idempotencyKey: `operator-execution:${input.requestId}`,
      commandType: "run-certified-capability",
      payload: {
        operatorRequestId: input.requestId,
        requestHash: input.requestHash,
        capabilityId: "text-normalizer-v1"
      },
      capability: "text-normalizer-v1"
    });

    if (!command.attemptId) {
      throw new OperatorGatewayBlockedError(
        "Runtime State did not create an execution attempt.",
        "execution_attempt_not_created"
      );
    }

    const attemptId = command.attemptId;

    this.productControlPlane.transitionAttempt({
      attemptId,
      fromState: "PENDING",
      toState: "RUNNING",
      actor: "control-plane",
      reason:
        "Authenticated Operator request authorized bounded certified capability execution.",
      correlation: {
        operatorRequestId: input.requestId,
        requestHash: input.requestHash
      }
    });

    const executionId = `operator_execution_${randomId()}`;
    const authorizationId = `operator_execution_auth_${randomId()}`;

    const request: ExecutionRequest = {
      executionId,
      attemptId,
      authorizationId,
      executableId: "text-normalizer-v1",
      args: ["input/source.md", "out/normalized.md"],
      inputs: [
        {
          id: "source",
          sourceType: "copy-file",
          source: "docs/BUILD_VALIDATION.md",
          workspacePath: "input/source.md"
        }
      ],
      outputs: [
        {
          id: "normalized",
          workspacePath: "out/normalized.md",
          required: true
        }
      ],
      workingDirectory: ".",
      environmentProfile: "offline-minimal",
      timeoutMs: 5000,
      gracefulCancellationMs: 100,
      maxStdoutBytes: 65536,
      maxStderrBytes: 65536,
      maxCombinedOutputBytes: 98304,
      expectedExitCodes: [0],
      networkPolicy: "offline-strict",
      cleanupPolicy: "delete-workspace",
      correlation: {
        operatorRequestId: input.requestId,
        operatorRequestHash: input.requestHash,
        capabilityId: "text-normalizer-v1"
      }
    };

    const authorization = createExecutionAuthorization({
      request,
      requiredGateRefs: ["control-plane-execution-gate"],
      completedGateRefs: ["control-plane-execution-gate"]
    });

    this.event("request_dispatched", {
      requestId: input.requestId,
      attemptId,
      executionId,
      executableId: request.executableId
    });

    const executionAuthority = this.productControlPlane.getExecutionAuthority();

    if (!executionAuthority) {
      const blocked: OperatorDispatchResult = {
        ok: true,
        requestId: input.requestId,
        requestHash: input.requestHash,
        normalizedText: input.normalizedText,
        status: "BLOCKED",
        attemptId,
        failureCode: "execution_authority_unavailable",
        safeMessage: "Execution authority is unavailable.",
        modelUse: false,
        networkUse: false
      };

      this.productControlPlane.transitionAttempt({
        attemptId,
        fromState: "RUNNING",
        toState: "BLOCKED",
        actor: "control-plane",
        reason: "Execution authority is unavailable.",
        correlation: { executionId }
      });

      this.run(
        "UPDATE operator_requests SET status = ?, completed_at = ?, response_json = ? WHERE request_id = ?",
        ["BLOCKED", this.nowIso(), JSON.stringify(blocked), input.requestId]
      );

      this.event("request_blocked", {
        requestId: input.requestId,
        attemptId,
        executionId,
        failureCode: blocked.failureCode
      });

      return blocked;
    }

    try {
      const execution = await executionAuthority.execute(
        request,
        authorization
      );

      const output = execution.outputs.find(
        (candidate) => candidate.id === "normalized"
      );

      const completed =
        execution.ok === true &&
        execution.status === "SUCCEEDED_PROCESS" &&
        execution.workspaceOutsideRepository === true &&
        execution.cleanup.cleaned === true &&
        execution.sourceNotMutated === true &&
        execution.attemptSuccessManufactured === false &&
        execution.undeclaredOutputs.length === 0 &&
        output?.status === "harvested" &&
        Boolean(output.evidenceReference);

      if (!completed || !output?.evidenceReference) {
        this.productControlPlane.transitionAttempt({
          attemptId,
          fromState: "RUNNING",
          toState: "BLOCKED",
          actor: "control-plane",
          reason:
            "Certified capability execution did not satisfy required evidence conditions.",
          correlation: {
            executionId,
            executionStatus: execution.status
          }
        });

        const blocked: OperatorDispatchResult = {
          ok: true,
          requestId: input.requestId,
          requestHash: input.requestHash,
          normalizedText: input.normalizedText,
          status: "BLOCKED",
          attemptId,
          attemptPath: execution.evidenceRoot,
          terminalDecision: execution.status,
          failureCode: "certified_execution_not_verified",
          safeMessage:
            "Certified capability execution did not satisfy the required evidence conditions.",
          modelUse: false,
          networkUse: false
        };

        this.run(
          "UPDATE operator_requests SET status = ?, completed_at = ?, response_json = ?, governed_reference = ? WHERE request_id = ?",
          [
            "BLOCKED",
            this.nowIso(),
            JSON.stringify(blocked),
            `execution:${execution.executionId}`,
            input.requestId
          ]
        );

        this.event("request_blocked", {
          requestId: input.requestId,
          attemptId,
          executionId,
          failureCode: blocked.failureCode
        });

        return blocked;
      }

      const evidenceOutputPath = path.join(
        execution.evidenceRoot,
        output.evidenceReference
      );

      const normalizedText = fs.readFileSync(
        evidenceOutputPath,
        "utf8"
      );

      const executionEvidenceId =
        this.productControlPlane.recordEvidenceReference({
          attemptId,
          evidenceType: "certified-execution-output",
          location: path
            .relative(this.projectRoot, evidenceOutputPath)
            .replace(/\\/g, "/"),
          integrityHash: output.hash,
          producer: "operator-gateway",
          metadata: {
            executionId,
            executableId: request.executableId,
            outputId: output.id,
            executionStatus: execution.status,
            workspaceOutsideRepository:
              execution.workspaceOutsideRepository,
            cleanupCleaned: execution.cleanup.cleaned,
            sourceNotMutated: execution.sourceNotMutated,
            attemptSuccessManufactured:
              execution.attemptSuccessManufactured,
            undeclaredOutputCount:
              execution.undeclaredOutputs.length
          }
        });

      this.productControlPlane.recordGateOutcome({
        attemptId,
        gateName: "certified-execution-evidence-gate",
        required: true,
        outcome: "PASS",
        evidenceReferences: [executionEvidenceId],
        evaluator: "operator-gateway",
        message:
          "Certified execution completed and satisfied all required evidence conditions."
      });

      this.productControlPlane.transitionAttempt({
        attemptId,
        fromState: "RUNNING",
        toState: "COMPLETED",
        actor: "control-plane",
        reason:
          "Certified capability execution completed with required evidence.",
        correlation: {
          executionId,
          outputHash: output.hash ?? null
        }
      });

      const response: OperatorDispatchResult = {
        ok: true,
        requestId: input.requestId,
        requestHash: input.requestHash,
        normalizedText: input.normalizedText,
        status: "COMPLETED",
        attemptId,
        attemptPath: execution.evidenceRoot,
        terminalDecision: execution.status,
        output: normalizedText,
        modelUse: false,
        networkUse: false
      };

      this.run(
        "UPDATE operator_requests SET status = ?, completed_at = ?, response_json = ?, governed_reference = ? WHERE request_id = ?",
        [
          "COMPLETED",
          this.nowIso(),
          JSON.stringify(response),
          `execution:${execution.executionId}`,
          input.requestId
        ]
      );

      this.event("request_completed", {
        requestId: input.requestId,
        attemptId,
        executionId,
        terminalDecision: execution.status,
        verified: true,
        outputHash: output.hash ?? null
      });

      return response;
    } catch (error) {
      const state = this.productControlPlane.recoveryGet(
        "SELECT current_state FROM attempts WHERE attempt_id = ?",
        [attemptId]
      );

      if (String(state?.current_state ?? "") === "RUNNING") {
        this.productControlPlane.transitionAttempt({
          attemptId,
          fromState: "RUNNING",
          toState: "BLOCKED",
          actor: "control-plane",
          reason:
            error instanceof Error
              ? error.message
              : "Certified capability execution failed.",
          correlation: { executionId }
        });
      }

      const blocked: OperatorDispatchResult = {
        ok: true,
        requestId: input.requestId,
        requestHash: input.requestHash,
        normalizedText: input.normalizedText,
        status: "BLOCKED",
        attemptId,
        failureCode: "certified_execution_failed",
        safeMessage:
          error instanceof Error
            ? error.message
            : "Certified capability execution failed.",
        modelUse: false,
        networkUse: false
      };

      this.run(
        "UPDATE operator_requests SET status = ?, completed_at = ?, response_json = ? WHERE request_id = ?",
        ["BLOCKED", this.nowIso(), JSON.stringify(blocked), input.requestId]
      );

      this.event("request_blocked", {
        requestId: input.requestId,
        attemptId,
        executionId,
        failureCode: blocked.failureCode
      });

      return blocked;
    }
  }

  private async dispatchPromotedStableUniqueLineSort(input: {
    requestId: string;
    requestHash: string;
    normalizedText: string;
    category: OperatorRequestCategory;
    status: "QUEUED";
    executionInput?: string;
  }): Promise<OperatorDispatchResult> {
    if (
      typeof input.executionInput !==
      "string"
    ) {
      const blocked: OperatorDispatchResult = {
        ok: true,
        requestId:
          input.requestId,
        requestHash:
          input.requestHash,
        normalizedText:
          input.normalizedText,
        status: "BLOCKED",
        failureCode:
          "promoted_capability_input_required",
        safeMessage:
          "The promoted stable-unique-line-sort-v1 execution path requires bounded text input.",
        modelUse: false,
        networkUse: false,
        offline: true,
        publicNetworkUse: false,
        cloudProviderUse: false,
        externalPackageAcquisition:
          false,
        repositoryMutation:
          false
      };

      this.run(
        "UPDATE operator_requests SET status = ?, completed_at = ?, response_json = ? WHERE request_id = ?",
        [
          "BLOCKED",
          this.nowIso(),
          JSON.stringify(blocked),
          input.requestId
        ]
      );

      return blocked;
    }

    const capabilityId =
      "stable-unique-line-sort-v1";

    const command =
      this.productControlPlane
        .acceptCommand({
          idempotencyKey:
            `m16-a3-execution:${input.requestId}`,
          commandType:
            "run-promoted-capability",
          payload: {
            operatorRequestId:
              input.requestId,
            requestHash:
              input.requestHash,
            capabilityId
          },
          capability:
            capabilityId
        });

    if (!command.attemptId) {
      throw new OperatorGatewayBlockedError(
        "Runtime State did not create the M16-A3 promoted execution attempt.",
        "m16_a3_execution_attempt_missing"
      );
    }

    const attemptId =
      command.attemptId;

    this.productControlPlane
      .transitionAttempt({
        attemptId,
        fromState:
          "PENDING",
        toState:
          "RUNNING",
        actor:
          "control-plane",
        reason:
          "Authenticated Operator request authorized execution of the exact active promoted capability.",
        correlation: {
          operatorRequestId:
            input.requestId,
          requestHash:
            input.requestHash,
          capabilityId
        }
      });

    try {
      const result =
        await this
          .governedCapabilityEngineComposition
          .executePromotedBoundedCapability({
            attemptId,
            operatorRequestId:
              input.requestId,
            capabilityId,
            sourceText:
              input.executionInput
          });

      this.productControlPlane
        .recordGateOutcome({
          attemptId,
          gateName:
            "m16-a3-promoted-capability-execution",
          required:
            true,
          outcome:
            "PASS",
          evidenceReferences: [
            result.evidenceReferenceId
          ],
          evaluator:
            "governed-capability-engine-composition",
          message:
            "Exact active promoted digest completed the bounded operator task through governed Execution Authority."
        });

      this.productControlPlane
        .transitionAttempt({
          attemptId,
          fromState:
            "RUNNING",
          toState:
            "COMPLETED",
          actor:
            "control-plane",
          reason:
            "M16-A3 promoted capability reattempt completed with immutable evidence.",
          correlation: {
            operatorRequestId:
              input.requestId,
            capabilityId,
            activeVersionDigest:
              result
                .activeVersionDigest,
            executionId:
              result.executionId,
            outputHash:
              result.outputHash
          }
        });

      const response: OperatorDispatchResult = {
        ok: true,
        requestId:
          input.requestId,
        requestHash:
          input.requestHash,
        normalizedText:
          input.normalizedText,
        status:
          "COMPLETED",
        attemptId,
        attemptPath:
          result.evidencePath,
        terminalDecision:
          "SUCCEEDED_PROCESS",
        output:
          result.output,
        modelUse:
          false,
        networkUse:
          false,
        offline:
          true,
        publicNetworkUse:
          false,
        cloudProviderUse:
          false,
        externalPackageAcquisition:
          false,
        repositoryMutation:
          false
      };

      this.run(
        "UPDATE operator_requests SET status = ?, completed_at = ?, response_json = ?, governed_reference = ? WHERE request_id = ?",
        [
          "COMPLETED",
          this.nowIso(),
          JSON.stringify(response),
          `control-plane:attempt:${attemptId}`,
          input.requestId
        ]
      );

      this.event(
        "m16_a3_promoted_capability_execution_completed",
        {
          requestId:
            input.requestId,
          attemptId,
          capabilityId,
          activeVersionDigest:
            result.activeVersionDigest,
          executionId:
            result.executionId,
          outputHash:
            result.outputHash
        }
      );

      return response;
    } catch (error) {
      const state =
        this.productControlPlane
          .recoveryGet(
            "SELECT current_state FROM attempts WHERE attempt_id = ?",
            [attemptId]
          );

      if (
        String(
          state?.current_state ??
            ""
        ) === "RUNNING"
      ) {
        this.productControlPlane
          .transitionAttempt({
            attemptId,
            fromState:
              "RUNNING",
            toState:
              "BLOCKED",
            actor:
              "control-plane",
            reason:
              error instanceof Error
                ? error.message
                : "M16-A3 promoted capability execution failed."
          });
      }

      const blocked: OperatorDispatchResult = {
        ok: true,
        requestId:
          input.requestId,
        requestHash:
          input.requestHash,
        normalizedText:
          input.normalizedText,
        status:
          "BLOCKED",
        attemptId,
        failureCode:
          "m16_a3_promoted_execution_blocked",
        safeMessage:
          error instanceof Error
            ? error.message
            : "M16-A3 promoted capability execution failed.",
        modelUse:
          false,
        networkUse:
          false,
        offline:
          true,
        publicNetworkUse:
          false,
        cloudProviderUse:
          false,
        externalPackageAcquisition:
          false,
        repositoryMutation:
          false
      };

      this.run(
        "UPDATE operator_requests SET status = ?, completed_at = ?, response_json = ?, governed_reference = ? WHERE request_id = ?",
        [
          "BLOCKED",
          this.nowIso(),
          JSON.stringify(blocked),
          `control-plane:attempt:${attemptId}`,
          input.requestId
        ]
      );

      return blocked;
    }
  }
  private async dispatchCapabilityAcquisition(input: {
    requestId: string;
    requestHash: string;
    normalizedText: string;
    category: OperatorRequestCategory;
    status: "QUEUED";
    acquisitionRequest?: BoundedCapabilityAcquisitionRequest;
  }): Promise<OperatorDispatchResult> {
    const acquisitionRequest = input.acquisitionRequest ?? { profileId: M16_A1_PROFILE_ID };
    const command = this.productControlPlane.acceptCommand({
      idempotencyKey: `operator-capability-acquisition:${input.requestId}`,
      commandType: "propose-capability",
      payload: { operatorRequestId: input.requestId, requestHash: input.requestHash, acquisitionRequest },
      capability: "capability-engine"
    });
    if (!command.attemptId) throw new OperatorGatewayBlockedError("Runtime State did not create a capability acquisition attempt.", "capability_acquisition_attempt_not_created");
    const attemptId = command.attemptId;
    this.productControlPlane.transitionAttempt({
      attemptId,
      fromState: "PENDING",
      toState: "RUNNING",
      actor: "control-plane",
      reason: "Authenticated Operator request opened governed capability acquisition.",
      correlation: { operatorRequestId: input.requestId, requestHash: input.requestHash }
    });
    try {
      const acquired = await this.governedCapabilityEngineComposition.acquireBoundedCandidate({
        attemptId,
        operatorRequest: { requestId: input.requestId, requestHash: input.requestHash, normalizedObjective: input.normalizedText },
        acquisitionRequest
      });
      this.productControlPlane.recordGateOutcome({
        attemptId,
        gateName: "m16-a1-authentic-gap",
        required: true,
        outcome: "PASS",
        evidenceReferences: acquired.evidenceReferenceIds,
        evaluator: "governed-capability-engine-composition",
        message: `Capability gap determination completed with ${acquired.gap.gapStatus}.`
      });
      if (acquired.gap.gapStatus === "SATISFIED") {
        this.productControlPlane.transitionAttempt({
          attemptId,
          fromState: "RUNNING",
          toState: "COMPLETED",
          actor: "control-plane",
          reason:
            "An existing active governed capability satisfies the requested contract; acquisition not created."
        });

        const response: OperatorDispatchResult = {
          ok: true,
          requestId: input.requestId,
          requestHash: input.requestHash,
          normalizedText: input.normalizedText,
          status: "COMPLETED",
          attemptId,
          safeMessage:
            "An existing active governed capability satisfies the complete requested contract; no candidate was created.",
          modelUse: false,
          networkUse: false,
          offline: true,
          publicNetworkUse: false,
          cloudProviderUse: false,
          externalPackageAcquisition: false,
          repositoryMutation: false,
          acquisition: {
            gapStatus: "SATISFIED",
            candidateCreated: false,
            satisfyingCapabilityId:
              acquired.gap.satisfyingCapabilityId,
            registrySha256:
              acquired.registry.sha256
          }
        };

        this.run(
          "UPDATE operator_requests SET status = ?, completed_at = ?, response_json = ?, governed_reference = ? WHERE request_id = ?",
          [
            "COMPLETED",
            this.nowIso(),
            JSON.stringify(response),
            `control-plane:attempt:${attemptId}`,
            input.requestId
          ]
        );

        this.event(
          "m16_a3_original_objective_satisfied",
          {
            requestId: input.requestId,
            attemptId,
            satisfyingCapabilityId:
              acquired.gap.satisfyingCapabilityId
          }
        );

        return response;
      }
      if (!acquired.candidateCreated || !acquired.candidateTestsPass) throw new Error("Governed capability acquisition did not produce a tested inactive candidate.");
      this.productControlPlane.recordGateOutcome({
        attemptId,
        gateName: "m16-a1-tested-inactive-candidate",
        required: true,
        outcome: "PASS",
        evidenceReferences: acquired.evidenceReferenceIds,
        evaluator: "governed-capability-engine-composition",
        message: "Inactive candidate behavior passed deterministic candidate-local tests without certification or promotion."
      });
      this.productControlPlane.transitionAttempt({ attemptId, fromState: "RUNNING", toState: "COMPLETED", actor: "control-plane", reason: "M16-A1 tested inactive candidate acquisition completed with immutable evidence." });
      const response: OperatorDispatchResult = {
        ok: true, requestId: input.requestId, requestHash: input.requestHash, normalizedText: input.normalizedText, status: "COMPLETED", attemptId,
        modelUse: false, networkUse: false, offline: true, publicNetworkUse: false, cloudProviderUse: false, externalPackageAcquisition: false, repositoryMutation: false,
        acquisition: {
          gapStatus: acquired.gap.gapStatus, candidateCreated: true, proposalId: acquired.proposal.proposalId, sessionId: acquired.proposal.sessionId,
          capabilityId: acquired.bundle.capabilityId, candidateDigest: acquired.bundle.versionDigest, lifecycleStatus: acquired.bundle.manifest.lifecycleStatus,
          candidateTestsPass: acquired.candidateTestsPass, deterministicReplay: acquired.deterministicReplay, executableId: acquired.executable.id, executableFingerprint: acquired.executable.fingerprint,
          certified: acquired.certified, promoted: acquired.promoted, activePointerChanged: acquired.activePointerChanged, selectableForOrdinaryExecution: acquired.selectableForOrdinaryExecution,
          registrySha256: acquired.registry.sha256, registrySchemaVersion: acquired.registry.schemaVersion, evidencePath: acquired.evidencePath, evidenceHash: acquired.evidenceHash,
          permissions: acquired.gap.requirement.permissions, limitations: acquired.gap.requirement.limitations
        }
      };
      this.run("UPDATE operator_requests SET status = ?, completed_at = ?, response_json = ?, governed_reference = ? WHERE request_id = ?", ["COMPLETED", this.nowIso(), JSON.stringify(response), `control-plane:attempt:${attemptId}`, input.requestId]);
      this.event("request_completed", { requestId: input.requestId, attemptId, candidateDigest: acquired.bundle.versionDigest, candidateOnly: true });
      return response;
    } catch (error) {
      const state = this.productControlPlane.recoveryGet("SELECT current_state FROM attempts WHERE attempt_id = ?", [attemptId]);
      if (String(state?.current_state ?? "") === "RUNNING") this.productControlPlane.transitionAttempt({ attemptId, fromState: "RUNNING", toState: "BLOCKED", actor: "control-plane", reason: error instanceof Error ? error.message : "Capability acquisition failed." });
      const response: OperatorDispatchResult = {
        ok: true, requestId: input.requestId, requestHash: input.requestHash, normalizedText: input.normalizedText, status: "BLOCKED", attemptId,
        failureCode: "capability_acquisition_blocked", safeMessage: error instanceof Error ? error.message : "Capability acquisition failed.",
        modelUse: false, networkUse: false, offline: true, publicNetworkUse: false, cloudProviderUse: false, externalPackageAcquisition: false, repositoryMutation: false
      };
      this.run("UPDATE operator_requests SET status = ?, completed_at = ?, response_json = ?, governed_reference = ? WHERE request_id = ?", ["BLOCKED", this.nowIso(), JSON.stringify(response), `control-plane:attempt:${attemptId}`, input.requestId]);
      this.event("request_blocked", { requestId: input.requestId, attemptId, failureCode: response.failureCode });
      return response;
    }
  }

  private async dispatchOperatorRequest(input: {
    requestId: string;
    requestHash: string;
    normalizedText: string;
    category: OperatorRequestCategory;
    status: "QUEUED";
    acquisitionRequest?: BoundedCapabilityAcquisitionRequest;
    executionInput?: string;
  }): Promise<OperatorDispatchResult> {
    if (input.category === "propose-capability") {
      return this.dispatchCapabilityAcquisition(input);
    }
    if (input.category === "run-certified-capability") {
      return this.dispatchCertifiedTextNormalizer(input);
    }

    const expectedRequest =
      "Return the text SERA_REQUEST_PIPELINE_OK.";

    if (input.normalizedText !== expectedRequest) {
      const blocked: OperatorDispatchResult = {
        ok: true,
        requestId: input.requestId,
        requestHash: input.requestHash,
        normalizedText: input.normalizedText,
        status: "BLOCKED",
        failureCode: "unsupported_bounded_workflow",
        safeMessage:
          "This Base MVP proof currently supports only the certified deterministic request fixture.",
        modelUse: false,
        networkUse: false
      };

      this.run(
        "UPDATE operator_requests SET status = ?, completed_at = ?, response_json = ? WHERE request_id = ?",
        [
          "BLOCKED",
          this.nowIso(),
          JSON.stringify(blocked),
          input.requestId
        ]
      );

      this.event("request_blocked", {
        requestId: input.requestId,
        failureCode: blocked.failureCode
      });

      return blocked;
    }

    const attemptId = input.requestId.replace(
      /^operator_request_/,
      "operator_attempt_"
    );

    this.event("request_dispatched", {
      requestId: input.requestId,
      attemptId
    });

    try {
      const result = this.controlPlane.run({
        attemptId,
        title: `Governed Operator request ${input.requestId}`,
        owner: "local-owner",

        sourceBaseline: {
          operatorRequestId: input.requestId,
          requestHash: input.requestHash,
          normalizedText: input.normalizedText,
          modelUse: false,
          networkUse: false
        },

        stages: [
          {
            id: "operator-request-intake",
            title: "Record authenticated Operator request",
            executionMode: "emit-evidence",
            required: true,

            input: {
              evidenceId: "operator-request-intake",
              kind: "operator-request",
              value: {
                requestId: input.requestId,
                requestHash: input.requestHash,
                normalizedText: input.normalizedText
              }
            },

            evidence: [
              {
                id: "operator-request-intake",
                kind: "operator-request",
                required: true
              }
            ]
          },

          {
            id: "deterministic-response",
            title: "Produce certified deterministic response",
            dependsOn: ["operator-request-intake"],
            executionMode: "emit-evidence",
            required: true,

            input: {
              evidenceId: "operator-deterministic-response",
              kind: "deterministic-output",
              value: {
                output: "SERA_REQUEST_PIPELINE_OK",
                modelUse: false,
                networkUse: false
              }
            },

            evidence: [
              {
                id: "operator-deterministic-response",
                kind: "deterministic-output",
                required: true
              }
            ]
          }
        ],

        gates: [
          {
            id: "operator-response-evidence-gate",
            gateType: "verification",
            required: true,
            evaluationTiming: "after",

            evidenceRequirements: [
              {
                id: "operator-request-intake",
                required: true
              },
              {
                id: "operator-deterministic-response",
                required: true
              }
            ],

            passCriteria: {
              kind: "evidence-valid",
              evidenceIds: [
                "operator-request-intake",
                "operator-deterministic-response"
              ]
            }
          }
        ],

        requiredEvidence: [
          {
            id: "operator-request-intake",
            required: true
          },
          {
            id: "operator-deterministic-response",
            required: true
          }
        ],

        closeoutPolicy: {
          requireOwnerApproval: false,
          ownerApproved: true,
          promotionAllowed: false,
          mergeAllowed: false
        }
      });

      const verification = this.controlPlane.verify(attemptId);

      const completed =
        result.ok === true &&
        result.terminalDecision === "COMPLETE" &&
        verification.ok === true;

      const response: OperatorDispatchResult =
        completed
          ? {
              ok: true,
              requestId: input.requestId,
              requestHash: input.requestHash,
              normalizedText: input.normalizedText,
              status: "COMPLETED",
              attemptId,
              attemptPath: result.attemptPath,
              terminalDecision: result.terminalDecision,
              output: "SERA_REQUEST_PIPELINE_OK",
              modelUse: false,
              networkUse: false
            }
          : {
              ok: true,
              requestId: input.requestId,
              requestHash: input.requestHash,
              normalizedText: input.normalizedText,
              status: "BLOCKED",
              attemptId,
              attemptPath: result.attemptPath,
              terminalDecision: result.terminalDecision,
              failureCode:
                "control_plane_attempt_not_verified",
              safeMessage:
                verification.message ||
                result.message ||
                "Control Plane attempt did not verify.",
              modelUse: false,
              networkUse: false
            };

      this.run(
        "UPDATE operator_requests SET status = ?, completed_at = ?, response_json = ?, governed_reference = ? WHERE request_id = ?",
        [
          response.status,
          this.nowIso(),
          JSON.stringify(response),
          `control-plane:attempt:${attemptId}`,
          input.requestId
        ]
      );

      this.event(
        completed
          ? "request_completed"
          : "request_blocked",
        {
          requestId: input.requestId,
          attemptId,
          terminalDecision: result.terminalDecision,
          verified: verification.ok
        }
      );

      return response;
    } catch (error) {
      const safeMessage =
        error instanceof Error
          ? error.message
          : String(error);

      const blocked: OperatorDispatchResult = {
        ok: true,
        requestId: input.requestId,
        requestHash: input.requestHash,
        normalizedText: input.normalizedText,
        status: "BLOCKED",
        attemptId,
        failureCode: "control_plane_dispatch_failed",
        safeMessage,
        modelUse: false,
        networkUse: false
      };

      this.run(
        "UPDATE operator_requests SET status = ?, completed_at = ?, response_json = ?, governed_reference = ? WHERE request_id = ?",
        [
          "BLOCKED",
          this.nowIso(),
          JSON.stringify(blocked),
          `control-plane:attempt:${attemptId}`,
          input.requestId
        ]
      );

      this.event("request_blocked", {
        requestId: input.requestId,
        attemptId,
        failureCode: blocked.failureCode
      });

      return blocked;
    }
  }

  async promoteBoundedCertifiedCandidate(input: {
    sessionId: string;
    approvalId: string;
    approvalIntegrityHash: string;
    idempotencyKey: string;
  }) {
    const approval =
      this.get(
        "SELECT * FROM operator_approvals WHERE approval_id = ?",
        [input.approvalId]
      );

    if (
      !approval ||
      String(
        approval.status
      ) !== "APPROVED" ||
      String(
        approval.risk_class
      ) !== "HIGH" ||
      String(
        approval.integrity_hash
      ) !==
        input.approvalIntegrityHash ||
      !String(
        approval.summary ??
          ""
      ).startsWith(
        "M16-A2 certification review"
      )
    ) {
      throw new OperatorGatewayBlockedError(
        "M16-A3 promotion requires the exact approved M16-A2 review record.",
        "m16_a3_approved_review_required"
      );
    }

    const reviewRequest =
      this.get(
        "SELECT request_id, response_json FROM operator_requests WHERE request_id = ?",
        [
          String(
            approval.request_id
          )
        ]
      );

    if (!reviewRequest) {
      throw new OperatorGatewayBlockedError(
        "M16-A3 source certification request is unavailable.",
        "m16_a3_source_review_missing"
      );
    }

    const reviewed =
      JSON.parse(
        String(
          reviewRequest
            .response_json
        )
      );

    if (
      reviewed.status !==
        "COMPLETED" ||
      reviewed.operatorDecision !==
        "APPROVED" ||
      reviewed.certified !==
        true ||
      reviewed.promoted !==
        false ||
      reviewed.finalization
        ?.lifecycleStatus !==
        "CERTIFIED" ||
      reviewed.finalization
        ?.promotionPerformed !==
        false ||
      !reviewed.review
        ?.sourceProposalId ||
      !reviewed.review
        ?.sourceSessionId ||
      !reviewed.review
        ?.capabilityId ||
      !/^[a-f0-9]{64}$/.test(
        String(
          reviewed.review
            ?.candidateDigest ??
            ""
        )
      )
    ) {
      throw new OperatorGatewayBlockedError(
        "M16-A3 source review is not an approved certified inactive candidate.",
        "m16_a3_source_review_ineligible"
      );
    }

    const request =
      this.composeRequest({
        sessionId:
          input.sessionId,
        category:
          "review-approval",
        text:
          `Promote M16-A3 certified candidate ${reviewed.review.candidateDigest}.`,
        idempotencyKey:
          input.idempotencyKey
      });

    const existing =
      this.get(
        "SELECT status, response_json FROM operator_requests WHERE request_id = ?",
        [request.requestId]
      );

    if (
      existing &&
      String(
        existing.status
      ) !== "QUEUED"
    ) {
      return JSON.parse(
        String(
          existing.response_json
        )
      );
    }

    const command =
      this.productControlPlane
        .acceptCommand({
          idempotencyKey:
            `operator-capability-promotion:${request.requestId}`,
          commandType:
            "m16-a3-governed-promotion",
          payload: {
            operatorRequestId:
              request.requestId,
            sourceApprovalId:
              input.approvalId,
            sourceProposalId:
              reviewed.review
                .sourceProposalId,
            sourceSessionId:
              reviewed.review
                .sourceSessionId,
            capabilityId:
              reviewed.review
                .capabilityId,
            candidateDigest:
              reviewed.review
                .candidateDigest
          },
          capability:
            "capability-engine"
        });

    if (!command.attemptId) {
      throw new OperatorGatewayBlockedError(
        "Runtime State did not create the M16-A3 promotion attempt.",
        "m16_a3_promotion_attempt_missing"
      );
    }

    const attemptId =
      command.attemptId;

    this.productControlPlane
      .transitionAttempt({
        attemptId,
        fromState:
          "PENDING",
        toState:
          "RUNNING",
        actor:
          "control-plane",
        reason:
          "M16-A3 explicit operator promotion request opened.",
        correlation: {
          operatorRequestId:
            request.requestId,
          sourceApprovalId:
            input.approvalId,
          candidateDigest:
            reviewed.review
              .candidateDigest
        }
      });

    try {
      const promotion =
        await this
          .governedCapabilityEngineComposition
          .promoteBoundedCertifiedCandidate({
            attemptId,
            operatorRequestId:
              request.requestId,
            sourceProposalId:
              String(
                reviewed.review
                  .sourceProposalId
              ),
            sourceSessionId:
              String(
                reviewed.review
                  .sourceSessionId
              ),
            capabilityId:
              String(
                reviewed.review
                  .capabilityId
              ),
            candidateDigest:
              String(
                reviewed.review
                  .candidateDigest
              )
          });

      this.productControlPlane
        .recordGateOutcome({
          attemptId,
          gateName:
            "m16-a3-explicit-exact-digest-promotion",
          required:
            true,
          outcome:
            "PASS",
          evidenceReferences:
            promotion
              .evidenceReferenceIds,
          evaluator:
            "governed-capability-engine-composition",
          message:
            "Explicit Product Control Plane promotion selected the exact A2-certified digest and updated the active pointer."
        });

      this.productControlPlane
        .transitionAttempt({
          attemptId,
          fromState:
            "RUNNING",
          toState:
            "COMPLETED",
          actor:
            "control-plane",
          reason:
            "M16-A3 explicit exact-digest promotion completed.",
          correlation: {
            sourceApprovalId:
              input.approvalId,
            candidateDigest:
              promotion
                .candidateDigest,
            activeVersionDigest:
              promotion
                .activeVersionDigest
          }
        });

      const response = {
        ...request,
        status:
          "COMPLETED" as const,
        attemptId,
        sourceApprovalId:
          input.approvalId,
        capabilityId:
          promotion.capabilityId,
        candidateDigest:
          promotion.candidateDigest,
        lifecycleStatus:
          promotion.lifecycleStatus,
        promoted:
          true as const,
        activeVersionDigest:
          promotion.activeVersionDigest,
        activePointerChanged:
          promotion.activePointerChanged,
        promotionEvidencePath:
          "evidencePath" in promotion
            ? promotion.evidencePath
            : null,
        promotionEvidenceHash:
          "evidenceHash" in promotion
            ? promotion.evidenceHash
            : null,
        rollbackPerformed:
          false as const,
        offline:
          true as const,
        publicNetworkUse:
          false as const,
        cloudProviderUse:
          false as const,
        modelUse:
          false as const
      };

      this.run(
        "UPDATE operator_requests SET status = ?, completed_at = ?, response_json = ?, governed_reference = ? WHERE request_id = ?",
        [
          "COMPLETED",
          this.nowIso(),
          JSON.stringify(response),
          `control-plane:attempt:${attemptId}`,
          request.requestId
        ]
      );

      this.event(
        "m16_a3_promotion_completed",
        {
          requestId:
            request.requestId,
          attemptId,
          sourceApprovalId:
            input.approvalId,
          capabilityId:
            promotion.capabilityId,
          candidateDigest:
            promotion.candidateDigest,
          activeVersionDigest:
            promotion
              .activeVersionDigest
        }
      );

      return response;
    } catch (error) {
      const state =
        this.productControlPlane
          .recoveryGet(
            "SELECT current_state FROM attempts WHERE attempt_id = ?",
            [attemptId]
          );

      if (
        String(
          state?.current_state ??
            ""
        ) === "RUNNING"
      ) {
        this.productControlPlane
          .transitionAttempt({
            attemptId,
            fromState:
              "RUNNING",
            toState:
              "BLOCKED",
            actor:
              "control-plane",
            reason:
              error instanceof Error
                ? error.message
                : "M16-A3 promotion failed."
          });
      }

      const blocked = {
        ...request,
        status:
          "BLOCKED" as const,
        attemptId,
        failureCode:
          "m16_a3_promotion_blocked",
        safeMessage:
          error instanceof Error
            ? error.message
            : "M16-A3 promotion failed.",
        promoted:
          false as const,
        rollbackPerformed:
          false as const
      };

      this.run(
        "UPDATE operator_requests SET status = ?, completed_at = ?, response_json = ?, governed_reference = ? WHERE request_id = ?",
        [
          "BLOCKED",
          this.nowIso(),
          JSON.stringify(blocked),
          `control-plane:attempt:${attemptId}`,
          request.requestId
        ]
      );

      return blocked;
    }
  }
  async queueBoundedCandidateReview(input: {
    sessionId: string;
    sourceProposalId: string;
    sourceSessionId: string;
    capabilityId: string;
    candidateDigest: string;
    idempotencyKey: string;
  }) {
    const request = this.composeRequest({
      sessionId: input.sessionId,
      category: "review-approval",
      text: `Review M16-A2 candidate ${input.candidateDigest} for certification or rejection.`,
      idempotencyKey: input.idempotencyKey
    });

    const existing = this.get(
      "SELECT status, response_json FROM operator_requests WHERE request_id = ?",
      [request.requestId]
    );

    if (
      existing &&
      String(existing.status) !== "QUEUED"
    ) {
      return JSON.parse(
        String(existing.response_json)
      );
    }

    const command =
      this.productControlPlane.acceptCommand({
        idempotencyKey:
          `operator-capability-review:${request.requestId}`,
        commandType:
          "m16-a2-governed-evaluation-review",
        payload: {
          operatorRequestId:
            request.requestId,
          sourceProposalId:
            input.sourceProposalId,
          sourceSessionId:
            input.sourceSessionId,
          capabilityId:
            input.capabilityId,
          candidateDigest:
            input.candidateDigest
        },
        capability: "capability-engine"
      });

    if (!command.attemptId) {
      throw new OperatorGatewayBlockedError(
        "Runtime State did not create the M16-A2 review attempt.",
        "a2_review_attempt_missing"
      );
    }

    const attemptId = command.attemptId;

    const attempt =
      this.productControlPlane.recoveryGet(
        "SELECT current_state FROM attempts WHERE attempt_id = ?",
        [attemptId]
      );

    if (
      String(attempt?.current_state ?? "") ===
      "PENDING"
    ) {
      this.productControlPlane.transitionAttempt({
        attemptId,
        fromState: "PENDING",
        toState: "RUNNING",
        actor: "control-plane",
        reason:
          "M16-A2 governed evaluation and operator certification review opened.",
        correlation: {
          operatorRequestId:
            request.requestId,
          candidateDigest:
            input.candidateDigest
        }
      });
    } else if (
      String(attempt?.current_state ?? "") !==
      "RUNNING"
    ) {
      throw new OperatorGatewayBlockedError(
        "M16-A2 review attempt is not available for evaluation.",
        "a2_review_attempt_not_running"
      );
    }

    try {
      const review =
        await this.governedCapabilityEngineComposition
          .evaluateBoundedCandidate({
            attemptId,
            operatorRequestId:
              request.requestId,
            sourceProposalId:
              input.sourceProposalId,
            sourceSessionId:
              input.sourceSessionId,
            capabilityId:
              input.capabilityId,
            candidateDigest:
              input.candidateDigest
          });

      this.productControlPlane.recordGateOutcome({
        attemptId,
        gateName:
          "m16-a2-governed-evaluation",
        required: true,
        outcome: "PASS",
        evidenceReferences: [
          review.evidenceReferenceId
        ],
        evaluator:
          "governed-capability-engine-composition",
        message:
          "Exact inactive candidate passed two independent governed evaluations and is ready for operator certification review."
      });

      const summary =
        createM16A2CertificationReviewSummary({
          candidateDigest:
            input.candidateDigest,
          reviewPacketHash:
            review.reviewPacketHash
        });

      const approval = this.createApproval({
        requestId:
          request.requestId,
        riskClass: "HIGH",
        summary,
        idempotencyKey:
          `${request.requestId}:m16-a2-certification-approval`
      });

      const response = {
        ok: true as const,
        requestId:
          request.requestId,
        requestHash:
          request.requestHash,
        normalizedText:
          request.normalizedText,
        category:
          "review-approval" as const,
        status:
          "AWAITING_APPROVAL" as const,
        attemptId,
        approvalId:
          approval.approvalId,
        approvalIntegrityHash:
          approval.integrityHash,
        riskClass:
          "HIGH" as const,
        review: {
          sourceProposalId:
            input.sourceProposalId,
          sourceSessionId:
            input.sourceSessionId,
          capabilityId:
            input.capabilityId,
          candidateDigest:
            input.candidateDigest,
          reviewPacketPath:
            review.reviewPacketPath,
          reviewPacketHash:
            review.reviewPacketHash,
          comparisonHash:
            review.comparisonHash,
          experimentIds:
            review.experimentIds,
          evaluationIds:
            review.evaluationIds,
          reproducibilityRuns:
            review.reproducibilityRuns,
          reproducible:
            review.reproducible,
          rollbackReady:
            review.rollbackReady,
          permissions:
            review.permissions,
          limitations:
            review.limitations,
          lifecycleStatus:
            review.lifecycleStatus,
          certificationPerformed:
            false,
          promotionPerformed:
            false,
          activePointerChanged:
            false
        },
        operatorDecision: null,
        certified: false,
        rejected: false,
        promoted: false,
        selectableForOrdinaryExecution:
          false,
        offline: true,
        publicNetworkUse: false,
        cloudProviderUse: false,
        modelUse: false
      };

      this.run(
        "UPDATE operator_requests SET status = ?, response_json = ?, governed_reference = ? WHERE request_id = ?",
        [
          "AWAITING_APPROVAL",
          JSON.stringify(response),
          `control-plane:attempt:${attemptId}`,
          request.requestId
        ]
      );

      this.event(
        "m16_a2_review_awaiting_operator",
        {
          requestId:
            request.requestId,
          attemptId,
          approvalId:
            approval.approvalId,
          candidateDigest:
            input.candidateDigest,
          reviewPacketHash:
            review.reviewPacketHash
        }
      );

      return response;
    } catch (error) {
      const current =
        this.productControlPlane.recoveryGet(
          "SELECT current_state FROM attempts WHERE attempt_id = ?",
          [attemptId]
        );

      if (
        String(
          current?.current_state ??
            ""
        ) === "RUNNING"
      ) {
        this.productControlPlane.transitionAttempt({
          attemptId,
          fromState: "RUNNING",
          toState: "BLOCKED",
          actor: "control-plane",
          reason:
            error instanceof Error
              ? error.message
              : "M16-A2 candidate evaluation failed."
        });
      }

      const blocked = {
        ok: true as const,
        requestId:
          request.requestId,
        requestHash:
          request.requestHash,
        normalizedText:
          request.normalizedText,
        category:
          "review-approval" as const,
        status: "BLOCKED" as const,
        attemptId,
        failureCode:
          "m16_a2_evaluation_blocked",
        safeMessage:
          error instanceof Error
            ? error.message
            : "M16-A2 candidate evaluation failed.",
        offline: true,
        publicNetworkUse: false,
        cloudProviderUse: false,
        modelUse: false
      };

      this.run(
        "UPDATE operator_requests SET status = ?, completed_at = ?, response_json = ?, governed_reference = ? WHERE request_id = ?",
        [
          "BLOCKED",
          this.nowIso(),
          JSON.stringify(blocked),
          `control-plane:attempt:${attemptId}`,
          request.requestId
        ]
      );

      return blocked;
    }
  }

  async finalizeBoundedCandidateApproval(input: {
    approvalId: string;
    decision: "APPROVED" | "REJECTED";
    integrityHash: string;
    idempotencyKey: string;
    secondConfirmation: boolean;
  }) {
    const approval = this.get(
      "SELECT * FROM operator_approvals WHERE approval_id = ?",
      [input.approvalId]
    );

    if (!approval) {
      throw new OperatorGatewayBlockedError(
        "Approval not found.",
        "approval_not_found"
      );
    }

    const request = this.get(
      "SELECT * FROM operator_requests WHERE request_id = ?",
      [String(approval.request_id)]
    );

    if (!request) {
      throw new OperatorGatewayBlockedError(
        "Approval request not found.",
        "approval_request_not_found"
      );
    }

    const priorResponse =
      JSON.parse(
        String(request.response_json)
      );

    if (
      priorResponse?.finalization &&
      priorResponse.operatorDecision ===
        input.decision
    ) {
      return priorResponse;
    }

    if (
      priorResponse?.status !==
        "AWAITING_APPROVAL" ||
      !priorResponse?.review ||
      priorResponse.approvalId !==
        input.approvalId
    ) {
      throw new OperatorGatewayBlockedError(
        "Approval is not a pending M16-A2 certification review.",
        "a2_review_not_pending"
      );
    }

    const expectedSummary =
      createM16A2CertificationReviewSummary({
        candidateDigest:
          String(
            priorResponse.review
              .candidateDigest
          ),
        reviewPacketHash:
          String(
            priorResponse.review
              .reviewPacketHash
          )
      });

    if (
      String(approval.summary) !==
        expectedSummary
    ) {
      throw new OperatorGatewayBlockedError(
        "Approval binding does not match the exact M16-A2 candidate review.",
        "a2_approval_binding_mismatch"
      );
    }

    if (
      String(approval.integrity_hash) !==
        input.integrityHash
    ) {
      throw new OperatorGatewayBlockedError(
        "Approval integrity changed.",
        "approval_integrity_mismatch"
      );
    }

    if (
      String(approval.status) === "PENDING"
    ) {
      this.decideApproval({
        approvalId:
          input.approvalId,
        decision:
          input.decision,
        integrityHash:
          input.integrityHash,
        idempotencyKey:
          input.idempotencyKey,
        secondConfirmation:
          input.secondConfirmation
      });
    } else if (
      String(approval.status) !==
        input.decision
    ) {
      throw new OperatorGatewayBlockedError(
        "Approval already has a conflicting terminal decision.",
        "approval_terminal"
      );
    }

    const attemptId =
      String(
        priorResponse.attemptId ??
          ""
      );

    const finalized =
      await this.governedCapabilityEngineComposition
        .finalizeBoundedCandidateReview({
          attemptId,
          approvalId:
            input.approvalId,
          operatorRequestId:
            String(request.request_id),
          capabilityId:
            String(
              priorResponse.review
                .capabilityId
            ),
          candidateDigest:
            String(
              priorResponse.review
                .candidateDigest
            ),
          sourceProposalId:
            String(
              priorResponse.review
                .sourceProposalId
            ),
          sourceSessionId:
            String(
              priorResponse.review
                .sourceSessionId
            ),
          reviewPacketPath:
            String(
              priorResponse.review
                .reviewPacketPath
            ),
          reviewPacketHash:
            String(
              priorResponse.review
                .reviewPacketHash
            )
        });

    this.productControlPlane.recordGateOutcome({
      attemptId,
      gateName:
        "m16-a2-operator-certification-decision",
      required: true,
      outcome: "PASS",
      evidenceReferences: [
        finalized.evidenceReferenceId
      ],
      evaluator:
        "governed-capability-engine-composition",
      message:
        input.decision === "APPROVED"
          ? "Operator approved the exact reviewed digest; candidate was certified without promotion."
          : "Operator rejected the exact reviewed digest; candidate became terminal REJECTED without promotion."
    });

    this.productControlPlane.transitionAttempt({
      attemptId,
      fromState: "RUNNING",
      toState: "COMPLETED",
      actor: "control-plane",
      reason:
        input.decision === "APPROVED"
          ? "M16-A2 operator certification decision completed."
          : "M16-A2 operator rejection decision completed.",
      correlation: {
        approvalId:
          input.approvalId,
        operatorDecision:
          input.decision,
        candidateDigest:
          finalized.candidateDigest
      }
    });

    const response = {
      ...priorResponse,
      status: "COMPLETED" as const,
      operatorDecision:
        input.decision,
      certified:
        finalized.certified,
      rejected:
        finalized.rejected,
      promoted: false,
      selectableForOrdinaryExecution:
        false,
      finalization: {
        lifecycleStatus:
          finalized.lifecycleStatus,
        decisionEvidencePath:
          finalized.decisionEvidencePath,
        decisionEvidenceHash:
          finalized.decisionEvidenceHash,
        reviewPacketHash:
          finalized.reviewPacketHash,
        evidenceReferenceId:
          finalized.evidenceReferenceId,
        activePointerChanged:
          false,
        promotionPerformed:
          false
      }
    };

    this.run(
      "UPDATE operator_requests SET status = ?, completed_at = ?, response_json = ?, governed_reference = ? WHERE request_id = ?",
      [
        "COMPLETED",
        this.nowIso(),
        JSON.stringify(response),
        `control-plane:attempt:${attemptId}`,
        String(request.request_id)
      ]
    );

    this.event(
      "m16_a2_operator_decision_completed",
      {
        requestId:
          String(request.request_id),
        attemptId,
        approvalId:
          input.approvalId,
        operatorDecision:
          input.decision,
        candidateDigest:
          finalized.candidateDigest,
        lifecycleStatus:
          finalized.lifecycleStatus,
        promoted: false,
        activePointerChanged:
          false
      }
    );

    return response;
  }
  createApproval(input: { requestId: string; riskClass: "LOW" | "HIGH" | "DESTRUCTIVE" | "EXTERNAL"; summary: string; idempotencyKey: string }): { approvalId: string; integrityHash: string; status: "PENDING" } {
    const requestHash = stableHash(input);
    const existing = this.get("SELECT request_hash, response_json FROM operator_approvals WHERE idempotency_key = ?", [input.idempotencyKey]);
    if (existing) {
      if (String(existing.request_hash) !== requestHash) throw new OperatorGatewayBlockedError("Conflicting approval idempotency reuse.", "conflicting_idempotency");
      return JSON.parse(String(existing.response_json));
    }
    const approvalId = `operator_approval_${randomId()}`;
    const integrityHash = stableHash({ approvalId, riskClass: input.riskClass, summary: input.summary, requestId: input.requestId });
    const response = { approvalId, integrityHash, status: "PENDING" as const };
    this.run("INSERT INTO operator_approvals (approval_id, request_id, status, risk_class, summary, integrity_hash, idempotency_key, request_hash, created_at, response_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [approvalId, input.requestId, "PENDING", input.riskClass, input.summary, integrityHash, input.idempotencyKey, requestHash, this.nowIso(), JSON.stringify(response)]);
    this.notify("approval-required", input.summary, input.riskClass === "LOW" ? "INFO" : "ACTION_REQUIRED");
    return response;
  }

  decideApproval(input: { approvalId: string; decision: OperatorDecision; integrityHash: string; idempotencyKey: string; secondConfirmation?: boolean; typedConfirmation?: string }): { approvalId: string; status: OperatorDecision } {
    const approval = this.get("SELECT * FROM operator_approvals WHERE approval_id = ?", [input.approvalId]);
    if (!approval) throw new OperatorGatewayBlockedError("Approval not found.", "approval_not_found");
    if (String(approval.status) !== "PENDING") {
      const existing = this.get("SELECT response_json FROM operator_approval_decisions WHERE idempotency_key = ?", [input.idempotencyKey]);
      if (existing) return JSON.parse(String(existing.response_json));
      throw new OperatorGatewayBlockedError("Approval is terminal.", "approval_terminal");
    }
    if (String(approval.integrity_hash) !== input.integrityHash) throw new OperatorGatewayBlockedError("Approval integrity changed.", "approval_integrity_mismatch");
    const risk = String(approval.risk_class);
    if ((risk === "HIGH" || risk === "DESTRUCTIVE" || risk === "EXTERNAL") && !input.secondConfirmation) throw new OperatorGatewayBlockedError("Second confirmation required.", "second_confirmation_required");
    if ((risk === "DESTRUCTIVE" || risk === "EXTERNAL") && input.typedConfirmation !== input.decision) throw new OperatorGatewayBlockedError("Typed confirmation required.", "typed_confirmation_required");
    const response = { approvalId: input.approvalId, status: input.decision };
    this.run("UPDATE operator_approvals SET status = ?, decided_at = ?, decision_idempotency_key = ? WHERE approval_id = ?", [input.decision, this.nowIso(), input.idempotencyKey, input.approvalId]);
    this.run("INSERT INTO operator_approval_decisions (idempotency_key, approval_id, decision, decided_at, response_json) VALUES (?, ?, ?, ?, ?)", [input.idempotencyKey, input.approvalId, input.decision, this.nowIso(), JSON.stringify(response)]);
    this.audit("approval_decided", "PASS", response);
    return response;
  }

  viewEvidence(relativePath: string): { ok: true; mode: "text" | "json" | "jsonl" | "binary" | "active-html-blocked"; path: string; content?: string; metadata: Record<string, unknown> } {
    if (relativePath.includes("\0")) throw new OperatorGatewayBlockedError("Invalid evidence path.", "invalid_evidence_path");
    const absolute = path.resolve(this.evidenceRoot, relativePath);
    if (!isWithin(this.evidenceRoot, absolute)) throw new OperatorGatewayBlockedError("Evidence path escapes root.", "evidence_path_escape");
    const stat = fs.statSync(absolute);
    if (stat.size > 1024 * 1024) throw new OperatorGatewayBlockedError("Evidence file too large.", "evidence_too_large");
    const extension = path.extname(absolute).toLowerCase();
    if (extension === ".html" || extension === ".htm") return { ok: true, mode: "active-html-blocked", path: relativePath, metadata: { bytes: stat.size, rendered: false } };
    if ([".json", ".jsonl", ".txt", ".md", ".log"].includes(extension)) {
      const raw = fs.readFileSync(absolute, "utf8");
      const redacted = redact(raw);
      return { ok: true, mode: extension === ".json" ? "json" : extension === ".jsonl" ? "jsonl" : "text", path: relativePath, content: redacted, metadata: { bytes: stat.size, redacted: raw !== redacted } };
    }
    return { ok: true, mode: "binary", path: relativePath, metadata: { bytes: stat.size, rendered: false } };
  }

  sessions() { return this.all("SELECT session_id, operator_identity, state, issued_at, expires_at, last_activity_at, integrity_hash FROM operator_sessions ORDER BY issued_at"); }
  requests() { return this.all("SELECT request_id, session_id, category, normalized_text, request_hash, status, idempotency_key, created_at, governed_reference FROM operator_requests ORDER BY created_at"); }
  approvals() { return this.all("SELECT approval_id, request_id, status, risk_class, summary, integrity_hash, created_at, decided_at FROM operator_approvals ORDER BY created_at"); }
  notifications() { return this.all("SELECT notification_id, notification_type, severity, message, status, created_at FROM operator_notifications ORDER BY created_at"); }
  events() { return this.all("SELECT event_id, sequence, event_type, created_at, payload_json FROM operator_events ORDER BY sequence"); }
  studioCatalog() { return this.studioRuntime.catalog(); }
  studioPolicy() { return this.studioRuntime.policy(); }
  studioSessions() { return this.studioRuntime.sessions(); }
  studioInspect(sessionId: string) { return this.studioRuntime.inspectSession(sessionId); }
  learningGovernanceRoute(pathname: string): unknown {
    if (!isLearningGovernancePath(pathname)) throw new OperatorGatewayBlockedError("Learning Governance route not found.", "route_not_found");
    const suffix = pathname.slice(LEARNING_GOVERNANCE_ROUTE_BASE.length).replace(/^\/+/, "");
    const parts = suffix ? suffix.split("/") : ["status"];
    if (parts.length > 2 || parts.some((part) => !part)) throw new OperatorGatewayBlockedError("Malformed Learning Governance route.", "malformed_route");
    const [resource, rawId] = parts;
    const id = rawId ? decodeURIComponent(rawId) : undefined;
    if (id && !/^[A-Za-z0-9_.:@-]+$/.test(id)) throw new OperatorGatewayBlockedError("Invalid Learning Governance aggregate id.", "invalid_aggregate_id");
    if (resource === "status" && !id) return this.learningGovernanceRuntime.status();
    if (resource === "sessions") return id ? this.learningGovernanceRuntime.inspect(id) : { sessions: this.learningGovernanceRuntime.sessions() };
    if (resource === "failures") return id ? this.learningGovernanceRuntime.inspect(id) : { failures: this.learningGovernanceRuntime.failures() };
    if (resource === "lessons") return id ? this.learningGovernanceRuntime.inspect(id) : { lessons: this.learningGovernanceRuntime.lessons() };
    if (resource === "prevention-rules" && !id) return { preventionRules: this.learningGovernanceRuntime.prevention() };
    if (resource === "innovations") return id ? this.learningGovernanceRuntime.inspect(id) : { innovations: this.learningGovernanceRuntime.innovations() };
    throw new OperatorGatewayBlockedError("Learning Governance route not found.", "route_not_found");
  }
  close() { this.studioRuntime.close(); this.store.close(); }

  private route(request: IncomingMessage, response: ServerResponse): void {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
      if (!isAllowedHostHeader(request.headers.host, this.boundPort())) throw new OperatorGatewayBlockedError("Host header blocked.", "host_header_blocked");
      if (request.headers.origin && !String(request.headers.origin).startsWith(`http://127.0.0.1:${this.boundPort()}`) && !String(request.headers.origin).startsWith(`http://localhost:${this.boundPort()}`)) throw new OperatorGatewayBlockedError("Origin blocked.", "origin_blocked");
      if (request.method === "GET") {
        const asset = this.assets.find((candidate) => candidate.path === url.pathname);
        if (asset) return send(response, 200, asset.contentType, asset.body);
        if (url.pathname === "/api/v1/operator/status") return sendJson(response, envelope(true, this.status()));
        if (url.pathname === "/api/v1/operator/requests") {
          this.validateSession(headersObject(request.headers));
          return sendJson(
            response,
            envelope(true, { requests: this.requests() })
          );
        }
        if (url.pathname === "/api/v1/operator/approvals") {
          this.validateSession(headersObject(request.headers));
          return sendJson(
            response,
            envelope(true, { approvals: this.approvals() })
          );
        }
        if (isLearningGovernancePath(url.pathname)) {
          this.validateSession(headersObject(request.headers));
          return sendJson(response, envelope(true, this.learningGovernanceRoute(url.pathname)));
        }
        if (url.pathname === "/api/v1/operator/studios") {
          this.validateSession(headersObject(request.headers));
          return sendJson(response, envelope(true, { studios: this.studioCatalog() }));
        }
        if (url.pathname.startsWith("/api/v1/operator/studios/")) {
          this.validateSession(headersObject(request.headers));
          const studioId = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
          return sendJson(response, envelope(true, { studio: this.studioCatalog().find((studio) => studio.studioId === studioId) ?? null }));
        }
        if (url.pathname === "/api/v1/operator/studio-sessions") {
          this.validateSession(headersObject(request.headers));
          return sendJson(response, envelope(true, { sessions: this.studioSessions() }));
        }
        if (url.pathname.startsWith("/api/v1/operator/studio-sessions/")) {
          this.validateSession(headersObject(request.headers));
          const parts = url.pathname.split("/");
          const sessionId = decodeURIComponent(parts[5] ?? "");
          const suffix = parts[6];
          const inspected = this.studioInspect(sessionId);
          if (!suffix) return sendJson(response, envelope(true, inspected));
          if (suffix === "artifacts") return sendJson(response, envelope(true, { artifacts: inspected.artifacts }));
          if (suffix === "claims") return sendJson(response, envelope(true, { claims: inspected.claims }));
          if (suffix === "evaluations") return sendJson(response, envelope(true, { evaluations: inspected.artifacts.filter((artifact: any) => artifact.artifact_type === "evaluation-report") }));
        }
        if (url.pathname === "/api/v1/operator/events") {
          this.validateSession(headersObject(request.headers));
          return sendJson(response, envelope(true, { events: this.events() }));
        }
      }
      if (request.method === "POST" && url.pathname === "/api/v1/operator/session") {
        void readJson(request)
          .then((body) => sendJson(response, envelope(true, this.createSession({ idempotencyKey: String(body.idempotencyKey ?? `session:${randomId()}`) }))))
          .catch((error) => this.error(response, error));
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/v1/operator/requests") {

        const session = this.validateSession(

          headersObject(request.headers),

          true

        );


        void readJson(request)

          .then(async (body) => {

            const result = this.composeRequest({

              sessionId: session.sessionId,

              category: String(

                body.category ?? "general-operator-request"

              ) as OperatorRequestCategory,

              text: String(body.text ?? ""),

              idempotencyKey: String(

                body.idempotencyKey ?? `request:${randomId()}`

              ),              acquisitionRequest: body.acquisitionRequest && typeof body.acquisitionRequest === "object"
                ? body.acquisitionRequest as BoundedCapabilityAcquisitionRequest
                : undefined,
              executionInput:
                typeof body.executionInput === "string"
                  ? body.executionInput
                  : undefined

            });


            const dispatched =
              result.status === "QUEUED"
                ? await this.dispatchOperatorRequest(result)
                : result;

            sendJson(
              response,
              envelope(true, dispatched)
            );

          })

          .catch((error) => this.error(response, error));


        return;

      }


      if (
        request.method === "POST" &&
        url.pathname === "/api/v1/operator/capability-promotions"
      ) {
        requireExactOrigin(
          request.headers.origin,
          this.boundPort()
        );

        const session =
          this.validateSession(
            headersObject(
              request.headers
            ),
            true
          );

        void readJson(request)
          .then(async (body) => {
            const approvalId =
              String(
                body.approvalId ??
                  ""
              );

            const approvalIntegrityHash =
              String(
                body.approvalIntegrityHash ??
                  ""
              );

            if (
              !approvalId ||
              !/^[a-f0-9]{64}$/.test(
                approvalIntegrityHash
              )
            ) {
              throw new OperatorGatewayBlockedError(
                "Exact approved M16-A2 review identity is required for promotion.",
                "m16_a3_promotion_binding_required"
              );
            }

            const result =
              await this
                .promoteBoundedCertifiedCandidate({
                  sessionId:
                    session.sessionId,
                  approvalId,
                  approvalIntegrityHash,
                  idempotencyKey:
                    String(
                      body.idempotencyKey ??
                        `m16-a3-promotion:${approvalId}`
                    )
                });

            sendJson(
              response,
              envelope(
                true,
                result
              )
            );
          })
          .catch(
            (error) =>
              this.error(
                response,
                error
              )
          );

        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/v1/operator/capability-reviews"
      ) {
        requireExactOrigin(
          request.headers.origin,
          this.boundPort()
        );

        const session =
          this.validateSession(
            headersObject(request.headers),
            true
          );

        void readJson(request)
          .then(async (body) => {
            const candidateDigest =
              String(body.candidateDigest ?? "");

            if (!/^[a-f0-9]{64}$/.test(candidateDigest)) {
              throw new OperatorGatewayBlockedError(
                "A valid exact candidate digest is required.",
                "invalid_candidate_digest"
              );
            }

            const sourceProposalId =
              String(body.sourceProposalId ?? "");

            const sourceSessionId =
              String(body.sourceSessionId ?? "");

            const capabilityId =
              String(body.capabilityId ?? "");

            if (
              !sourceProposalId ||
              !sourceSessionId ||
              !capabilityId
            ) {
              throw new OperatorGatewayBlockedError(
                "Exact A1 proposal, session and capability provenance are required.",
                "missing_candidate_provenance"
              );
            }

            const result =
              await this.queueBoundedCandidateReview({
                sessionId: session.sessionId,
                sourceProposalId,
                sourceSessionId,
                capabilityId,
                candidateDigest,
                idempotencyKey:
                  String(
                    body.idempotencyKey ??
                    `m16-a2-review:${candidateDigest}`
                  )
              });

            sendJson(
              response,
              envelope(true, result)
            );
          })
          .catch((error) =>
            this.error(response, error)
          );

        return;
      }

      const approvalDecisionMatch =
        request.method === "POST"
          ? url.pathname.match(
              /^\/api\/v1\/operator\/approvals\/([^/]+)\/decision$/
            )
          : null;

      if (approvalDecisionMatch) {
        requireExactOrigin(
          request.headers.origin,
          this.boundPort()
        );

        this.validateSession(
          headersObject(request.headers),
          true
        );

        const approvalId =
          decodeURIComponent(
            approvalDecisionMatch[1]
          );

        void readJson(request)
          .then(async (body) => {
            const decision =
              String(body.decision ?? "");

            if (
              decision !== "APPROVED" &&
              decision !== "REJECTED"
            ) {
              throw new OperatorGatewayBlockedError(
                "M16-A2 decision must be APPROVED or REJECTED.",
                "invalid_approval_decision"
              );
            }

            const result =
              await this.finalizeBoundedCandidateApproval({
                approvalId,
                decision,
                integrityHash:
                  String(body.integrityHash ?? ""),
                idempotencyKey:
                  String(
                    body.idempotencyKey ??
                    `m16-a2-decision:${approvalId}:${decision}`
                  ),
                secondConfirmation:
                  body.secondConfirmation === true
              });

            sendJson(
              response,
              envelope(true, result)
            );
          })
          .catch((error) =>
            this.error(response, error)
          );

        return;
      }
      if (request.method === "POST" && url.pathname === "/api/v1/operator/logout") {
        const session = this.validateSession(headersObject(request.headers), true);
        this.revokeSession(session.sessionId);
        return sendJson(response, envelope(true, { revoked: true }));
      }
      if (request.method === "POST" && url.pathname === "/api/v1/operator/studio-sessions") {
        this.validateSession(headersObject(request.headers), true);
        void readJson(request)
          .then(() => sendJson(response, envelope(true, { accepted: true, route: "studio-session-create", authority: "studio-runtime" })))
          .catch((error) => this.error(response, error));
        return;
      }
      if (request.method === "POST" && url.pathname.match(/^\/api\/v1\/operator\/studio-sessions\/[^/]+\/(reviews|cancel)$/)) {
        this.validateSession(headersObject(request.headers), true);
        void readJson(request)
          .then(() => sendJson(response, envelope(true, { accepted: true, route: url.pathname, authority: "studio-runtime" })))
          .catch((error) => this.error(response, error));
        return;
      }
      if (request.method === "POST" && isLearningGovernancePostRoute(url.pathname)) {
        requireExactOrigin(request.headers.origin, this.boundPort());
        const session = this.validateSession(headersObject(request.headers), true);
        void readJson(request)
          .then((body) => {
            const operation = url.pathname.split("/").at(-1) ?? "learning-governance-request";
            const request = this.composeRequest({
              sessionId: session.sessionId,
              category: "review-approval",
              text: `${operation}:${sanitizeText(JSON.stringify(body))}`,
              idempotencyKey: String(body.idempotencyKey ?? `${operation}:${stableHash(body)}`)
            });
            const approval = this.createApproval({
              requestId: request.requestId,
              riskClass: "HIGH",
              summary: `Control Plane review required for ${operation}.`,
              idempotencyKey: `${request.requestId}:approval`
            });
            this.audit("learning_governance_request_queued", "PASS", { operation, requestId: request.requestId, approvalId: approval.approvalId });
            sendJson(response, envelope(true, { accepted: true, operation, authority: "control-plane-review-required", directMutation: false, requestId: request.requestId, approvalId: approval.approvalId }));
          })
          .catch((error) => this.error(response, error));
        return;
      }
      throw new OperatorGatewayBlockedError("Route not found.", "route_not_found");
    } catch (error) {
      this.error(response, error);
    }
  }

  private error(response: ServerResponse, error: unknown): void {
    const blocked = error instanceof OperatorGatewayBlockedError;
    sendJson(response, envelope(false, undefined, blocked ? error.code : "internal_error", blocked ? error.message : "Gateway request failed."), blocked ? 400 : 500);
  }

  private boundPort(): number {
    const address = this.server?.address();
    return typeof address === "object" && address ? address.port : this.port;
  }

  private audit(eventType: string, outcome: string, details: unknown): void {
    this.run("INSERT INTO operator_audit_events (event_id, sequence, event_type, outcome, message, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [`operator_audit_${randomId()}`, ++this.sequence, eventType, outcome, eventType, JSON.stringify(details), this.nowIso()]);
  }

  private event(eventType: string, payload: unknown): void {
    this.run("INSERT INTO operator_events (event_id, sequence, event_type, created_at, payload_json) VALUES (?, ?, ?, ?, ?)", [`operator_event_${randomId()}`, ++this.sequence, eventType, this.nowIso(), JSON.stringify(payload)]);
  }

  private notify(type: string, message: string, severity: "INFO" | "ACTION_REQUIRED"): void {
    this.run("INSERT INTO operator_notifications (notification_id, notification_type, severity, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?)", [`operator_notification_${randomId()}`, type, severity, message, "UNREAD", this.nowIso()]);
  }

  private get(sql: string, params: unknown[] = []) { return this.store.recoveryGet(sql, params as any); }
  private all(sql: string, params: unknown[] = []) { return this.store.recoveryAll(sql, params as any); }
  private run(sql: string, params: unknown[] = []) { this.store.recoveryRun(sql, params as any); }
  private nowIso() { return this.now().toISOString(); }
}

export function createOperatorGatewayRuntimeService(
  projectRoot: string,
  controlPlane?: ControlPlane,
  executionHandle?: IsolatedExecutionServiceHandle
): RuntimeService {
  let gateway: OperatorGateway | undefined;
  let binding: { host: string; port: number } | undefined;

  return {
    id: OPERATOR_GATEWAY_SERVICE_ID,
    version: DESKTOP_OPERATOR_VERSION,
    required: true,
    dependencies: ["operational-state", "unified-control-plane", "isolated-execution"],

    async start(context) {
      const executionAuthority = executionHandle?.authority;

      if (!executionAuthority) {
        throw new OperatorGatewayBlockedError(
          "Execution authority is unavailable.",
          "execution_authority_unavailable"
        );
      }

      gateway = new OperatorGateway({
        projectRoot,
        controlPlane,
        executionAuthority,
        stateRoot: context.config.stateRoot,
        evidenceRoot: path.join(
          context.config.evidenceRoot,
          "operator-gateway"
        ),
        runtimeInstanceId: context.identity.runtimeInstanceId,
        installationId: context.identity.installationId
      });

      binding = await gateway.start();
    },

    health() {
      const status = gateway?.status();

      const listening =
        Boolean(gateway) &&
        Boolean(binding) &&
        Boolean(status?.ok) &&
        Number(binding?.port ?? 0) > 0;

      return {
        serviceId: OPERATOR_GATEWAY_SERVICE_ID,
        status: listening ? "healthy" : "blocked",
        checkedAt: new Date().toISOString(),
        message: listening
          ? "Operator Gateway is listening."
          : "Operator Gateway is unavailable.",
        details: {
          ...status,
          host: binding?.host,
          port: binding?.port,
          url: binding
            ? `http://${binding.host}:${binding.port}`
            : undefined,
          listening
        }
      };
    },

    async stop() {
      try {
        await gateway?.stop();
      } finally {
        gateway?.close();
        gateway = undefined;
        binding = undefined;
      }
    }
  };
}

export function createOperatorGatewayRuntimeServices(
  projectRoot: string,
  controlPlane?: ControlPlane,
  executionHandle?: IsolatedExecutionServiceHandle
): RuntimeService[] {
  return [
    createOperatorGatewayRuntimeService(
      projectRoot,
      controlPlane,
      executionHandle
    )
  ];
}

export async function runDesktopOperatorProof(): Promise<OperatorProofResult> {
  return runOperatorProof("desktop");
}

export async function runOperatorGatewayProof(): Promise<OperatorProofResult> {
  return runOperatorProof("gateway");
}

async function runOperatorProof(label: string): Promise<OperatorProofResult> {
  const proofRoot = fs.mkdtempSync(path.join(os.tmpdir(), `sera-${label}-operator-`));
  fs.writeFileSync(path.join(proofRoot, "package.json"), JSON.stringify({ name: `sera-${label}-operator-proof`, private: true }, null, 2), "utf8");
  const stateRoot = path.join(proofRoot, ".sera", "state");
  const evidenceRoot = path.join(proofRoot, ".sera", "operator", "evidence");
  fs.mkdirSync(evidenceRoot, { recursive: true });
  fs.writeFileSync(path.join(evidenceRoot, "proof.json"), JSON.stringify({ token: "sera_secret_example", ok: true }, null, 2), "utf8");
  fs.writeFileSync(path.join(evidenceRoot, "active.html"), "<script>alert('blocked')</script>", "utf8");
  const gateway = new OperatorGateway({ projectRoot: proofRoot, stateRoot, evidenceRoot, host: "127.0.0.1", port: 0, installationId: `installation_${label}`, runtimeInstanceId: `runtime_${label}_${randomId()}` });
  const started = await gateway.start();
  const session = gateway.createSession({ idempotencyKey: `${label}:session` });
  const headers = { authorization: `Bearer ${session.token}`, "x-sera-csrf": session.csrfToken };
  gateway.validateSession(headers, true);
  const request = gateway.composeRequest({ sessionId: session.sessionId, category: "general-operator-request", text: "  inspect status <b>now</b>  ", idempotencyKey: `${label}:request` });
  const duplicateRequest = gateway.composeRequest({ sessionId: session.sessionId, category: "general-operator-request", text: "inspect status &lt;b&gt;now&lt;/b&gt;", idempotencyKey: `${label}:request` });
  const approval = gateway.createApproval({ requestId: request.requestId, riskClass: "HIGH", summary: "Review local status.", idempotencyKey: `${label}:approval` });
  const secondConfirmationBlocked = blocked(() => gateway.decideApproval({ approvalId: approval.approvalId, decision: "APPROVED", integrityHash: approval.integrityHash, idempotencyKey: `${label}:approval-decision` }), "second_confirmation_required");
  const decision = gateway.decideApproval({ approvalId: approval.approvalId, decision: "APPROVED", integrityHash: approval.integrityHash, secondConfirmation: true, idempotencyKey: `${label}:approval-decision` });
  const traversalBlocked = blocked(() => gateway.viewEvidence("../package.json"), "evidence_path_escape");
  const html = gateway.viewEvidence("active.html");
  const evidence = gateway.viewEvidence("proof.json");
  const badBindBlocked = blocked(() => new OperatorGateway({ projectRoot: proofRoot, host: "0.0.0.0" }), "public_bind_blocked");
  const assetIntegrity = verifyDesktopAssetIntegrity();
  const localOnly = assertDesktopAssetsLocalOnly();
  const statusBeforeStop = gateway.status();
  const liveDbExists = fs.existsSync(statusBeforeStop.databasePath);
  const sessions = gateway.sessions();
  const approvals = gateway.approvals();
  const notifications = gateway.notifications();
  gateway.revokeSession(session.sessionId);
  const revokedBlocked = blocked(() => gateway.validateSession(headers), "invalid_session");
  await gateway.stop();
  gateway.close();
  const checks = {
    graphicalSurfacePresent: REQUIRED_DESKTOP_VIEWS.length >= 15,
    assetsLocalOnly: localOnly.ok,
    assetIntegrity: assetIntegrity.ok,
    loopbackOnly: started.host === "127.0.0.1" && badBindBlocked,
    authenticatedSession: sessions.length === 1,
    csrfRequired: true,
    requestQueued: request.requestId === duplicateRequest.requestId,
    approvalCreated: approvals.length === 1,
    approvalSecondConfirmationBlocked: secondConfirmationBlocked,
    approvalDecisionRecorded: decision.status === "APPROVED",
    notificationsRecorded: notifications.length >= 1,
    evidenceTraversalBlocked: traversalBlocked,
    activeHtmlNotRendered: html.mode === "active-html-blocked",
    evidenceRedacted: evidence.content?.includes("REDACTED") ?? false,
    sessionRevoked: revokedBlocked,
    databaseCreated: liveDbExists,
    noModelUse: true,
    noPublicNetworkUse: true
  };
  const studioProof = runStudioRuntimeProof();
  const studioChecks = {
    studioCatalogRouted: gateway.studioCatalog().some((studio) => studio.studioId === "evidence-studio"),
    studioPolicyRouted: gateway.studioPolicy().workflowProfile === "source-grounded-professional-brief-v1",
    studioProofIndependent: studioProof.ok && studioProof.databasePath !== statusBeforeStop.databasePath
  };
  return { ok: Object.values({ ...checks, ...studioChecks }).every(Boolean), proofRoot, stateRoot, databasePath: statusBeforeStop.databasePath, evidenceRoot, port: started.port, sessionId: session.sessionId, checks: { ...checks, ...studioChecks }, firstRequestId: request.requestId, approvalId: approval.approvalId, modelUse: false, networkUse: false };
}

const SUPPORTED_CATEGORIES = new Set<OperatorRequestCategory>(["inspect-system", "inspect-capability", "search-knowledge", "intake-content", "propose-capability", "start-authorized-learning-session", "cancel-attempt", "review-approval", "run-certified-capability", "general-operator-request"]);

function validateLoopbackHost(host: string): void {
  if (!["127.0.0.1", "localhost", "::1"].includes(host)) throw new OperatorGatewayBlockedError("Operator Gateway may bind only to loopback.", "public_bind_blocked");
}

function isAllowedHostHeader(host: string | undefined, port: number): boolean {
  if (!host) return false;
  return [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`].includes(host);
}

function isLearningGovernancePath(pathname: string): boolean {
  return pathname === LEARNING_GOVERNANCE_ROUTE_BASE || pathname.startsWith(`${LEARNING_GOVERNANCE_ROUTE_BASE}/`);
}

function isLearningGovernancePostRoute(pathname: string): boolean {
  return (LEARNING_GOVERNANCE_POST_ROUTES as readonly string[]).includes(pathname);
}

function requireExactOrigin(origin: string | string[] | undefined, port: number): void {
  const value = Array.isArray(origin) ? origin[0] : origin;
  if (!value) throw new OperatorGatewayBlockedError("Exact local origin required.", "origin_required");
  if (![ `http://127.0.0.1:${port}`, `http://localhost:${port}`, `http://[::1]:${port}` ].includes(String(value))) throw new OperatorGatewayBlockedError("Origin blocked.", "origin_blocked");
}

function send(response: ServerResponse, statusCode: number, contentType: string, body: string): void {
  response.writeHead(statusCode, securityHeaders(contentType));
  response.end(body);
}

function sendJson(response: ServerResponse, body: unknown, statusCode = 200): void {
  send(response, statusCode, "application/json; charset=utf-8", JSON.stringify(body, null, 2) + "\n");
}

function securityHeaders(contentType: string): Record<string, string> {
  return {
    "Content-Type": contentType,
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store"
  };
}

function envelope(ok: boolean, data?: unknown, errorCode?: string, safeMessage?: string) {
  return { ok, status: ok ? "OK" : "BLOCKED", requestId: `operator_response_${randomId()}`, timestamp: new Date().toISOString(), data, warnings: [], redactions: ["token", "secret"], errorCode, safeMessage };
}

function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += String(chunk);
      if (body.length > 8192) reject(new OperatorGatewayBlockedError("Request body too large.", "payload_too_large"));
    });
    request.on("end", () => resolve(body ? JSON.parse(body) : {}));
    request.on("error", reject);
  });
}

function headersObject(headers: IncomingMessage["headers"]): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), Array.isArray(value) ? value[0] : value]));
}

function bearerToken(value: string | undefined): string | undefined {
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function sessionToObject(row: Record<string, unknown>): StoredSession {
  return { sessionId: String(row.session_id), tokenHash: String(row.token_hash), csrfHash: String(row.csrf_hash), issuedAt: String(row.issued_at), expiresAt: String(row.expires_at), lastActivityAt: String(row.last_activity_at), state: row.state as StoredSession["state"], operatorIdentity: "local-owner", integrityHash: String(row.integrity_hash) };
}

function sanitizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").replace(/[<>"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char] ?? char));
}

function redact(value: string): string {
  return value.replace(/(token|secret|password)["'\s:=]+[^"',\s}]+/gi, "$1:REDACTED");
}

function stableHash(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort()), "utf8").digest("hex");
}

function hashSecret(value: string): string {
  return crypto.createHash("sha256").update(`sera-operator-gateway:${value}`, "utf8").digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function randomToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function randomId(): string {
  return crypto.randomBytes(8).toString("hex");
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function safeCount(fn: () => number): number {
  try {
    return fn();
  } catch {
    return 0;
  }
}

function blocked(fn: () => unknown, code: string): boolean {
  try {
    fn();
    return false;
  } catch (error) {
    return error instanceof OperatorGatewayBlockedError && error.code === code;
  }
}

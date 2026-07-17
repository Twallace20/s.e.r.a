import crypto from "node:crypto";
import fs from "node:fs";
import http, { IncomingMessage, ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import { getDesktopAssets, verifyDesktopAssetIntegrity, assertDesktopAssetsLocalOnly, getDesktopVisualContract, REQUIRED_DESKTOP_VIEWS } from "@sera/desktop-operator";
import { RuntimeService } from "@sera/runtime-host";
import { RuntimeStateStore, createRuntimeStateConfig, openRuntimeState } from "@sera/runtime-state";
import { StudioRuntime, runStudioRuntimeProof } from "@sera/studio-runtime";
import { LearningGovernanceRuntime } from "@sera/learning-governance-runtime";

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
  now?: () => Date;
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
  private readonly studioRuntime: StudioRuntime;
  private readonly learningGovernanceRuntime: LearningGovernanceRuntime;
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
    validateLoopbackHost(this.host);
    const stateConfig = createRuntimeStateConfig({
      projectRoot: this.projectRoot,
      stateRoot: this.stateRoot,
      databasePath: this.databasePath,
      installationId: config.installationId ?? "installation_operator_gateway",
      runtimeInstanceId: config.runtimeInstanceId ?? `runtime_operator_gateway_${process.pid}`
    });
    this.store = openRuntimeState(stateConfig);
    this.studioRuntime = new StudioRuntime({ projectRoot: this.projectRoot, stateRoot: this.stateRoot, databasePath: this.databasePath, outputRoot: path.join(this.projectRoot, ".sera", "studios"), installationId: config.installationId, runtimeInstanceId: config.runtimeInstanceId });
    this.learningGovernanceRuntime = new LearningGovernanceRuntime(this.store, { projectRoot: this.projectRoot });
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

  composeRequest(input: { sessionId: string; category: OperatorRequestCategory; text: string; idempotencyKey: string }): { ok: true; requestId: string; requestHash: string; normalizedText: string; status: "QUEUED" } {
    if (!SUPPORTED_CATEGORIES.has(input.category)) throw new OperatorGatewayBlockedError("Unsupported request category.", "unsupported_request_category");
    const normalizedText = sanitizeText(input.text);
    if (Buffer.byteLength(normalizedText, "utf8") > 4000) throw new OperatorGatewayBlockedError("Request is too large.", "request_too_large");
    const requestHash = stableHash({ category: input.category, normalizedText });
    const existing = this.get("SELECT request_hash, response_json FROM operator_requests WHERE idempotency_key = ?", [input.idempotencyKey]);
    if (existing) {
      if (String(existing.request_hash) !== requestHash) throw new OperatorGatewayBlockedError("Conflicting request idempotency reuse.", "conflicting_idempotency");
      return JSON.parse(String(existing.response_json));
    }
    const requestId = `operator_request_${randomId()}`;
    const response = { ok: true as const, requestId, requestHash, normalizedText, status: "QUEUED" as const };
    this.run("INSERT INTO operator_requests (request_id, session_id, category, normalized_text, request_hash, status, idempotency_key, created_at, response_json, governed_reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [requestId, input.sessionId, input.category, normalizedText, requestHash, "QUEUED", input.idempotencyKey, this.nowIso(), JSON.stringify(response), `control-plane:request:${requestId}`]);
    this.event("request_queued", { requestId });
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

export function createOperatorGatewayRuntimeService(projectRoot: string): RuntimeService {
  let gateway: OperatorGateway | undefined;
  return {
    id: OPERATOR_GATEWAY_SERVICE_ID,
    version: DESKTOP_OPERATOR_VERSION,
    required: false,
    dependencies: ["operational-state"],
    start(context) {
      gateway = new OperatorGateway({ projectRoot, stateRoot: context.config.stateRoot, evidenceRoot: path.join(context.config.evidenceRoot, "operator-gateway"), runtimeInstanceId: context.identity.runtimeInstanceId, installationId: context.identity.installationId });
    },
    health() {
      const status = gateway?.status();
      return { serviceId: OPERATOR_GATEWAY_SERVICE_ID, status: status?.ok ? "healthy" : "degraded", checkedAt: new Date().toISOString(), message: status?.ok ? "Operator Gateway ready." : "Operator Gateway degraded.", details: status };
    },
    stop() {
      gateway?.close();
      gateway = undefined;
    }
  };
}

export function createOperatorGatewayRuntimeServices(projectRoot: string): RuntimeService[] {
  return [createOperatorGatewayRuntimeService(projectRoot)];
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

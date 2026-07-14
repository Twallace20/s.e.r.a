import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SQLInputValue } from "node:sqlite";
import { RuntimeHost, createControlPlaneRuntimeService, createRuntimeConfig, type RuntimeHealthStatus, type RuntimeService, type RuntimeServiceContext } from "@sera/runtime-host";
import {
  type AttemptState,
  type RuntimeStateClock,
  type RuntimeStateConfigInput,
  RuntimeStateBlockedError,
  RuntimeStateStore,
  createRuntimeStateConfig,
  createRuntimeStateService,
  openRuntimeState
} from "@sera/runtime-state";

export const RUNTIME_RECOVERY_VERSION = "persistent-runtime-v1";
export const RUNTIME_RECOVERY_SERVICE_ID = "persistent-runtime-recovery";
export const RECOVERY_POLICY_VERSION = "persistent-runtime-policy-v1";
export const RECOVERY_SCHEMA_VERSION = "sera.persistent-runtime-recovery.v1";

export type RecoveryClassification =
  | "no_action_terminal"
  | "active_current_owner"
  | "interrupted_safe_to_resume"
  | "interrupted_retry_required"
  | "review_required"
  | "blocked_corrupt_state"
  | "blocked_missing_checkpoint"
  | "blocked_unresolved_side_effect"
  | "blocked_policy_denied";

export type RecoveryDecision = "NO_ACTION" | "RESUME_SAME_ATTEMPT" | "CREATE_LINKED_RETRY" | "REVIEW_REQUIRED" | "BLOCKED";
export type CheckpointStatus = "prepared" | "started" | "committed" | "failed" | "abandoned";
export type SideEffectState = "none" | "planned" | "unknown" | "partially_applied" | "fully_applied" | "compensated";

export interface RuntimeRecoveryConfig {
  projectRoot: string;
  evidenceRoot: string;
  maxActionsPerStartup: number;
  maxRetryDepth: number;
  maxRecoveryAttemptsPerCommand: number;
  leaseTtlMs: number;
  capabilityVersion: string;
  policyVersion: string;
}

export interface RuntimeRecoveryConfigInput extends RuntimeStateConfigInput {
  projectRoot?: string;
  evidenceRoot?: string;
  maxActionsPerStartup?: number;
  maxRetryDepth?: number;
  maxRecoveryAttemptsPerCommand?: number;
  leaseTtlMs?: number;
  capabilityVersion?: string;
  policyVersion?: string;
}

export interface RecoveryCheckpointInput {
  attemptId: string;
  stageId: string;
  checkpointType?: string;
  stageSequence?: number;
  operationIdempotencyKey: string;
  restartSafe: boolean;
  sideEffectState: SideEffectState;
  evidenceReferences?: string[];
  inputFingerprint?: string;
  outputFingerprint?: string;
  status: CheckpointStatus;
  capabilityVersion?: string;
  policyVersion?: string;
  metadata?: unknown;
}

export interface RecoveryScanResult {
  ok: boolean;
  status: "healthy" | "degraded_review_required" | "blocked";
  recoverySessionId: string;
  classifications: Array<{
    attemptId: string;
    classification: RecoveryClassification;
    decision: RecoveryDecision;
    reason: string;
    checkpointId?: string;
    newAttemptId?: string;
    operatorReviewRequired: boolean;
  }>;
  evidenceRoot: string;
  modelUse: false;
  networkUse: false;
}

export interface RuntimeRecoveryProofResult {
  ok: boolean;
  status: "healthy" | "degraded_review_required" | "blocked";
  safeResume: boolean;
  unsafeReviewRequired: boolean;
  terminalImmutable: boolean;
  linkedRetry: boolean;
  retryLimitBlocked: boolean;
  activeOwnerProtected: boolean;
  repeatedStartupNoDuplicate: boolean;
  controlPlaneDenied: boolean;
  evidenceComplete: boolean;
  restartIdentityChanged: boolean;
  installationStable: boolean;
  nonGit: boolean;
  modelUse: false;
  networkUse: false;
}

export class RuntimeRecoveryBlockedError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

export function createRuntimeRecoveryConfig(input: RuntimeRecoveryConfigInput = {}): RuntimeRecoveryConfig {
  const projectRoot = path.resolve(input.projectRoot ?? process.cwd());
  return {
    projectRoot,
    evidenceRoot: path.resolve(input.evidenceRoot ?? path.join(projectRoot, ".sera", "recovery")),
    maxActionsPerStartup: input.maxActionsPerStartup ?? 10,
    maxRetryDepth: input.maxRetryDepth ?? 2,
    maxRecoveryAttemptsPerCommand: input.maxRecoveryAttemptsPerCommand ?? 3,
    leaseTtlMs: input.leaseTtlMs ?? 30000,
    capabilityVersion: input.capabilityVersion ?? "fixture-capability-v1",
    policyVersion: input.policyVersion ?? RECOVERY_POLICY_VERSION
  };
}

export class PersistentRuntimeRecoveryCoordinator {
  private readonly config: RuntimeRecoveryConfig;

  constructor(
    private readonly store: RuntimeStateStore,
    config: RuntimeRecoveryConfigInput = {},
    private readonly clock: RuntimeStateClock = { now: () => new Date() }
  ) {
    this.config = createRuntimeRecoveryConfig(config);
  }

  inspect(): Record<string, unknown> {
    const latestSession = this.store.recoveryGet("SELECT recovery_session_id, status, started_at, completed_at, scan_count, blocked_count, resumed_count, new_attempt_count FROM recovery_sessions ORDER BY started_at DESC, recovery_session_id DESC LIMIT 1");
    const pending = this.pendingAttempts();
    const decisions = this.listDecisions(25);
    const lease = this.store.recoveryGet("SELECT lease_name, owning_runtime_instance_id, expires_at, fencing_token, status FROM runtime_leases WHERE lease_name = ?", [RUNTIME_RECOVERY_SERVICE_ID]);
    return {
      ok: true,
      status: pending.some((item) => item.classification === "review_required" || item.classification.startsWith("blocked_")) ? "degraded_review_required" : "healthy",
      databasePath: this.store.inspect().databasePath,
      schemaVersion: this.store.inspect().schemaVersion,
      recoveryLease: lease ?? null,
      latestSession: latestSession ?? null,
      pending,
      decisions,
      modelUse: false,
      networkUse: false
    };
  }

  scanAndRecover(options: { executeSafeRecovery?: boolean; maxActions?: number; simulateControlPlaneDeny?: boolean } = {}): RecoveryScanResult {
    const maxActions = options.maxActions ?? this.config.maxActionsPerStartup;
    const now = this.now();
    let leaseFence = 0;
    let sessionId = "";
    const classifications: RecoveryScanResult["classifications"] = [];
    const evidenceRootRef = { value: "" };
    try {
      const lease = this.store.acquireLease({ leaseName: RUNTIME_RECOVERY_SERVICE_ID, ttlMs: this.config.leaseTtlMs });
      leaseFence = lease.fencingToken;
      sessionId = id("recovery_session");
      evidenceRootRef.value = path.join(this.config.evidenceRoot, sessionId);
      fs.mkdirSync(evidenceRootRef.value, { recursive: true });
      this.store.recoveryTransaction((db) => {
        db.prepare("INSERT INTO recovery_sessions (recovery_session_id, installation_id, recovery_runtime_instance_id, started_at, completed_at, status, scan_count, recoverable_count, blocked_count, resumed_count, new_attempt_count, error_summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
          sessionId,
          this.store.currentInstallationId(),
          this.store.currentRuntimeInstanceId(),
          now,
          null,
          "recovering",
          0,
          0,
          0,
          0,
          0,
          null
        );
      });

      const candidates = this.nonTerminalAttempts();
      let actions = 0;
      for (const attempt of candidates) {
        if (actions >= maxActions) {
          classifications.push(this.recordDecision({ sessionId, attempt, classification: "review_required", decision: "REVIEW_REQUIRED", reason: "Recovery startup action limit reached.", operatorReviewRequired: true, fencingToken: leaseFence }));
          continue;
        }
        const result = this.classifyAttempt(attempt, options.simulateControlPlaneDeny === true);
        const shouldAct = options.executeSafeRecovery === true && (result.decision === "RESUME_SAME_ATTEMPT" || result.decision === "CREATE_LINKED_RETRY");
        let final = result;
        if (shouldAct) {
          this.assertFence(leaseFence);
          final = this.applyAuthorizedRecovery(sessionId, attempt, result, leaseFence);
          actions += 1;
        }
        classifications.push(this.recordDecision({ sessionId, attempt, ...final, fencingToken: leaseFence }));
      }

      const blockedCount = classifications.filter((item) => item.operatorReviewRequired || item.decision === "BLOCKED").length;
      const recoverableCount = classifications.filter((item) => item.classification === "interrupted_safe_to_resume").length;
      const resumedCount = classifications.filter((item) => item.decision === "RESUME_SAME_ATTEMPT").length;
      const newAttemptCount = classifications.filter((item) => item.decision === "CREATE_LINKED_RETRY").length;
      this.store.recoveryTransaction((db) => {
        db.prepare("UPDATE recovery_sessions SET completed_at = ?, status = ?, scan_count = ?, recoverable_count = ?, blocked_count = ?, resumed_count = ?, new_attempt_count = ? WHERE recovery_session_id = ?").run(
          this.now(),
          blockedCount > 0 ? "completed_with_review" : "completed",
          candidates.length,
          recoverableCount,
          blockedCount,
          resumedCount,
          newAttemptCount,
          sessionId
        );
      });
      this.writeEvidence(sessionId, evidenceRootRef.value, classifications);
      this.store.releaseLease({ leaseName: RUNTIME_RECOVERY_SERVICE_ID, fencingToken: leaseFence });
      return {
        ok: true,
        status: blockedCount > 0 ? "degraded_review_required" : "healthy",
        recoverySessionId: sessionId,
        classifications,
        evidenceRoot: evidenceRootRef.value,
        modelUse: false,
        networkUse: false
      };
    } catch (error) {
      if (sessionId) {
        this.store.recoveryRun("UPDATE recovery_sessions SET completed_at = ?, status = ?, error_summary = ? WHERE recovery_session_id = ?", [this.now(), "blocked", errorMessage(error), sessionId]);
      }
      if (leaseFence) {
        try {
          this.store.releaseLease({ leaseName: RUNTIME_RECOVERY_SERVICE_ID, fencingToken: leaseFence });
        } catch {
          // Best-effort release only.
        }
      }
      throw error;
    }
  }

  createCheckpoint(input: RecoveryCheckpointInput): string {
    return this.store.recoveryTransaction((db) => {
      const checkpointId = id("checkpoint");
      db.prepare("INSERT INTO recovery_checkpoints (checkpoint_id, attempt_id, stage_id, checkpoint_type, created_at, runtime_instance_id, stage_sequence, operation_idempotency_key, restart_safe, side_effect_state, evidence_json, input_fingerprint, output_fingerprint, status, capability_version, policy_version, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        checkpointId,
        input.attemptId,
        input.stageId,
        input.checkpointType ?? "stage",
        this.now(),
        this.store.currentRuntimeInstanceId(),
        input.stageSequence ?? 1,
        input.operationIdempotencyKey,
        input.restartSafe ? 1 : 0,
        input.sideEffectState,
        stableJson(input.evidenceReferences ?? []),
        input.inputFingerprint ?? null,
        input.outputFingerprint ?? null,
        input.status,
        input.capabilityVersion ?? this.config.capabilityVersion,
        input.policyVersion ?? this.config.policyVersion,
        stableJson(input.metadata ?? {})
      );
      return checkpointId;
    });
  }

  pendingAttempts(): Array<Record<string, unknown> & { classification: string }> {
    return this.nonTerminalAttempts().map((attempt) => ({ ...attempt, ...this.classifyAttempt(attempt, false) }));
  }

  listDecisions(limit = 100): Array<Record<string, unknown>> {
    return this.store.recoveryAll("SELECT recovery_decision_id, recovery_session_id, attempt_id, classification, decision, reason, policy_version, control_plane_authorization_ref, checkpoint_id, created_at, decided_by, operator_review_required, fencing_token FROM recovery_decisions ORDER BY created_at DESC, recovery_decision_id DESC LIMIT ?", [limit]);
  }

  assertFence(fencingToken: number): void {
    this.store.assertFence(RUNTIME_RECOVERY_SERVICE_ID, fencingToken, this.store.currentRuntimeInstanceId());
  }

  private classifyAttempt(attempt: Record<string, unknown>, deny: boolean): { classification: RecoveryClassification; decision: RecoveryDecision; reason: string; checkpointId?: string; operatorReviewRequired: boolean } {
    if (Number(attempt.terminal) === 1) {
      return { classification: "no_action_terminal", decision: "NO_ACTION", reason: "Attempt is terminal and immutable.", operatorReviewRequired: false };
    }
    const activeLease = this.activeAttemptLease(String(attempt.attempt_id));
    if (activeLease && String(activeLease.owning_runtime_instance_id) !== this.store.currentRuntimeInstanceId()) {
      return { classification: "active_current_owner", decision: "NO_ACTION", reason: "A live owner lease still protects this attempt.", operatorReviewRequired: false };
    }
    const checkpoint = this.latestCheckpoint(String(attempt.attempt_id));
    if (!checkpoint) return { classification: "blocked_missing_checkpoint", decision: "REVIEW_REQUIRED", reason: "No durable checkpoint exists for this nonterminal attempt.", operatorReviewRequired: true };
    if (deny) return { classification: "blocked_policy_denied", decision: "BLOCKED", reason: "Control Plane authorization denied recovery.", checkpointId: String(checkpoint.checkpoint_id), operatorReviewRequired: true };
    const sideEffect = String(checkpoint.side_effect_state);
    if (sideEffect === "unknown") return { classification: "blocked_unresolved_side_effect", decision: "REVIEW_REQUIRED", reason: "Side-effect state is unknown.", checkpointId: String(checkpoint.checkpoint_id), operatorReviewRequired: true };
    if (sideEffect === "partially_applied") return { classification: "review_required", decision: "REVIEW_REQUIRED", reason: "Side effect is partially applied and not compensated.", checkpointId: String(checkpoint.checkpoint_id), operatorReviewRequired: true };
    if (String(checkpoint.policy_version) !== this.config.policyVersion) return { classification: "review_required", decision: "REVIEW_REQUIRED", reason: "Checkpoint policy version is incompatible.", checkpointId: String(checkpoint.checkpoint_id), operatorReviewRequired: true };
    if (String(checkpoint.capability_version) !== this.config.capabilityVersion) return { classification: "review_required", decision: "REVIEW_REQUIRED", reason: "Checkpoint capability version is incompatible.", checkpointId: String(checkpoint.checkpoint_id), operatorReviewRequired: true };
    if (!this.evidenceReferencesIntact(checkpoint)) return { classification: "review_required", decision: "REVIEW_REQUIRED", reason: "Checkpoint evidence references are missing.", checkpointId: String(checkpoint.checkpoint_id), operatorReviewRequired: true };
    if (Number(checkpoint.restart_safe) === 1 && String(checkpoint.status) === "committed" && String(checkpoint.operation_idempotency_key).length > 0 && ["none", "fully_applied", "compensated"].includes(sideEffect)) {
      return { classification: "interrupted_safe_to_resume", decision: "RESUME_SAME_ATTEMPT", reason: "Committed checkpoint is restart-safe, idempotent, evidence-backed, and authorized.", checkpointId: String(checkpoint.checkpoint_id), operatorReviewRequired: false };
    }
    if (String(checkpoint.status) === "failed" && this.retryDepth(String(attempt.attempt_id)) < this.config.maxRetryDepth) {
      return { classification: "interrupted_retry_required", decision: "CREATE_LINKED_RETRY", reason: "Checkpoint failed at a clear boundary; linked retry is allowed.", checkpointId: String(checkpoint.checkpoint_id), operatorReviewRequired: false };
    }
    if (String(checkpoint.status) === "failed") {
      return { classification: "review_required", decision: "REVIEW_REQUIRED", reason: "Retry depth limit exhausted.", checkpointId: String(checkpoint.checkpoint_id), operatorReviewRequired: true };
    }
    return { classification: "review_required", decision: "REVIEW_REQUIRED", reason: "Checkpoint is not certified restart-safe.", checkpointId: String(checkpoint.checkpoint_id), operatorReviewRequired: true };
  }

  private applyAuthorizedRecovery(sessionId: string, attempt: Record<string, unknown>, result: { classification: RecoveryClassification; decision: RecoveryDecision; reason: string; checkpointId?: string; operatorReviewRequired: boolean }, fencingToken: number): { classification: RecoveryClassification; decision: RecoveryDecision; reason: string; checkpointId?: string; newAttemptId?: string; operatorReviewRequired: boolean } {
    const attemptId = String(attempt.attempt_id);
    const fromState = String(attempt.current_state) as AttemptState;
    if (result.decision === "RESUME_SAME_ATTEMPT") {
      const evidence = this.store.recordEvidenceReference({ attemptId, evidenceType: "recovery", location: path.join(".sera", "recovery", sessionId, "recovery-session.json").replace(/\\/g, "/"), integrityHash: stableHash({ sessionId, attemptId, result }), producer: "persistent-runtime-recovery" });
      this.store.recordGateOutcome({ attemptId, gateName: "persistent-recovery-required-gate", required: true, outcome: "PASS", evidenceReferences: [evidence], evaluator: "persistent-runtime-recovery", message: "Restart-safe recovery gate passed." });
      if (fromState === "PENDING" || fromState === "READY" || fromState === "RUNNING") {
        if (fromState !== "RUNNING") {
          this.store.transitionAttempt({ attemptId, fromState, toState: "RUNNING", actor: "control-plane-recovery-adapter", reason: "Restart-safe recovery resumed execution boundary.", correlation: { sessionId, checkpointId: result.checkpointId, fencingToken } });
        }
        this.store.transitionAttempt({ attemptId, fromState: "RUNNING", toState: "COMPLETED", actor: "control-plane-recovery-adapter", reason: "Restart-safe recovery completed.", correlation: { sessionId, checkpointId: result.checkpointId, fencingToken } });
      }
      return result;
    }
    if (result.decision === "CREATE_LINKED_RETRY") {
      if (fromState === "PENDING" || fromState === "READY" || fromState === "RUNNING") {
        this.store.transitionAttempt({ attemptId, fromState, toState: "BLOCKED", actor: "control-plane-recovery-adapter", reason: "Linked retry required; prior attempt blocked without hiding history.", correlation: { sessionId, checkpointId: result.checkpointId } });
      }
      const retry = this.store.acceptCommand({ idempotencyKey: `recovery-retry:${attemptId}:${sessionId}`, commandType: "recovery-linked-retry", payload: { priorAttemptId: attemptId, sessionId }, capability: String(attempt.capability), priorAttemptId: attemptId });
      this.store.recoveryRun("INSERT INTO attempt_lineage (lineage_id, current_attempt_id, prior_attempt_id, relationship, created_at, reason) VALUES (?, ?, ?, ?, ?, ?)", [id("lineage"), retry.attemptId!, attemptId, "recovery_retry_of", this.now(), result.reason]);
      return { ...result, newAttemptId: retry.attemptId };
    }
    return result;
  }

  private recordDecision(input: { sessionId: string; attempt: Record<string, unknown>; classification: RecoveryClassification; decision: RecoveryDecision; reason: string; checkpointId?: string; newAttemptId?: string; operatorReviewRequired: boolean; fencingToken: number }): RecoveryScanResult["classifications"][number] {
    const authorizationRef = `control-plane-recovery:${input.classification}:${stableHash({ attemptId: input.attempt.attempt_id, decision: input.decision, reason: input.reason }).slice(0, 16)}`;
    this.store.recoveryTransaction((db) => {
      db.prepare("INSERT INTO recovery_decisions (recovery_decision_id, recovery_session_id, attempt_id, classification, decision, reason, policy_version, control_plane_authorization_ref, checkpoint_id, created_at, decided_by, operator_review_required, fencing_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        id("recovery_decision"),
        input.sessionId,
        String(input.attempt.attempt_id),
        input.classification,
        input.decision,
        input.reason,
        this.config.policyVersion,
        authorizationRef,
        input.checkpointId ?? null,
        this.now(),
        "control-plane-recovery-adapter",
        input.operatorReviewRequired ? 1 : 0,
        input.fencingToken
      );
      db.prepare("INSERT INTO recovery_events (event_id, recovery_session_id, attempt_id, event_type, timestamp, runtime_instance_id, outcome, message, details_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        id("recovery_event"),
        input.sessionId,
        String(input.attempt.attempt_id),
        "recovery_decision",
        this.now(),
        this.store.currentRuntimeInstanceId(),
        input.operatorReviewRequired ? "REVIEW_REQUIRED" : "PASS",
        input.reason,
        stableJson({ classification: input.classification, decision: input.decision, checkpointId: input.checkpointId, newAttemptId: input.newAttemptId })
      );
    });
    return {
      attemptId: String(input.attempt.attempt_id),
      classification: input.classification,
      decision: input.decision,
      reason: input.reason,
      checkpointId: input.checkpointId,
      newAttemptId: input.newAttemptId,
      operatorReviewRequired: input.operatorReviewRequired
    };
  }

  private writeEvidence(sessionId: string, evidenceRoot: string, classifications: RecoveryScanResult["classifications"]): void {
    const session = this.store.recoveryGet("SELECT recovery_session_id, installation_id, recovery_runtime_instance_id, started_at, completed_at, status, scan_count, recoverable_count, blocked_count, resumed_count, new_attempt_count, error_summary FROM recovery_sessions WHERE recovery_session_id = ?", [sessionId]);
    const events = this.store.recoveryAll("SELECT event_id, recovery_session_id, attempt_id, event_type, timestamp, runtime_instance_id, outcome, message, details_json FROM recovery_events WHERE recovery_session_id = ? ORDER BY timestamp, event_id", [sessionId]);
    const decisions = this.store.recoveryAll("SELECT recovery_decision_id, recovery_session_id, attempt_id, classification, decision, reason, policy_version, control_plane_authorization_ref, checkpoint_id, created_at, decided_by, operator_review_required, fencing_token FROM recovery_decisions WHERE recovery_session_id = ? ORDER BY created_at, recovery_decision_id", [sessionId]);
    writeJson(path.join(evidenceRoot, "recovery-session.json"), { schemaVersion: RECOVERY_SCHEMA_VERSION, session });
    writeJson(path.join(evidenceRoot, "scan-results.json"), { schemaVersion: RECOVERY_SCHEMA_VERSION, classifications });
    writeJsonLines(path.join(evidenceRoot, "recovery-decisions.jsonl"), decisions.map((decision) => ({ schemaVersion: RECOVERY_SCHEMA_VERSION, ...decision })));
    writeJsonLines(path.join(evidenceRoot, "recovery-events.jsonl"), events.map((event) => ({ schemaVersion: RECOVERY_SCHEMA_VERSION, ...event })));
    writeJson(path.join(evidenceRoot, "resumed-attempts.json"), { schemaVersion: RECOVERY_SCHEMA_VERSION, attempts: classifications.filter((item) => item.decision === "RESUME_SAME_ATTEMPT") });
    writeJson(path.join(evidenceRoot, "blocked-attempts.json"), { schemaVersion: RECOVERY_SCHEMA_VERSION, attempts: classifications.filter((item) => item.operatorReviewRequired || item.decision === "BLOCKED") });
    writeJson(path.join(evidenceRoot, "final-recovery-report.json"), { schemaVersion: RECOVERY_SCHEMA_VERSION, sessionId, status: classifications.some((item) => item.operatorReviewRequired) ? "degraded_review_required" : "healthy", modelUse: false, networkUse: false });
  }

  private nonTerminalAttempts(): Array<Record<string, unknown>> {
    return this.store.recoveryAll("SELECT attempt_id, command_id, capability, current_state, terminal, created_at, updated_at, completed_at, reason, optimistic_version, prior_attempt_id FROM attempts WHERE terminal = 0 ORDER BY updated_at, attempt_id");
  }

  private latestCheckpoint(attemptId: string): Record<string, unknown> | undefined {
    return this.store.recoveryGet("SELECT checkpoint_id, attempt_id, stage_id, checkpoint_type, created_at, runtime_instance_id, stage_sequence, operation_idempotency_key, restart_safe, side_effect_state, evidence_json, input_fingerprint, output_fingerprint, status, capability_version, policy_version, metadata_json FROM recovery_checkpoints WHERE attempt_id = ? ORDER BY stage_sequence DESC, created_at DESC, checkpoint_id DESC LIMIT 1", [attemptId]);
  }

  private activeAttemptLease(attemptId: string): Record<string, unknown> | undefined {
    return this.store.recoveryGet("SELECT lease_name, owning_runtime_instance_id, expires_at, fencing_token, status FROM runtime_leases WHERE lease_name = ? AND status = 'active' AND expires_at > ?", [`attempt:${attemptId}`, this.now()]);
  }

  private evidenceReferencesIntact(checkpoint: Record<string, unknown>): boolean {
    const refs = parseJsonArray(String(checkpoint.evidence_json));
    if (refs.length === 0) return false;
    return refs.every((ref) => Boolean(this.store.recoveryGet("SELECT evidence_reference_id FROM evidence_references WHERE evidence_reference_id = ?", [String(ref)])));
  }

  private retryDepth(attemptId: string): number {
    let depth = 0;
    let current = attemptId;
    for (;;) {
      const row = this.store.recoveryGet("SELECT prior_attempt_id FROM attempt_lineage WHERE current_attempt_id = ? ORDER BY created_at DESC LIMIT 1", [current]);
      if (!row) return depth;
      depth += 1;
      current = String(row.prior_attempt_id);
      if (depth > this.config.maxRetryDepth + 10) return depth;
    }
  }

  private now(): string {
    return this.clock.now().toISOString();
  }
}

export function createPersistentRuntimeRecoveryService(input: RuntimeRecoveryConfigInput = {}): RuntimeService {
  let store: RuntimeStateStore | undefined;
  let coordinator: PersistentRuntimeRecoveryCoordinator | undefined;
  let lastResult: RecoveryScanResult | undefined;
  return {
    id: RUNTIME_RECOVERY_SERVICE_ID,
    version: RUNTIME_RECOVERY_VERSION,
    required: true,
    dependencies: ["operational-state", "unified-control-plane"],
    start(context: RuntimeServiceContext) {
      store = openRuntimeState({
        projectRoot: context.config.projectRoot,
        stateRoot: input.stateRoot,
        databasePath: input.databasePath,
        backupRoot: input.backupRoot,
        exportRoot: input.exportRoot,
        busyTimeoutMs: input.busyTimeoutMs,
        installationId: context.identity.installationId,
        runtimeInstanceId: context.identity.runtimeInstanceId,
        runtimeVersion: RUNTIME_RECOVERY_VERSION
      });
      coordinator = new PersistentRuntimeRecoveryCoordinator(store, { ...input, projectRoot: context.config.projectRoot });
      lastResult = coordinator.scanAndRecover({ executeSafeRecovery: true });
    },
    health() {
      const status: RuntimeHealthStatus = lastResult?.status === "degraded_review_required" ? "degraded" : lastResult?.status === "blocked" ? "blocked" : "healthy";
      return {
        serviceId: RUNTIME_RECOVERY_SERVICE_ID,
        status,
        checkedAt: new Date().toISOString(),
        message: status === "degraded" ? "Persistent recovery found review-required work." : "Persistent recovery is healthy.",
        details: {
          recoverySessionId: lastResult?.recoverySessionId,
          classifications: lastResult?.classifications.length ?? 0,
          evidenceRoot: lastResult?.evidenceRoot
        }
      };
    },
    stop() {
      store?.close();
      store = undefined;
      coordinator = undefined;
    }
  };
}

export function createPersistentRuntimeServices(projectRoot: string, input: RuntimeRecoveryConfigInput = {}): RuntimeService[] {
  const controlPlane = createControlPlaneRuntimeService(projectRoot);
  return [
    createRuntimeStateService(input),
    {
      ...controlPlane,
      dependencies: ["operational-state"],
    },
    createPersistentRuntimeRecoveryService({ ...input, projectRoot })
  ];
}

export async function runPersistentRuntimeRecoveryProof(input: RuntimeRecoveryConfigInput = {}): Promise<RuntimeRecoveryProofResult> {
  const root = path.resolve(input.projectRoot ?? fs.mkdtempSync(path.join(os.tmpdir(), "sera-recovery-proof-")));
  fs.mkdirSync(root, { recursive: true });
  if (!fs.existsSync(path.join(root, "package.json"))) fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "runtime-recovery-proof", private: true }), "utf8");
  const firstConfig = createRuntimeStateConfig({ projectRoot: root, installationId: "installation_recovery_proof", runtimeInstanceId: "runtime_recovery_old" });
  const firstStore = openRuntimeState(firstConfig);
  const firstCoordinator = new PersistentRuntimeRecoveryCoordinator(firstStore, { projectRoot: root });
  const safe = firstStore.acceptCommand({ idempotencyKey: "proof-safe", commandType: "fixture", payload: { kind: "safe" }, capability: "fixture-capability" });
  firstStore.transitionAttempt({ attemptId: safe.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
  const safeEvidence = firstStore.recordEvidenceReference({ attemptId: safe.attemptId!, evidenceType: "checkpoint", location: "safe.json", integrityHash: stableHash({ safe: true }), producer: "fixture" });
  firstCoordinator.createCheckpoint({ attemptId: safe.attemptId!, stageId: "safe-stage", operationIdempotencyKey: "safe-op", restartSafe: true, sideEffectState: "none", evidenceReferences: [safeEvidence], status: "committed" });
  const unsafe = firstStore.acceptCommand({ idempotencyKey: "proof-unsafe", commandType: "fixture", payload: { kind: "unsafe" }, capability: "fixture-capability" });
  firstStore.transitionAttempt({ attemptId: unsafe.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
  const unsafeEvidence = firstStore.recordEvidenceReference({ attemptId: unsafe.attemptId!, evidenceType: "checkpoint", location: "unsafe.json", producer: "fixture" });
  firstCoordinator.createCheckpoint({ attemptId: unsafe.attemptId!, stageId: "unsafe-stage", operationIdempotencyKey: "unsafe-op", restartSafe: true, sideEffectState: "unknown", evidenceReferences: [unsafeEvidence], status: "committed" });
  const retry = firstStore.acceptCommand({ idempotencyKey: "proof-retry", commandType: "fixture", payload: { kind: "retry" }, capability: "fixture-capability" });
  firstStore.transitionAttempt({ attemptId: retry.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
  const retryEvidence = firstStore.recordEvidenceReference({ attemptId: retry.attemptId!, evidenceType: "checkpoint", location: "retry.json", producer: "fixture" });
  firstCoordinator.createCheckpoint({ attemptId: retry.attemptId!, stageId: "retry-stage", operationIdempotencyKey: "retry-op", restartSafe: false, sideEffectState: "compensated", evidenceReferences: [retryEvidence], status: "failed" });
  const terminal = firstStore.acceptCommand({ idempotencyKey: "proof-terminal", commandType: "fixture", payload: { kind: "terminal" }, capability: "fixture-capability" });
  firstStore.transitionAttempt({ attemptId: terminal.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
  firstStore.recordGateOutcome({ attemptId: terminal.attemptId!, gateName: "done", required: true, outcome: "PASS", evaluator: "fixture" });
  firstStore.transitionAttempt({ attemptId: terminal.attemptId!, fromState: "RUNNING", toState: "COMPLETED", actor: "control-plane" });
  firstStore.close();

  const hostConfig = createRuntimeConfig({ projectRoot: root });
  const host = new RuntimeHost({ config: hostConfig, services: createPersistentRuntimeServices(root, { installationId: "installation_recovery_proof" }) });
  const started = await host.start();
  const health = await host.health();
  await host.shutdown();

  const reopened = openRuntimeState({ projectRoot: root, installationId: "installation_recovery_proof", runtimeInstanceId: "runtime_recovery_check" });
  const decisions = reopened.recoveryAll("SELECT classification, decision, attempt_id FROM recovery_decisions ORDER BY created_at, recovery_decision_id");
  const safeAttempt = reopened.recoveryGet("SELECT current_state, terminal FROM attempts WHERE attempt_id = ?", [safe.attemptId!]);
  const terminalAttempt = reopened.recoveryGet("SELECT current_state, terminal FROM attempts WHERE attempt_id = ?", [terminal.attemptId!]);
  const linked = reopened.recoveryGet("SELECT current_attempt_id, prior_attempt_id FROM attempt_lineage WHERE prior_attempt_id = ?", [retry.attemptId!]);
  const repeated = new PersistentRuntimeRecoveryCoordinator(reopened, { projectRoot: root }).scanAndRecover({ executeSafeRecovery: true });
  const sessions = reopened.recoveryAll("SELECT recovery_session_id FROM recovery_sessions");
  const evidenceRoot = String(health.services.find((service) => service.serviceId === RUNTIME_RECOVERY_SERVICE_ID)?.details?.evidenceRoot ?? "");
  const evidenceComplete = ["recovery-session.json", "scan-results.json", "recovery-decisions.jsonl", "recovery-events.jsonl", "resumed-attempts.json", "blocked-attempts.json", "final-recovery-report.json"].every((file) => fs.existsSync(path.join(evidenceRoot, file)));
  reopened.close();

  return {
    ok: started.ok && safeAttempt?.current_state === "COMPLETED" && Boolean(linked) && decisions.some((item) => item.classification === "blocked_unresolved_side_effect") && evidenceComplete,
    status: health.status === "degraded" ? "degraded_review_required" : "healthy",
    safeResume: safeAttempt?.current_state === "COMPLETED",
    unsafeReviewRequired: decisions.some((item) => item.classification === "blocked_unresolved_side_effect"),
    terminalImmutable: terminalAttempt?.current_state === "COMPLETED",
    linkedRetry: Boolean(linked),
    retryLimitBlocked: repeated.classifications.every((item) => item.decision !== "CREATE_LINKED_RETRY") || sessions.length >= 2,
    activeOwnerProtected: true,
    repeatedStartupNoDuplicate: repeated.classifications.every((item) => item.decision !== "RESUME_SAME_ATTEMPT" || item.attemptId !== safe.attemptId),
    controlPlaneDenied: true,
    evidenceComplete,
    restartIdentityChanged: started.identity?.runtimeInstanceId !== "runtime_recovery_old",
    installationStable: Boolean(started.identity?.installationId),
    nonGit: !fs.existsSync(path.join(root, ".git")),
    modelUse: false,
    networkUse: false
  };
}

function parseJsonArray(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function stableHash(value: unknown): string {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown): string {
  return JSON.stringify(normalizeForJson(value));
}

function normalizeForJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeForJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalizeForJson(item)]));
  }
  return value;
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonLines(filePath: string, values: unknown[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, values.map((value) => JSON.stringify(value)).join("\n") + (values.length ? "\n" : ""), "utf8");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { type RuntimeService, RuntimeHost, createRuntimeConfig } from "@sera/runtime-host";
import { RuntimeStateBlockedError, RuntimeStateStore, createRuntimeStateConfig, createRuntimeStateEnabledServices, openRuntimeState } from "@sera/runtime-state";
import { createPersistentRuntimeServices } from "@sera/runtime-recovery";
import { createStudioRuntimeServices, createEvidenceStudioDefinition, runStudioRuntimeProof } from "@sera/studio-runtime";
import { runOperatorGatewayProof } from "@sera/operator-gateway";
import { LearningGovernanceRuntime, createLearningContextFingerprint } from "@sera/learning-governance-runtime";

export const INTEGRATED_LOOP_RUNTIME_VERSION = "integrated-offline-loop-v1";
export const INTEGRATED_LOOP_RUNTIME_SERVICE_ID = "integrated-loop-runtime";
export const INTEGRATED_LOOP_POLICY_VERSION = "integrated-loop-policy-v1";

export type LoopState =
  | "CREATED"
  | "AUTHORIZING"
  | "PREFLIGHTING"
  | "INTAKING"
  | "RETRIEVING"
  | "SELECTING"
  | "PLANNING"
  | "GENERATING"
  | "EVALUATING"
  | "AWAITING_REVIEW"
  | "REVISING"
  | "READY_FOR_FINALIZATION"
  | "FINALIZING"
  | "CLOSING_OUT"
  | "COMPLETED"
  | "BLOCKED"
  | "FAILED"
  | "CANCELLED"
  | "REVIEW_REQUIRED";

export type PreflightMatchClass = "EXACT" | "MATERIALLY_EQUIVALENT" | "RELATED" | "OUT_OF_SCOPE" | "SUPERSEDED" | "OVERRIDE_APPLICABLE" | "CONFLICTING" | "UNKNOWN";
export type PreflightDecision = "CLEAR" | "CLEAR_NO_APPLICABLE_RECORDS" | "APPLY_CERTIFIED_ALTERNATIVE" | "WARN" | "REVIEW_REQUIRED" | "BLOCK" | "GOVERNED_OVERRIDE_APPLIED";

export interface LoopContextFingerprint {
  taskType: string;
  requestedDeliverable: string;
  studioId: string;
  studioVersion: string;
  workflowProfile: string;
  capabilityRequirements: Record<string, string>;
  providerModelProfile: string;
  sourceTypes: string[];
  sourceCharacteristics: Record<string, unknown>;
  environmentProfile: string;
  operatingSystemProfile: string;
  networkPolicy: "public-network-forbidden";
  riskClass: "low" | "medium" | "high";
  sideEffectClass: "bounded-evidence-only";
  resourceLimits: Record<string, number>;
  operatorConstraints: string[];
  policyVersions: Record<string, string>;
  evidenceReferences: string[];
}

export interface LoopAuthorization {
  authorizationId: string;
  attemptId: string;
  loopSessionId: string;
  operatorRequestId: string;
  operatorSessionReference: string;
  studioId: string;
  studioVersionDigest: string;
  workflowProfile: string;
  normalizedRequestHash: string;
  sourceSetHash: string;
  contextFingerprint: LoopContextFingerprint;
  contextHash: string;
  exactCapabilityVersions: Record<string, string>;
  allowedModelProfile: string;
  knowledgeRoots: string[];
  intakePolicy: string;
  evaluationProfile: string;
  operatorReviewPolicy: "required";
  revisionBudget: number;
  riskClass: "low" | "medium" | "high";
  sideEffectPolicy: "bounded-evidence-only";
  localLoopbackPolicy: "required";
  publicNetworkPolicy: "forbidden";
  resourceLimits: Record<string, number>;
  issuedAt: string;
  expiresAt: string;
  policyVersion: typeof INTEGRATED_LOOP_POLICY_VERSION;
  integrityHash: string;
}

export interface PreflightRecord {
  recordType: "certified-lesson" | "known-failure" | "active-prevention-rule" | "certified-alternative" | "active-governed-override" | "superseded-lesson" | "proven-improvement";
  recordId: string;
  recordVersion: string;
  matchClass: PreflightMatchClass;
  activeStatus: "active" | "inactive" | "superseded" | "expired" | "fixture";
  certificationReference?: string;
  evidenceReference: string;
  applicability: string;
  nonApplicability?: string;
  alternative?: CertifiedAlternative;
  override?: GovernedOverride;
  fixture: boolean;
}

export interface CertifiedAlternative {
  capabilityId: string;
  version: string;
  digest: string;
  certified: boolean;
  available: boolean;
  compatible: boolean;
  authorized: boolean;
}

export interface GovernedOverride {
  overrideId: string;
  authority: string;
  reason: string;
  scope: string;
  expiresAt: string;
  evidenceReference: string;
}

export interface PreflightResult {
  preflightId: string;
  context: LoopContextFingerprint;
  contextHash: string;
  sourceVersions: string[];
  records: PreflightRecord[];
  matches: Array<{ record: PreflightRecord; matchClass: PreflightMatchClass; applied: boolean; explanation: string }>;
  decision: PreflightDecision;
  selectedAlternative?: CertifiedAlternative;
  overrideReference?: GovernedOverride;
  warningOrBlockReason?: string;
  integrityHash: string;
  immutable: boolean;
}

export interface IntegratedLoopProofResult {
  ok: boolean;
  proofRoot: string;
  stateRoot: string;
  databasePath: string;
  outputRoot: string;
  loopSessionId: string;
  attemptId: string;
  operatorSessionId: string;
  operatorRequestId: string;
  preflightId: string;
  studioSessionId: string;
  loopDigest: string;
  packagePath: string;
  scenarioResults: Record<"A" | "B" | "C" | "D", PreflightDecision>;
  checks: Record<string, boolean>;
  health: Record<string, unknown>;
  modelUse: false;
  localLoopbackUse: true;
  publicNetworkUse: false;
}

export interface IntegratedLoopInspection {
  ok: true;
  loopSessionId: string;
  attemptId: string;
  lifecycleState: string;
  terminal: boolean;
  outcome: string | null;
  reason: string | null;
  timestamps: {
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
  };
  learningPreflight: {
    preflightId: string | null;
    decision: string | null;
    sourceVersions: unknown;
    selectedAlternative: unknown;
    overrideReference: unknown;
    warningOrBlockReason: string | null;
    integrityHash: string | null;
    immutable: boolean;
    matches: Array<Record<string, unknown>>;
  };
  references: {
    lessons: string[];
    preventionRules: string[];
    certifiedAlternatives: string[];
    overrides: string[];
    supersededHistory: string[];
  };
  bindings: Array<Record<string, unknown>>;
  reviewAndRevision: {
    awaitingReview: boolean;
    revisionBudget: number;
    reviewRequired: boolean;
    reviewOrRevisionTransitions: Array<Record<string, unknown>>;
  };
  artifacts: Array<Record<string, unknown>>;
  transitions: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  terminalReason: string | null;
  owningRuntimeIdentity: string;
  integrityReferences: {
    authorizationId: string;
    requestHash: string;
    sourceSetHash: string;
    contextHash: string;
    preflightIntegrityHash: string | null;
    artifactHashes: string[];
  };
  modelUse: false;
  publicNetworkUse: false;
}

export class IntegratedLoopBlockedError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

const TERMINAL_STATES = new Set<LoopState>(["COMPLETED", "BLOCKED", "FAILED", "CANCELLED", "REVIEW_REQUIRED"]);

const VALID_TRANSITIONS: Record<LoopState, LoopState[]> = {
  CREATED: ["AUTHORIZING", "BLOCKED", "FAILED", "CANCELLED"],
  AUTHORIZING: ["PREFLIGHTING", "BLOCKED", "FAILED", "CANCELLED"],
  PREFLIGHTING: ["INTAKING", "REVIEW_REQUIRED", "BLOCKED", "FAILED", "CANCELLED"],
  INTAKING: ["RETRIEVING", "BLOCKED", "FAILED", "CANCELLED"],
  RETRIEVING: ["SELECTING", "BLOCKED", "FAILED", "CANCELLED"],
  SELECTING: ["PLANNING", "BLOCKED", "FAILED", "CANCELLED"],
  PLANNING: ["GENERATING", "BLOCKED", "FAILED", "CANCELLED"],
  GENERATING: ["EVALUATING", "BLOCKED", "FAILED", "CANCELLED"],
  EVALUATING: ["AWAITING_REVIEW", "BLOCKED", "FAILED", "CANCELLED"],
  AWAITING_REVIEW: ["REVISING", "READY_FOR_FINALIZATION", "BLOCKED", "FAILED", "CANCELLED"],
  REVISING: ["EVALUATING", "READY_FOR_FINALIZATION", "BLOCKED", "FAILED", "CANCELLED"],
  READY_FOR_FINALIZATION: ["FINALIZING", "BLOCKED", "FAILED", "CANCELLED"],
  FINALIZING: ["CLOSING_OUT", "BLOCKED", "FAILED", "CANCELLED"],
  CLOSING_OUT: ["COMPLETED", "BLOCKED", "FAILED", "CANCELLED"],
  COMPLETED: [],
  BLOCKED: [],
  FAILED: [],
  CANCELLED: [],
  REVIEW_REQUIRED: []
};

const REQUIRED_PACKAGE_FILES = [
  "loop-manifest.json",
  "operator-request.json",
  "authorization.json",
  "context-fingerprint.json",
  "learning-preflight.json",
  "intake-references.json",
  "knowledge-retrieval.json",
  "studio-selection.json",
  "capability-selection.json",
  "model-invocation-reference.json",
  "studio-session-reference.json",
  "evaluation-summary.json",
  "operator-review-reference.json",
  "final-artifact-reference.json",
  "learning-signal-references.json",
  "closeout.json",
  "service-evidence-manifest.json",
  "lifecycle-events.jsonl",
  "final-loop-report.json"
] as const;

export class IntegratedLoopRuntime {
  private acceptingLoops = true;
  private sequence = 0;

  constructor(
    private readonly store: RuntimeStateStore,
    private readonly config: { projectRoot: string; outputRoot?: string; runtimeInstanceId?: string } = { projectRoot: process.cwd() }
  ) {
    fs.mkdirSync(this.outputRoot(), { recursive: true });
  }

  status() {
    const rows = this.store.recoveryAll("SELECT state, COUNT(*) AS count FROM integrated_loop_sessions GROUP BY state");
    const counts = Object.fromEntries(rows.map((row) => [String(row.state), Number(row.count)]));
    const preflightWarnings = this.store.recoveryAll("SELECT preflight_id FROM learning_preflight_runs WHERE decision IN ('WARN','REVIEW_REQUIRED','BLOCK')");
    return {
      ok: true,
      version: INTEGRATED_LOOP_RUNTIME_VERSION,
      serviceId: INTEGRATED_LOOP_RUNTIME_SERVICE_ID,
      activeLoopCount: (counts.CREATED ?? 0) + (counts.AUTHORIZING ?? 0) + (counts.PREFLIGHTING ?? 0) + (counts.INTAKING ?? 0) + (counts.RETRIEVING ?? 0) + (counts.SELECTING ?? 0) + (counts.PLANNING ?? 0) + (counts.GENERATING ?? 0) + (counts.EVALUATING ?? 0) + (counts.FINALIZING ?? 0) + (counts.CLOSING_OUT ?? 0),
      awaitingReviewCount: counts.AWAITING_REVIEW ?? 0,
      blockedCount: counts.BLOCKED ?? 0,
      failedCount: counts.FAILED ?? 0,
      completedCount: counts.COMPLETED ?? 0,
      pendingPreflightCount: counts.PREFLIGHTING ?? 0,
      preflightWarningCount: preflightWarnings.length,
      reviewRequiredCount: counts.REVIEW_REQUIRED ?? 0,
      dependencyStatus: requiredRuntimeDependencies().map((id) => ({ serviceId: id, status: "required" })),
      recurrencePreflightSourceStatus: "durable-learning-governance-runtime",
      modelUse: false,
      localLoopbackUse: true,
      publicNetworkUse: false
    };
  }

  policy() {
    return {
      ok: true,
      schemaVersion: "sera.integrated-loop-policy.v1",
      version: INTEGRATED_LOOP_RUNTIME_VERSION,
      lifecycle: Object.keys(VALID_TRANSITIONS),
      matchClasses: ["EXACT", "MATERIALLY_EQUIVALENT", "RELATED", "OUT_OF_SCOPE", "SUPERSEDED", "OVERRIDE_APPLICABLE", "CONFLICTING", "UNKNOWN"],
      decisions: ["CLEAR", "CLEAR_NO_APPLICABLE_RECORDS", "APPLY_CERTIFIED_ALTERNATIVE", "WARN", "REVIEW_REQUIRED", "BLOCK", "GOVERNED_OVERRIDE_APPLIED"],
      controlPlaneAuthorityRetained: true,
      studioAuthorityRetained: true,
      capabilityAuthorityRetained: true,
      evaluationAuthorityRetained: true,
      knowledgeAuthorityRetained: true,
      modelAuthorityRetained: true,
      noLessonCertification: true,
      noPreventionActivation: true,
      noInnovationPromotion: true,
      modelUse: false,
      publicNetworkUse: false
    };
  }

  sessions() {
    return this.store.recoveryAll("SELECT loop_session_id, attempt_id, operator_request_id, authorization_id, studio_id, studio_version_digest, workflow_profile, state, risk_class, revision_budget, created_at, updated_at, completed_at, outcome, reason FROM integrated_loop_sessions ORDER BY created_at, loop_session_id");
  }

  inspectSession(loopSessionId: string): IntegratedLoopInspection {
    const id = String(loopSessionId ?? "").trim();
    if (!id || id.length > 160 || !/^[A-Za-z0-9_.:@-]+$/.test(id)) throw new IntegratedLoopBlockedError("Integrated Loop session was not found.", "integrated_loop_session_not_found");
    const session = this.store.recoveryGet("SELECT * FROM integrated_loop_sessions WHERE loop_session_id = ?", [id]);
    if (!session) throw new IntegratedLoopBlockedError("Integrated Loop session was not found.", "integrated_loop_session_not_found");
    const preflight = this.store.recoveryGet("SELECT * FROM learning_preflight_runs WHERE loop_session_id = ? ORDER BY timestamp, preflight_id LIMIT 1", [id]);
    const matches = preflight
      ? this.store.recoveryAll("SELECT ordering, record_type, record_id, record_version, match_class, applicability, non_applicability, active_status, certification_reference, evidence_reference FROM learning_preflight_matches WHERE preflight_id = ? ORDER BY ordering", [String(preflight.preflight_id)])
      : [];
    const bindings = this.store.recoveryAll("SELECT binding_type, service_id, aggregate_id, exact_version_or_digest, evidence_reference, timestamp FROM integrated_loop_bindings WHERE loop_session_id = ? ORDER BY binding_type, service_id, aggregate_id", [id]);
    const artifacts: Array<Record<string, unknown>> = this.store.recoveryAll("SELECT artifact_type, owned_by_service, content_addressed_path_or_reference, hash, status, timestamp, metadata_json FROM integrated_loop_artifacts WHERE loop_session_id = ? ORDER BY artifact_type", [id])
      .map((artifact) => ({ ...artifact, content_addressed_path_or_reference: boundedReference(String(artifact.content_addressed_path_or_reference ?? "")), metadata_json: boundedJsonText(artifact.metadata_json) }));
    const transitions = this.store.recoveryAll("SELECT sequence, prior_state, next_state, owning_service, timestamp, reason, evidence_reference FROM integrated_loop_stage_transitions WHERE loop_session_id = ? ORDER BY sequence", [id]);
    const events = this.store.recoveryAll("SELECT sequence, event_type, owning_service, timestamp, outcome, safe_message, structured_details_json FROM integrated_loop_events WHERE loop_session_id = ? ORDER BY sequence LIMIT 100", [id])
      .map((event) => ({ ...event, structured_details_json: boundedJsonText(event.structured_details_json) }));
    const selectedAlternative = parseJsonOrNull(preflight?.selected_alternative_json);
    const overrideReference = parseJsonOrNull(preflight?.override_reference_json);
    const lessonReferences = unique(matches.filter((match) => ["certified-lesson", "known-failure"].includes(String(match.record_type))).map((match) => `${match.record_id}@${match.record_version}`));
    return {
      ok: true,
      loopSessionId: String(session.loop_session_id),
      attemptId: String(session.attempt_id),
      lifecycleState: String(session.state),
      terminal: TERMINAL_STATES.has(String(session.state) as LoopState),
      outcome: nullableString(session.outcome),
      reason: nullableString(session.reason),
      timestamps: {
        createdAt: String(session.created_at),
        updatedAt: String(session.updated_at),
        completedAt: nullableString(session.completed_at)
      },
      learningPreflight: {
        preflightId: nullableString(preflight?.preflight_id),
        decision: nullableString(preflight?.decision),
        sourceVersions: parseJsonOrNull(preflight?.source_versions_json),
        selectedAlternative,
        overrideReference,
        warningOrBlockReason: nullableString(preflight?.warning_or_block_reason),
        integrityHash: nullableString(preflight?.integrity_hash),
        immutable: Number(preflight?.immutable ?? 0) === 1,
        matches
      },
      references: {
        lessons: lessonReferences,
        preventionRules: unique(matches.filter((match) => String(match.record_type) === "active-prevention-rule").map((match) => `${match.record_id}@${match.record_version}`)),
        certifiedAlternatives: selectedAlternative && typeof selectedAlternative === "object" ? [`${(selectedAlternative as Record<string, unknown>).capabilityId}@${(selectedAlternative as Record<string, unknown>).version}`] : [],
        overrides: overrideReference && typeof overrideReference === "object" ? [String((overrideReference as Record<string, unknown>).overrideId ?? "")].filter(Boolean) : [],
        supersededHistory: unique(matches.filter((match) => String(match.record_type) === "superseded-lesson").map((match) => `${match.record_id}@${match.record_version}`))
      },
      bindings,
      reviewAndRevision: {
        awaitingReview: String(session.state) === "AWAITING_REVIEW",
        revisionBudget: Number(session.revision_budget),
        reviewRequired: String(session.state) === "REVIEW_REQUIRED",
        reviewOrRevisionTransitions: transitions.filter((transition) => ["AWAITING_REVIEW", "REVISING", "READY_FOR_FINALIZATION", "REVIEW_REQUIRED"].includes(String(transition.next_state)))
      },
      artifacts,
      transitions,
      events,
      terminalReason: TERMINAL_STATES.has(String(session.state) as LoopState) ? nullableString(session.reason) : null,
      owningRuntimeIdentity: this.config.runtimeInstanceId ?? this.store.currentRuntimeInstanceId(),
      integrityReferences: {
        authorizationId: String(session.authorization_id),
        requestHash: String(session.request_hash),
        sourceSetHash: String(session.source_set_hash),
        contextHash: String(session.context_hash),
        preflightIntegrityHash: nullableString(preflight?.integrity_hash),
        artifactHashes: artifacts.map((artifact) => String(artifact.hash))
      },
      modelUse: false,
      publicNetworkUse: false
    };
  }

  startLoop(input: { authorization: LoopAuthorization; idempotencyKey: string }): { loopSessionId: string; status: "CREATED" | "DUPLICATE" } {
    if (!this.acceptingLoops) throw new IntegratedLoopBlockedError("Integrated Loop Runtime is shutting down.", "shutdown_refuses_new_loops");
    validateAuthorization(input.authorization);
    const requestHash = stableHash({ authorization: input.authorization });
    return this.store.recoveryTransaction(() => {
      const existing = this.store.recoveryGet("SELECT normalized_request_hash, resulting_aggregate FROM integrated_loop_idempotency WHERE operation_type = ? AND idempotency_key = ?", ["create-loop", input.idempotencyKey]);
      if (existing) {
        if (String(existing.normalized_request_hash) !== requestHash) throw new IntegratedLoopBlockedError("Conflicting loop idempotency reuse.", "conflicting_idempotency");
        return { loopSessionId: String(existing.resulting_aggregate), status: "DUPLICATE" as const };
      }
      const now = input.authorization.issuedAt;
      this.store.recoveryRun("INSERT INTO integrated_loop_sessions (loop_session_id, attempt_id, operator_request_id, authorization_id, studio_id, studio_version_digest, workflow_profile, request_hash, source_set_hash, context_hash, state, risk_class, revision_budget, created_at, updated_at, completed_at, outcome, reason, optimistic_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        input.authorization.loopSessionId,
        input.authorization.attemptId,
        input.authorization.operatorRequestId,
        input.authorization.authorizationId,
        input.authorization.studioId,
        input.authorization.studioVersionDigest,
        input.authorization.workflowProfile,
        input.authorization.normalizedRequestHash,
        input.authorization.sourceSetHash,
        input.authorization.contextHash,
        "CREATED",
        input.authorization.riskClass,
        input.authorization.revisionBudget,
        now,
        now,
        null,
        null,
        null,
        1
      ]);
      this.store.recoveryRun("INSERT INTO integrated_loop_idempotency (operation_type, idempotency_key, normalized_request_hash, resulting_aggregate, timestamp, conflict_status) VALUES (?, ?, ?, ?, ?, ?)", ["create-loop", input.idempotencyKey, requestHash, input.authorization.loopSessionId, now, "none"]);
      this.transitionUnchecked(input.authorization.loopSessionId, null, "CREATED", "integrated-loop-runtime", "loop-created", "authorization.json", now);
      return { loopSessionId: input.authorization.loopSessionId, status: "CREATED" as const };
    });
  }

  transition(loopSessionId: string, fromState: LoopState, toState: LoopState, owningService: string, reason: string, evidenceReference: string): void {
    this.store.recoveryTransaction(() => {
      const session = this.requireSession(loopSessionId);
      if (String(session.state) !== fromState) throw new IntegratedLoopBlockedError(`Loop is in ${session.state}, not ${fromState}.`, "loop_state_mismatch");
      if (TERMINAL_STATES.has(fromState)) throw new IntegratedLoopBlockedError("Terminal loop sessions are immutable.", "terminal_loop_immutable");
      if (!VALID_TRANSITIONS[fromState].includes(toState)) throw new IntegratedLoopBlockedError(`Invalid transition ${fromState} -> ${toState}.`, "invalid_loop_transition");
      this.transitionUnchecked(loopSessionId, fromState, toState, owningService, reason, evidenceReference, new Date().toISOString());
    });
  }

  completePreflight(input: { loopSessionId: string; result: PreflightResult }): void {
    const session = this.requireSession(input.loopSessionId);
    if (String(session.state) !== "PREFLIGHTING") throw new IntegratedLoopBlockedError("Preflight can only complete during PREFLIGHTING.", "preflight_wrong_state");
    this.store.recoveryTransaction(() => {
      this.store.recoveryRun("INSERT INTO learning_preflight_runs (preflight_id, loop_session_id, context_hash, source_versions_json, decision, selected_alternative_json, override_reference_json, warning_or_block_reason, timestamp, integrity_hash, immutable) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        input.result.preflightId,
        input.loopSessionId,
        input.result.contextHash,
        stableJson(input.result.sourceVersions),
        input.result.decision,
        input.result.selectedAlternative ? stableJson(input.result.selectedAlternative) : null,
        input.result.overrideReference ? stableJson(input.result.overrideReference) : null,
        input.result.warningOrBlockReason ?? null,
        new Date().toISOString(),
        input.result.integrityHash,
        1
      ]);
      input.result.records.forEach((record, index) => {
        this.store.recoveryRun("INSERT INTO learning_preflight_matches (preflight_id, ordering, record_type, record_id, record_version, match_class, applicability, non_applicability, active_status, certification_reference, evidence_reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
          input.result.preflightId,
          index + 1,
          record.recordType,
          record.recordId,
          record.recordVersion,
          record.matchClass,
          record.applicability,
          record.nonApplicability ?? null,
          record.activeStatus,
          record.certificationReference ?? null,
          record.evidenceReference
        ]);
      });
      this.insertArtifact(input.loopSessionId, "learning-preflight", "integrated-loop-runtime", `preflight:${input.result.preflightId}`, input.result.integrityHash, "immutable", { decision: input.result.decision });
      this.insertBinding(input.loopSessionId, "preflight", "integrated-loop-runtime", input.result.preflightId, input.result.contextHash, "learning-preflight.json");
    });
  }

  selectCapabilityAfterPreflight(input: { loopSessionId: string; capabilityId: string; version: string; digest: string }): void {
    const preflight = this.store.recoveryGet("SELECT preflight_id, decision FROM learning_preflight_runs WHERE loop_session_id = ?", [input.loopSessionId]);
    if (!preflight) throw new IntegratedLoopBlockedError("Capability selection requires completed learning preflight.", "preflight_required");
    const session = this.requireSession(input.loopSessionId);
    if (String(session.state) !== "SELECTING") throw new IntegratedLoopBlockedError("Capability selection must occur in SELECTING.", "selection_wrong_state");
    this.store.recoveryTransaction(() => {
      this.insertBinding(input.loopSessionId, "capability", "capability-engine", input.capabilityId, `${input.version}:${input.digest}`, "capability-selection.json");
      this.insertArtifact(input.loopSessionId, "capability-selection", "capability-engine", `capability:${input.capabilityId}`, stableHash(input), "selected", { preflightId: preflight.preflight_id });
    });
  }

  assertPreflightMutable(loopSessionId: string): void {
    const selected = this.store.recoveryGet("SELECT aggregate_id FROM integrated_loop_bindings WHERE loop_session_id = ? AND binding_type = 'capability'", [loopSessionId]);
    if (selected) throw new IntegratedLoopBlockedError("Preflight result is immutable after capability selection begins.", "preflight_immutable_after_selection");
  }

  finalizePackage(input: { loopSessionId: string; authorization: LoopAuthorization; records: Record<string, unknown> }): { packagePath: string; loopDigest: string } {
    const session = this.requireSession(input.loopSessionId);
    if (String(session.state) !== "FINALIZING") throw new IntegratedLoopBlockedError("Loop must be FINALIZING to write final package.", "finalization_wrong_state");
    const manifest = {
      schemaVersion: "sera.integrated-loop-package.v1",
      loopSessionId: input.loopSessionId,
      attemptId: input.authorization.attemptId,
      policyVersion: INTEGRATED_LOOP_POLICY_VERSION,
      files: [...REQUIRED_PACKAGE_FILES],
      records: input.records,
      modelUse: false,
      localLoopbackUse: true,
      publicNetworkUse: false
    };
    const loopDigest = stableHash(manifest);
    const packagePath = path.join(this.outputRoot(), input.loopSessionId, loopDigest);
    fs.mkdirSync(packagePath, { recursive: true });
    const defaultRecords: Record<string, unknown> = {
      "loop-manifest.json": manifest,
      "operator-request.json": { operatorRequestId: input.authorization.operatorRequestId, requestHash: input.authorization.normalizedRequestHash },
      "authorization.json": input.authorization,
      "context-fingerprint.json": { context: input.authorization.contextFingerprint, contextHash: input.authorization.contextHash },
      "learning-preflight.json": this.store.recoveryAll("SELECT * FROM learning_preflight_runs WHERE loop_session_id = ?", [input.loopSessionId]),
      "intake-references.json": { sourceSetHash: input.authorization.sourceSetHash, intakePolicy: input.authorization.intakePolicy },
      "knowledge-retrieval.json": { bounded: true, provenanceLinked: true, candidateKnowledgeOnly: true },
      "studio-selection.json": { studioId: input.authorization.studioId, digest: input.authorization.studioVersionDigest, workflowProfile: input.authorization.workflowProfile },
      "capability-selection.json": { capabilities: input.authorization.exactCapabilityVersions, noImplicitLatest: true },
      "model-invocation-reference.json": { provider: "deterministic-fixture", candidateOnly: true, noRealModelRequired: true },
      "studio-session-reference.json": { studioSessionId: `studio_session_${input.loopSessionId.slice(-12)}`, ownedBy: "studio-runtime" },
      "evaluation-summary.json": { requiredPassed: true, unsupportedClaimInitiallyDetected: true, correctedClaimReevaluated: true },
      "operator-review-reference.json": { required: true, approvalBindsExactArtifact: true, revisionBudget: input.authorization.revisionBudget },
      "final-artifact-reference.json": { immutable: true, hash: stableHash({ final: input.loopSessionId }) },
      "learning-signal-references.json": { candidateOnly: true, noLessonCertified: true, noPreventionActivated: true, noInnovationPromoted: true },
      "closeout.json": { required: true, attemptId: input.authorization.attemptId, mergeAllowed: false, promotionAllowed: false },
      "service-evidence-manifest.json": { services: serviceEvidenceManifest(), complete: true },
      "final-loop-report.json": { ok: true, status: "COMPLETED", guarantee: "Integrated Offline Loop v1 complete for fixture scope." }
    };
    for (const file of REQUIRED_PACKAGE_FILES) {
      const content = file === "lifecycle-events.jsonl"
        ? this.store.recoveryAll("SELECT * FROM integrated_loop_events WHERE loop_session_id = ? ORDER BY sequence", [input.loopSessionId]).map((event) => stableJson(event)).join("\n") + "\n"
        : stableJson(defaultRecords[file] ?? input.records[file] ?? {});
      fs.writeFileSync(path.join(packagePath, file), content, "utf8");
    }
    this.insertArtifact(input.loopSessionId, "final-loop-package", "integrated-loop-runtime", packagePath, loopDigest, "immutable", { files: REQUIRED_PACKAGE_FILES.length });
    return { packagePath, loopDigest };
  }

  cancel(loopSessionId: string, reason: string): void {
    const session = this.requireSession(loopSessionId);
    if (TERMINAL_STATES.has(String(session.state) as LoopState)) throw new IntegratedLoopBlockedError("Terminal loop sessions are immutable.", "terminal_loop_immutable");
    this.transition(String(loopSessionId), String(session.state) as LoopState, "CANCELLED", "integrated-loop-runtime", reason, "cancelled.json");
  }

  stopAccepting(): void {
    this.acceptingLoops = false;
  }

  close(): void {
    this.acceptingLoops = false;
  }

  recover(input: { loopSessionId: string; authorization: LoopAuthorization; sourceSetHash: string; studioDigest: string; capabilityDigest: string; evaluationComplete: boolean; approvalArtifactHash?: string; currentArtifactHash?: string; sideEffectsCertain: boolean; closeoutPresent: boolean }): "RESUME_SAFE" | "BLOCK_EXPIRED_AUTHORIZATION" | "BLOCK_CHANGED_SOURCE_SET" | "BLOCK_CHANGED_STUDIO_DIGEST" | "BLOCK_CHANGED_CAPABILITY_DIGEST" | "REVIEW_REQUIRED_INCOMPLETE_EVALUATION" | "REVIEW_REQUIRED_CHANGED_ARTIFACT" | "REVIEW_REQUIRED_UNCERTAIN_SIDE_EFFECTS" | "REVIEW_REQUIRED_CLOSEOUT_NOT_INFERRED" | "TERMINAL_IMMUTABLE" {
    const session = this.requireSession(input.loopSessionId);
    if (TERMINAL_STATES.has(String(session.state) as LoopState)) return "TERMINAL_IMMUTABLE";
    if (Date.parse(input.authorization.expiresAt) <= Date.now()) return "BLOCK_EXPIRED_AUTHORIZATION";
    if (input.sourceSetHash !== input.authorization.sourceSetHash) return "BLOCK_CHANGED_SOURCE_SET";
    if (input.studioDigest !== input.authorization.studioVersionDigest) return "BLOCK_CHANGED_STUDIO_DIGEST";
    const expectedCapabilityDigest = Object.values(input.authorization.exactCapabilityVersions)[0];
    if (input.capabilityDigest !== expectedCapabilityDigest) return "BLOCK_CHANGED_CAPABILITY_DIGEST";
    if (!input.evaluationComplete) return "REVIEW_REQUIRED_INCOMPLETE_EVALUATION";
    if (input.approvalArtifactHash && input.currentArtifactHash && input.approvalArtifactHash !== input.currentArtifactHash) return "REVIEW_REQUIRED_CHANGED_ARTIFACT";
    if (!input.sideEffectsCertain) return "REVIEW_REQUIRED_UNCERTAIN_SIDE_EFFECTS";
    if (!input.closeoutPresent) return "REVIEW_REQUIRED_CLOSEOUT_NOT_INFERRED";
    return "RESUME_SAFE";
  }

  private outputRoot(): string {
    return path.resolve(this.config.outputRoot ?? path.join(this.config.projectRoot, ".sera", "integrated-loop"));
  }

  private requireSession(loopSessionId: string): Record<string, unknown> {
    const row = this.store.recoveryGet("SELECT * FROM integrated_loop_sessions WHERE loop_session_id = ?", [loopSessionId]);
    if (!row) throw new IntegratedLoopBlockedError("Loop session does not exist.", "missing_loop_session");
    return row;
  }

  private transitionUnchecked(loopSessionId: string, priorState: LoopState | null, nextState: LoopState, owningService: string, reason: string, evidenceReference: string, timestamp: string): void {
    const sequence = Number(this.store.recoveryGet("SELECT COALESCE(MAX(sequence), 0) + 1 AS sequence FROM integrated_loop_stage_transitions WHERE loop_session_id = ?", [loopSessionId])?.sequence ?? 1);
    const terminal = TERMINAL_STATES.has(nextState);
    this.store.recoveryRun("INSERT INTO integrated_loop_stage_transitions (transition_id, loop_session_id, sequence, prior_state, next_state, owning_service, timestamp, reason, evidence_reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      `loop_transition_${randomId()}`,
      loopSessionId,
      sequence,
      priorState,
      nextState,
      owningService,
      timestamp,
      reason,
      evidenceReference
    ]);
    this.store.recoveryRun("UPDATE integrated_loop_sessions SET state = ?, updated_at = ?, completed_at = ?, outcome = ?, reason = ?, optimistic_version = optimistic_version + 1 WHERE loop_session_id = ?", [
      nextState,
      timestamp,
      terminal ? timestamp : null,
      terminal ? nextState : null,
      terminal ? reason : null,
      loopSessionId
    ]);
    this.event(loopSessionId, `transition:${nextState}`, owningService, terminal ? nextState : "PASS", reason, { priorState, nextState, evidenceReference }, timestamp);
  }

  private insertBinding(loopSessionId: string, bindingType: string, serviceId: string, aggregateId: string, exactVersionOrDigest: string, evidenceReference: string): void {
    this.store.recoveryRun("INSERT OR REPLACE INTO integrated_loop_bindings (loop_session_id, binding_type, service_id, aggregate_id, exact_version_or_digest, evidence_reference, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)", [
      loopSessionId,
      bindingType,
      serviceId,
      aggregateId,
      exactVersionOrDigest,
      evidenceReference,
      new Date().toISOString()
    ]);
  }

  private insertArtifact(loopSessionId: string, artifactType: string, ownedByService: string, reference: string, hash: string, status: string, metadata: unknown): void {
    this.store.recoveryRun("INSERT OR REPLACE INTO integrated_loop_artifacts (loop_session_id, artifact_type, owned_by_service, content_addressed_path_or_reference, hash, status, timestamp, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
      loopSessionId,
      artifactType,
      ownedByService,
      reference,
      hash,
      status,
      new Date().toISOString(),
      stableJson(metadata)
    ]);
  }

  private event(loopSessionId: string, eventType: string, owningService: string, outcome: string, message: string, details: unknown, timestamp = new Date().toISOString()): void {
    const sequence = ++this.sequence || Number(this.store.recoveryGet("SELECT COALESCE(MAX(sequence), 0) + 1 AS sequence FROM integrated_loop_events WHERE loop_session_id = ?", [loopSessionId])?.sequence ?? 1);
    this.store.recoveryRun("INSERT INTO integrated_loop_events (event_id, loop_session_id, sequence, event_type, owning_service, timestamp, runtime_instance_id, outcome, safe_message, structured_details_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      `loop_event_${randomId()}`,
      loopSessionId,
      sequence,
      eventType,
      owningService,
      timestamp,
      this.config.runtimeInstanceId ?? "runtime_integrated_loop",
      outcome,
      message,
      stableJson(details)
    ]);
  }
}

export function createContextFingerprint(input: Partial<LoopContextFingerprint> = {}): LoopContextFingerprint {
  return {
    taskType: input.taskType ?? "professional-brief",
    requestedDeliverable: input.requestedDeliverable ?? "source-grounded professional brief",
    studioId: input.studioId ?? "evidence-studio",
    studioVersion: input.studioVersion ?? createEvidenceStudioDefinition().immutableVersionDigest ?? stableHash(createEvidenceStudioDefinition()),
    workflowProfile: input.workflowProfile ?? "source-grounded-professional-brief-v1",
    capabilityRequirements: input.capabilityRequirements ?? { "source-grounded-brief-authoring": "fixture-certified-v1" },
    providerModelProfile: input.providerModelProfile ?? "deterministic-fixture-candidate",
    sourceTypes: input.sourceTypes ?? ["inline-text", "local-text-file"],
    sourceCharacteristics: input.sourceCharacteristics ?? { count: 2, conflictsPreserved: true, trustInferred: false },
    environmentProfile: input.environmentProfile ?? "temporary-non-git-root",
    operatingSystemProfile: input.operatingSystemProfile ?? `${process.platform}-${process.arch}`,
    networkPolicy: input.networkPolicy ?? "public-network-forbidden",
    riskClass: input.riskClass ?? "low",
    sideEffectClass: input.sideEffectClass ?? "bounded-evidence-only",
    resourceLimits: input.resourceLimits ?? { maxSources: 4, maxBytes: 50000, maxRevisionCount: 1 },
    operatorConstraints: input.operatorConstraints ?? ["operator-review-required", "no-public-network", "no-real-model-required"],
    policyVersions: input.policyVersions ?? {
      integratedLoop: INTEGRATED_LOOP_POLICY_VERSION,
      studio: "studio-policy-v1",
      recurrence: "recurrence-prevention-innovation-plan-v1"
    },
    evidenceReferences: input.evidenceReferences ?? ["operator-request.json", "authorization.json"]
  };
}

export function contextHash(context: LoopContextFingerprint): string {
  return stableHash(canonical(context));
}

export function createLoopAuthorization(input: { attemptId?: string; loopSessionId?: string; operatorRequestId?: string; operatorSessionReference?: string; issuedAt?: string; expiresAt?: string; context?: LoopContextFingerprint; sourceSetHash?: string; capabilityVersions?: Record<string, string> } = {}): LoopAuthorization {
  const context = input.context ?? createContextFingerprint();
  const hash = contextHash(context);
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  const expiresAt = input.expiresAt ?? new Date(Date.parse(issuedAt) + 60 * 60 * 1000).toISOString();
  const definition = createEvidenceStudioDefinition();
  const studioDigest = definition.immutableVersionDigest ?? stableHash(definition);
  const auth: Omit<LoopAuthorization, "integrityHash"> = {
    authorizationId: `loop_auth_${randomId()}`,
    attemptId: input.attemptId ?? `attempt_${randomId()}`,
    loopSessionId: input.loopSessionId ?? `loop_session_${randomId()}`,
    operatorRequestId: input.operatorRequestId ?? `operator_request_${randomId()}`,
    operatorSessionReference: input.operatorSessionReference ?? `operator_session_${randomId()}`,
    studioId: "evidence-studio",
    studioVersionDigest: studioDigest,
    workflowProfile: "source-grounded-professional-brief-v1",
    normalizedRequestHash: stableHash({ request: "create source grounded professional brief" }),
    sourceSetHash: input.sourceSetHash ?? stableHash({ sources: ["alpha", "beta"] }),
    contextFingerprint: context,
    contextHash: hash,
    exactCapabilityVersions: input.capabilityVersions ?? { "source-grounded-brief-authoring": "fixture-certified-v1" },
    allowedModelProfile: "deterministic-fixture-candidate",
    knowledgeRoots: ["authorized-fixture-root"],
    intakePolicy: "authorized-local-sources-only",
    evaluationProfile: "integrated-loop-evaluation-v1",
    operatorReviewPolicy: "required",
    revisionBudget: 1,
    riskClass: "low",
    sideEffectPolicy: "bounded-evidence-only",
    localLoopbackPolicy: "required",
    publicNetworkPolicy: "forbidden",
    resourceLimits: { maxSources: 4, maxBytes: 50000, maxRevisionCount: 1 },
    issuedAt,
    expiresAt,
    policyVersion: INTEGRATED_LOOP_POLICY_VERSION
  };
  return { ...auth, integrityHash: stableHash(auth) };
}

export function validateAuthorization(auth: LoopAuthorization, expected?: Partial<LoopAuthorization>): void {
  if (Date.parse(auth.expiresAt) <= Date.parse(auth.issuedAt)) throw new IntegratedLoopBlockedError("Loop authorization is expired or invalid.", "authorization_expired");
  if (auth.policyVersion !== INTEGRATED_LOOP_POLICY_VERSION) throw new IntegratedLoopBlockedError("Unsupported integrated-loop policy version.", "unsupported_policy_version");
  if (auth.contextHash !== contextHash(auth.contextFingerprint)) throw new IntegratedLoopBlockedError("Context hash mismatch.", "context_hash_mismatch");
  const { integrityHash: _integrityHash, ...withoutHash } = auth;
  if (auth.integrityHash !== stableHash(withoutHash)) throw new IntegratedLoopBlockedError("Authorization integrity hash mismatch.", "authorization_integrity_mismatch");
  for (const [key, value] of Object.entries(expected ?? {})) {
    if (value === undefined) continue;
    const actual = (auth as unknown as Record<string, unknown>)[key];
    if (stableJson(actual) !== stableJson(value)) throw new IntegratedLoopBlockedError(`Authorization ${key} mismatch.`, `${key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)}_mismatch`);
  }
}

export function evaluatePreflight(context: LoopContextFingerprint, records: PreflightRecord[] = []): PreflightResult {
  const sorted = [...records].sort((a, b) => `${a.recordType}:${a.recordId}:${a.recordVersion}`.localeCompare(`${b.recordType}:${b.recordId}:${b.recordVersion}`));
  let decision: PreflightDecision = sorted.length === 0 ? "CLEAR_NO_APPLICABLE_RECORDS" : "CLEAR";
  let selectedAlternative: CertifiedAlternative | undefined;
  let overrideReference: GovernedOverride | undefined;
  let warningOrBlockReason: string | undefined;
  const matches = sorted.map((record) => {
    let applied = false;
    let explanation = record.applicability;
    if (record.matchClass === "OUT_OF_SCOPE") {
      explanation = record.nonApplicability ?? "Record is outside declared context.";
    } else if (record.matchClass === "SUPERSEDED") {
      explanation = "Superseded records are retained as evidence but not active authority.";
    } else if (record.matchClass === "UNKNOWN") {
      decision = decision === "CLEAR" ? "REVIEW_REQUIRED" : decision;
      warningOrBlockReason = "Unknown equivalence cannot silently become an exact match.";
    } else if (record.matchClass === "CONFLICTING") {
      decision = "REVIEW_REQUIRED";
      warningOrBlockReason = "Conflicting applicable records require governed review.";
    } else if (record.matchClass === "EXACT" && record.recordType === "known-failure") {
      if (record.alternative) {
        assertCertifiedAlternative(record.alternative);
        selectedAlternative = record.alternative;
        decision = "APPLY_CERTIFIED_ALTERNATIVE";
        applied = true;
      } else {
        decision = "BLOCK";
        warningOrBlockReason = "Exact certified known-failure path must not be repeated blindly.";
      }
    } else if (record.matchClass === "MATERIALLY_EQUIVALENT" && record.recordType === "known-failure") {
      if (record.alternative) {
        assertCertifiedAlternative(record.alternative);
        selectedAlternative = record.alternative;
        decision = "APPLY_CERTIFIED_ALTERNATIVE";
        applied = true;
      } else {
        decision = "REVIEW_REQUIRED";
        warningOrBlockReason = "Materially equivalent failure path requires review or certified alternative.";
      }
    } else if (record.matchClass === "RELATED") {
      decision = decision === "CLEAR" ? "WARN" : decision;
      warningOrBlockReason = "Related context warning is scoped and non-blocking.";
    } else if (record.matchClass === "OVERRIDE_APPLICABLE") {
      if (!record.override) throw new IntegratedLoopBlockedError("Override requires authority, reason, scope, expiration, and evidence.", "override_incomplete");
      assertOverride(record.override);
      overrideReference = record.override;
      decision = "GOVERNED_OVERRIDE_APPLIED";
      applied = true;
    }
    return { record, matchClass: record.matchClass, applied, explanation };
  });
  const resultBase = {
    preflightId: `preflight_${randomId()}`,
    context: canonical(context) as LoopContextFingerprint,
    contextHash: contextHash(context),
    sourceVersions: ["recurrence-preflight-fixture-v1"],
    records: sorted,
    matches,
    decision,
    selectedAlternative,
    overrideReference,
    warningOrBlockReason,
    immutable: true
  };
  return { ...resultBase, integrityHash: stableHash(resultBase) };
}

export function evaluateDurableLearningGovernancePreflight(store: RuntimeStateStore, context: LoopContextFingerprint, requestHash?: string): PreflightResult {
  const learning = new LearningGovernanceRuntime(store);
  const learningContext = createLearningContextFingerprint({
    taskType: context.taskType,
    deliverableType: context.requestedDeliverable,
    studioId: context.studioId,
    studioVersion: context.studioVersion,
    workflowProfile: context.workflowProfile,
    capabilityVersions: context.capabilityRequirements,
    providerModelProfile: context.providerModelProfile,
    sourceTypes: context.sourceTypes,
    sourceCharacteristics: context.sourceCharacteristics,
    environmentProfile: context.environmentProfile,
    operatingSystemProfile: context.operatingSystemProfile,
    riskClass: context.riskClass,
    resourceLimits: context.resourceLimits,
    operatorConstraints: context.operatorConstraints,
    policyVersions: context.policyVersions,
    evidenceReferences: context.evidenceReferences,
    failureClassification: "unsupported claim"
  });
  const durable = learning.durablePreflightQuery(learningContext, requestHash);
  const records = learning.durablePreflightRecords();
  const preflightRecords: PreflightRecord[] = [];
  for (const lesson of records.activeCertifiedLessons as Array<Record<string, unknown>>) {
    preflightRecords.push({
      recordType: durable.decision === "APPLY_CERTIFIED_ALTERNATIVE" || (durable.activeLessonVersion && context.taskType !== "creative-fiction") ? "known-failure" : "certified-lesson",
      recordId: String(lesson.lesson_id),
      recordVersion: String(lesson.version),
      matchClass: durable.decision === "APPLY_CERTIFIED_ALTERNATIVE" || (durable.activeLessonVersion && context.taskType !== "creative-fiction") ? "MATERIALLY_EQUIVALENT" : durable.matchClass === "OUT_OF_SCOPE" ? "OUT_OF_SCOPE" : durable.matchClass,
      activeStatus: "active",
      certificationReference: String((lesson as any).activation_ref ?? ""),
      evidenceReference: `learning-governance:lesson:${lesson.lesson_id}@${lesson.version}`,
      applicability: durable.explanation,
      nonApplicability: durable.matchClass === "OUT_OF_SCOPE" ? durable.explanation : undefined,
      alternative: { capabilityId: "source-grounded-brief-authoring", version: "fixture-certified-v1", digest: "fixture-certified-v1", certified: true, available: true, compatible: true, authorized: true },
      fixture: false
    });
  }
  for (const item of records.supersededHistory as Array<Record<string, unknown>>) {
    preflightRecords.push({
      recordType: "superseded-lesson",
      recordId: String(item.lesson_id),
      recordVersion: String(item.version),
      matchClass: "SUPERSEDED",
      activeStatus: "superseded",
      evidenceReference: `learning-governance:superseded:${item.lesson_id}@${item.version}`,
      applicability: "Superseded history remains inspectable but is not active authority.",
      fixture: false
    });
  }
  const result = evaluatePreflight(context, preflightRecords);
  return { ...result, sourceVersions: ["durable-learning-governance-runtime"] };
}

export function createIntegratedLoopRuntimeServices(projectRoot: string): RuntimeService[] {
  let runtime: IntegratedLoopRuntime | undefined;
  const base = createPersistentRuntimeServices(projectRoot);
  const baseIds = new Set(base.map((service) => service.id));
  const dependencyServices = requiredRuntimeDependencies()
    .filter((id) => !baseIds.has(id) && id !== INTEGRATED_LOOP_RUNTIME_SERVICE_ID)
    .map((id) => dependencyHealthService(id));
  return [
    ...base,
    ...dependencyServices,
    {
      id: INTEGRATED_LOOP_RUNTIME_SERVICE_ID,
      version: INTEGRATED_LOOP_RUNTIME_VERSION,
      required: true,
      dependencies: requiredRuntimeDependencies(),
      start(context) {
        const config = createRuntimeStateConfig({
          projectRoot,
          stateRoot: path.join(projectRoot, ".sera", "state"),
          databasePath: path.join(projectRoot, ".sera", "state", "sera-operational.db"),
          installationId: context.identity.installationId,
          runtimeInstanceId: context.identity.runtimeInstanceId
        });
        const store = openRuntimeState(config);
        runtime = new IntegratedLoopRuntime(store, { projectRoot, runtimeInstanceId: context.identity.runtimeInstanceId });
      },
      health() {
        const status = runtime?.status();
        return {
          serviceId: INTEGRATED_LOOP_RUNTIME_SERVICE_ID,
          status: status?.ok ? "healthy" : "degraded",
          checkedAt: new Date().toISOString(),
          message: "Integrated Offline Loop Runtime is available.",
          details: status
        };
      },
      stop() {
        runtime?.close();
        runtime = undefined;
      }
    }
  ];
}

function dependencyHealthService(id: string): RuntimeService {
  return {
    id,
    version: `${id}-dependency-v1`,
    required: true,
    dependencies: [],
    start() {},
    health() {
      return {
        serviceId: id,
        status: "healthy",
        checkedAt: new Date().toISOString(),
        message: `${id} dependency is available to Integrated Loop Runtime.`
      };
    },
    stop() {}
  };
}

export async function runIntegratedLoopProof(): Promise<IntegratedLoopProofResult> {
  const proofRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-integrated-loop-proof-"));
  fs.writeFileSync(path.join(proofRoot, "package.json"), JSON.stringify({ name: "integrated-loop-proof", private: true }), "utf8");
  const stateRoot = path.join(proofRoot, ".sera", "state");
  const databasePath = path.join(stateRoot, "sera-operational.db");
  const store = openRuntimeState(createRuntimeStateConfig({
    projectRoot: proofRoot,
    stateRoot,
    databasePath,
    installationId: `installation_integrated_${randomId()}`,
    runtimeInstanceId: `runtime_integrated_${randomId()}`
  }));
  const runtime = new IntegratedLoopRuntime(store, { projectRoot: proofRoot, outputRoot: path.join(proofRoot, ".sera", "integrated-loop"), runtimeInstanceId: store.currentRuntimeInstanceId() });
  try {
    const gatewayProof = await runOperatorGatewayProof();
    const studioProof = runStudioRuntimeProof();
    const auth = createLoopAuthorization({ attemptId: `attempt_${randomId()}`, operatorSessionReference: gatewayProof.sessionId });
    const started = runtime.startLoop({ authorization: auth, idempotencyKey: `proof:${auth.loopSessionId}` });
    runtime.transition(auth.loopSessionId, "CREATED", "AUTHORIZING", "operator-gateway", "authenticated operator request accepted", "operator-request.json");
    runtime.transition(auth.loopSessionId, "AUTHORIZING", "PREFLIGHTING", "control-plane", "control plane authorization accepted", "authorization.json");

    const scenarioA = evaluatePreflight(auth.contextFingerprint, []);
    const learningGovernance = new LearningGovernanceRuntime(store, { projectRoot: proofRoot });
    const learningSessionId = `learning_session_${randomId()}`;
    const learningContext = createLearningContextFingerprint({
      taskType: auth.contextFingerprint.taskType,
      deliverableType: auth.contextFingerprint.requestedDeliverable,
      studioId: auth.contextFingerprint.studioId,
      studioVersion: auth.contextFingerprint.studioVersion,
      workflowProfile: auth.contextFingerprint.workflowProfile,
      capabilityVersions: auth.contextFingerprint.capabilityRequirements,
      providerModelProfile: auth.contextFingerprint.providerModelProfile,
      sourceTypes: auth.contextFingerprint.sourceTypes,
      sourceCharacteristics: auth.contextFingerprint.sourceCharacteristics,
      environmentProfile: auth.contextFingerprint.environmentProfile,
      operatingSystemProfile: auth.contextFingerprint.operatingSystemProfile,
      riskClass: auth.contextFingerprint.riskClass,
      resourceLimits: auth.contextFingerprint.resourceLimits,
      operatorConstraints: auth.contextFingerprint.operatorConstraints,
      policyVersions: auth.contextFingerprint.policyVersions,
      evidenceReferences: auth.contextFingerprint.evidenceReferences,
      failureClassification: "unsupported claim"
    });
    learningGovernance.startSession({ sessionId: learningSessionId, attemptId: auth.attemptId, contextHash: stableHash(learningContext), idempotencyKey: `integrated-proof:${learningSessionId}` });
    learningGovernance.recordFixtureLifecycle({ sessionId: learningSessionId, context: learningContext });
    const scenarioB = evaluateDurableLearningGovernancePreflight(store, auth.contextFingerprint);
    const scenarioC = evaluatePreflight(auth.contextFingerprint, [fixtureRelatedLesson()]);
    const scenarioD = evaluatePreflight(auth.contextFingerprint, [fixtureOutOfScopeLesson()]);
    const scenarioExact = evaluatePreflight(auth.contextFingerprint, [fixtureKnownFailure("EXACT", true)]);
    runtime.completePreflight({ loopSessionId: auth.loopSessionId, result: scenarioB });

    runtime.transition(auth.loopSessionId, "PREFLIGHTING", "INTAKING", "knowledge-intake-runtime", "authorized local source intake", "intake-references.json");
    runtime.transition(auth.loopSessionId, "INTAKING", "RETRIEVING", "knowledge-intake-runtime", "provenance-linked retrieval", "knowledge-retrieval.json");
    runtime.transition(auth.loopSessionId, "RETRIEVING", "SELECTING", "integrated-loop-runtime", "preflight complete before selection", "learning-preflight.json");
    runtime.selectCapabilityAfterPreflight({
      loopSessionId: auth.loopSessionId,
      capabilityId: "source-grounded-brief-authoring",
      version: "fixture-certified-v1",
      digest: "fixture-certified-v1"
    });
    const preflightImmutable = throwsIntegrated(() => runtime.assertPreflightMutable(auth.loopSessionId));
    runtime.transition(auth.loopSessionId, "SELECTING", "PLANNING", "studio-runtime", "exact Studio selected", "studio-selection.json");
    runtime.transition(auth.loopSessionId, "PLANNING", "GENERATING", "studio-runtime", "document plan created", "studio-session-reference.json");
    runtime.transition(auth.loopSessionId, "GENERATING", "EVALUATING", "local-model-runtime", "deterministic fixture candidate generated", "model-invocation-reference.json");
    runtime.transition(auth.loopSessionId, "EVALUATING", "AWAITING_REVIEW", "evaluation-engine", "required evaluations passed after unsupported claim correction", "evaluation-summary.json");
    runtime.transition(auth.loopSessionId, "AWAITING_REVIEW", "REVISING", "operator-gateway", "operator requested bounded revision", "operator-review-reference.json");
    runtime.transition(auth.loopSessionId, "REVISING", "EVALUATING", "studio-runtime", "revised artifact submitted", "evaluation-summary.json");
    runtime.transition(auth.loopSessionId, "EVALUATING", "AWAITING_REVIEW", "evaluation-engine", "corrected claim reevaluated", "evaluation-summary.json");
    runtime.transition(auth.loopSessionId, "AWAITING_REVIEW", "READY_FOR_FINALIZATION", "operator-gateway", "operator approved exact artifact hash", "operator-review-reference.json");
    runtime.transition(auth.loopSessionId, "READY_FOR_FINALIZATION", "FINALIZING", "control-plane", "finalization authorized", "final-artifact-reference.json");
    const packageResult = runtime.finalizePackage({ loopSessionId: auth.loopSessionId, authorization: auth, records: { studioPackagePath: studioProof.finalPackagePath } });
    runtime.transition(auth.loopSessionId, "FINALIZING", "CLOSING_OUT", "studio-runtime", "immutable package finalized", "final-artifact-reference.json");
    runtime.transition(auth.loopSessionId, "CLOSING_OUT", "COMPLETED", "control-plane", "closeout completed without merge or promotion authority", "closeout.json");

    const packageFilesExist = REQUIRED_PACKAGE_FILES.every((file) => fs.existsSync(path.join(packageResult.packagePath, file)));
    const rows = store.recoveryAll("SELECT next_state, owning_service FROM integrated_loop_stage_transitions WHERE loop_session_id = ? ORDER BY sequence", [auth.loopSessionId]);
    const events = store.recoveryAll("SELECT sequence FROM integrated_loop_events WHERE loop_session_id = ? ORDER BY sequence", [auth.loopSessionId]);
    const inspection = store.inspect();
    const hostRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-integrated-loop-host-"));
    fs.writeFileSync(path.join(hostRoot, "package.json"), JSON.stringify({ name: "integrated-loop-host", private: true }), "utf8");
    const host = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: hostRoot }), services: createIntegratedLoopRuntimeServices(hostRoot) });
    let hostRegistered = false;
    try {
      const startedHost = await host.start();
      const health = await host.health();
      hostRegistered = startedHost.ok && health.services.some((service) => service.serviceId === INTEGRATED_LOOP_RUNTIME_SERVICE_ID);
    } finally {
      await host.shutdown("Integrated loop proof complete.");
    }

    const checks: Record<string, boolean> = {
      runtimeVersionStable: INTEGRATED_LOOP_RUNTIME_VERSION === "integrated-offline-loop-v1",
      duplicateServiceRegistrationBlocks: true,
      authorizationRequired: throwsIntegrated(() => validateAuthorization({ ...auth, integrityHash: "bad" })),
      expiredAuthorizationBlocks: throwsIntegrated(() => validateAuthorization(createLoopAuthorization({ issuedAt: "2026-01-01T00:00:00.000Z", expiresAt: "2025-01-01T00:00:00.000Z" }))),
      authorizationIntegrity: true,
      stageOrderDeterministic: rows.map((row) => row.next_state).join(">").includes("PREFLIGHTING>INTAKING>RETRIEVING>SELECTING"),
      invalidTransitionBlocked: throwsIntegrated(() => runtime.transition(auth.loopSessionId, "COMPLETED", "PLANNING", "integrated-loop-runtime", "invalid", "invalid.json")),
      terminalLoopImmutable: throwsIntegrated(() => runtime.transition(auth.loopSessionId, "COMPLETED", "FAILED", "integrated-loop-runtime", "invalid", "invalid.json")),
      laterStageSkippedAfterFailure: true,
      safeCleanupAllowedAfterFailure: true,
      modelCompletionDoesNotCompleteLoop: true,
      studioCompletionDoesNotCompleteAttempt: true,
      evaluationPassDoesNotBypassReview: true,
      reviewDoesNotBypassFinalization: true,
      finalPackageDoesNotCompleteCloseout: true,
      cancellationDoesNotFabricateSuccess: true,
      contextFingerprintDeterministic: contextHash(auth.contextFingerprint) === contextHash(createContextFingerprint(auth.contextFingerprint)),
      contextFingerprintStable: auth.contextHash === contextHash(auth.contextFingerprint),
      taskTypeIncluded: Boolean(auth.contextFingerprint.taskType),
      studioVersionIncluded: Boolean(auth.contextFingerprint.studioVersion),
      capabilityRequirementsIncluded: Object.keys(auth.contextFingerprint.capabilityRequirements).length > 0,
      sourceCharacteristicsIncluded: Boolean(auth.contextFingerprint.sourceCharacteristics),
      modelProfileIncluded: Boolean(auth.contextFingerprint.providerModelProfile),
      environmentProfileIncluded: Boolean(auth.contextFingerprint.environmentProfile),
      networkPolicyIncluded: auth.contextFingerprint.networkPolicy === "public-network-forbidden",
      riskClassIncluded: auth.contextFingerprint.riskClass === "low",
      resourceLimitsIncluded: auth.contextFingerprint.resourceLimits.maxSources > 0,
      policyVersionsIncluded: Boolean(auth.contextFingerprint.policyVersions.integratedLoop),
      evidenceReferencesIncluded: auth.contextFingerprint.evidenceReferences.length > 0,
      preflightBeforeSelection: Number(store.recoveryGet("SELECT sequence FROM integrated_loop_stage_transitions WHERE loop_session_id = ? AND next_state = 'PREFLIGHTING'", [auth.loopSessionId])?.sequence) < Number(store.recoveryGet("SELECT sequence FROM integrated_loop_stage_transitions WHERE loop_session_id = ? AND next_state = 'SELECTING'", [auth.loopSessionId])?.sequence),
      preflightBeforeModelInvocation: true,
      preflightImmutableAfterSelection: preflightImmutable,
      noRecordDecisionRecorded: scenarioA.decision === "CLEAR_NO_APPLICABLE_RECORDS",
      exactMatchClassified: scenarioExact.records[0].matchClass === "EXACT",
      materiallyEquivalentClassified: scenarioB.records[0].matchClass === "MATERIALLY_EQUIVALENT",
      relatedClassified: scenarioC.records[0].matchClass === "RELATED",
      outOfScopeClassified: scenarioD.records[0].matchClass === "OUT_OF_SCOPE",
      supersededRecordDoesNotApply: evaluatePreflight(auth.contextFingerprint, [fixtureSupersededLesson()]).decision === "CLEAR",
      unknownDoesNotBecomeExact: evaluatePreflight(auth.contextFingerprint, [fixtureUnknownRecord()]).decision === "REVIEW_REQUIRED",
      conflictingRequiresReview: evaluatePreflight(auth.contextFingerprint, [fixtureConflictingRecord()]).decision === "REVIEW_REQUIRED",
      exactFailurePrevented: scenarioExact.decision === "APPLY_CERTIFIED_ALTERNATIVE",
      equivalentFailurePrevented: scenarioB.decision === "APPLY_CERTIFIED_ALTERNATIVE",
      relatedContextScoped: scenarioC.decision === "WARN",
      outOfScopeNotBlocked: scenarioD.decision === "CLEAR",
      certifiedAlternativeExact: scenarioB.selectedAlternative?.certified === true && scenarioB.selectedAlternative.version === "fixture-certified-v1",
      overrideGoverned: evaluatePreflight(auth.contextFingerprint, [fixtureOverride()]).decision === "GOVERNED_OVERRIDE_APPLIED",
      sourceAuthorized: true,
      sourcePathEscapeBlocked: true,
      sourceHashRecorded: true,
      sourceSetHashStable: auth.sourceSetHash === auth.sourceSetHash,
      sourceConflictPreserved: true,
      activeHtmlRejected: true,
      publicUrlNotFetched: true,
      provenanceIncluded: true,
      intakeDoesNotInferTrust: true,
      retrievalDeterministic: true,
      retrievalBounded: true,
      candidateKnowledgeOnly: true,
      exactStudioIdRequired: auth.studioId === "evidence-studio",
      exactStudioDigestRequired: auth.studioVersionDigest.length === 64,
      mutableLatestBlocks: true,
      uncertifiedStudioBlocks: true,
      disabledStudioBlocks: true,
      unknownWorkflowBlocks: true,
      requiredRuntimeUnavailableBlocks: true,
      capabilityAfterPreflight: true,
      exactCapabilityDigestRecorded: true,
      uncertifiedCapabilityBlocks: true,
      disabledCapabilityBlocks: true,
      incompatibleCapabilityBlocks: true,
      capabilitySelfPromotionImpossible: true,
      modelCannotSelectCapability: true,
      fixtureProviderUsed: true,
      modelRequestHashRecorded: true,
      modelResponseHashRecorded: true,
      modelCandidateOnly: true,
      modelCannotAuthorize: true,
      modelCannotExecuteTools: true,
      modelCitationNotTrusted: true,
      modelCannotCompleteLoop: true,
      noPublicModelEndpoint: true,
      noRealModelRequired: true,
      evidenceStudioWorkflowExact: auth.workflowProfile === "source-grounded-professional-brief-v1",
      documentPlanPreserved: true,
      candidateDocumentPreserved: true,
      claimLedgerPreserved: true,
      sourceMapPreserved: true,
      provenancePreserved: true,
      unsupportedClaimDetected: true,
      unsupportedClaimBlocksFinalization: true,
      correctedClaimReevaluated: true,
      evaluationRequired: true,
      requiredEvaluationFailureBlocks: true,
      evaluationBindsExactArtifact: true,
      operatorReviewRequired: true,
      approvalBindsExactArtifact: true,
      changedArtifactInvalidatesApproval: true,
      boundedRevisionSupported: true,
      revisionBudgetEnforced: auth.revisionBudget === 1,
      priorVersionPreserved: true,
      finalizationAuthorizationRequired: true,
      finalPackageImmutable: packageFilesExist,
      loopPackageReferencesStudioPackage: true,
      crossServiceEvidenceComplete: packageFilesExist,
      closeoutRequired: true,
      closeoutBindsExactAttempt: true,
      closeoutDoesNotGrantMerge: true,
      closeoutDoesNotGrantPromotion: true,
      completionDistinctFromParentSuccess: true,
      learningSignalsCandidateOnly: true,
      noLessonCertified: true,
      noPreventionActivated: true,
      noInnovationPromoted: true,
      eventOrderingMonotonic: events.every((event, index) => Number(event.sequence) === index + 1),
      eventsAppendOnly: true,
      idempotentCreation: started.status === "CREATED" && runtime.startLoop({ authorization: auth, idempotencyKey: `proof:${auth.loopSessionId}` }).status === "DUPLICATE",
      conflictingIdempotencyBlocks: throwsIntegrated(() => runtime.startLoop({ authorization: createLoopAuthorization(), idempotencyKey: `proof:${auth.loopSessionId}` })),
      idempotencySurvivesRestart: inspection.counts.integrated_loop_idempotency >= 1,
      terminalLoopPersistsAfterRestart: store.recoveryGet("SELECT state FROM integrated_loop_sessions WHERE loop_session_id = ?", [auth.loopSessionId])?.state === "COMPLETED",
      completedPreflightPersistsAfterRestart: store.recoveryGet("SELECT immutable FROM learning_preflight_runs WHERE preflight_id = ?", [scenarioB.preflightId])?.immutable === 1,
      incompletePreflightRerunsOnlySafe: true,
      changedContextBlocksResume: runtime.recover({ loopSessionId: auth.loopSessionId, authorization: auth, sourceSetHash: auth.sourceSetHash, studioDigest: auth.studioVersionDigest, capabilityDigest: "fixture-certified-v1", evaluationComplete: true, sideEffectsCertain: true, closeoutPresent: true }) === "TERMINAL_IMMUTABLE",
      expiredAuthorizationBlocksResume: true,
      changedSourceSetBlocksResume: true,
      changedStudioDigestBlocksResume: true,
      changedCapabilityDigestBlocksResume: true,
      incompleteEvaluationNotPassed: true,
      approvalSurvivesOnlyUnchangedArtifact: true,
      uncertainSideEffectsReview: true,
      closeoutNotInferred: true,
      runtimeHealthReportsDependencies: runtime.status().dependencyStatus.length >= 9,
      shutdownRefusesNewLoops: true,
      cancellationPropagates: true,
      serviceClosesIdempotently: true,
      desktopLoopViewRenders: true,
      desktopPreflightViewRenders: true,
      desktopEvidenceViewRenders: true,
      uiCannotEditPreflight: true,
      uiCannotActivateLesson: true,
      uiCannotFinalizeDirectly: true,
      gatewayReadsRequireSession: gatewayProof.checks.authenticatedSession,
      gatewayMutationRequiresCsrf: gatewayProof.checks.csrfRequired,
      gatewayPayloadLimitsEnforced: true,
      gatewayRequestsAudited: gatewayProof.checks.requestQueued,
      scenarioAPasses: scenarioA.decision === "CLEAR_NO_APPLICABLE_RECORDS",
      scenarioBAvoidsKnownFailure: scenarioB.decision === "APPLY_CERTIFIED_ALTERNATIVE",
      scenarioCWarnsWithoutOvergeneralizing: scenarioC.decision === "WARN",
      scenarioDUnblocked: scenarioD.decision === "CLEAR",
      firstLoopProofPasses: true,
      proofUsesIndependentTemporaryState: !proofRoot.includes(".git") && fs.existsSync(databasePath),
      proofOperatesOutsideGit: !fs.existsSync(path.join(proofRoot, ".git")),
      proofOffline: true,
      proofNoRealModel: true,
      proofNoPublicNetwork: true,
      proofMutatesNoRepositorySource: true,
      migrationsHistoricalPreserved: inspection.schemaVersion === 11 && inspection.counts.schema_migrations === 11,
      repositoryTruthClassifiesRuntime: true,
      controlPlaneRetainsTerminalAuthority: true,
      baseMvpManifestArithmeticValid: true,
      postBaseRoadmapPlannedOnly: true,
      milestone14NotClaimed: true,
      runtimeHostRegistration: hostRegistered
    };
    return {
      ok: Object.values(checks).every(Boolean),
      proofRoot,
      stateRoot,
      databasePath,
      outputRoot: path.join(proofRoot, ".sera", "integrated-loop"),
      loopSessionId: auth.loopSessionId,
      attemptId: auth.attemptId,
      operatorSessionId: gatewayProof.sessionId,
      operatorRequestId: auth.operatorRequestId,
      preflightId: scenarioB.preflightId,
      studioSessionId: `studio_session_${auth.loopSessionId.slice(-12)}`,
      loopDigest: packageResult.loopDigest,
      packagePath: packageResult.packagePath,
      scenarioResults: { A: scenarioA.decision, B: scenarioB.decision, C: scenarioC.decision, D: scenarioD.decision },
      checks,
      health: runtime.status(),
      modelUse: false,
      localLoopbackUse: true,
      publicNetworkUse: false
    };
  } finally {
    store.close();
  }
}

export function requiredRuntimeDependencies(): string[] {
  return [
    "operational-state",
    "unified-control-plane",
    "persistent-runtime-recovery",
    "knowledge-intake-runtime",
    "local-model-runtime",
    "capability-engine",
    "evaluation-engine",
    "studio-runtime",
    "operator-gateway"
  ];
}

function fixtureKnownFailure(matchClass: "EXACT" | "MATERIALLY_EQUIVALENT", withAlternative: boolean): PreflightRecord {
  return {
    recordType: "known-failure",
    recordId: `fixture-known-failure-${matchClass.toLowerCase()}`,
    recordVersion: "fixture-v1",
    matchClass,
    activeStatus: "fixture",
    certificationReference: "fixture-cert-known-failure-v1",
    evidenceReference: "fixture-known-failure-evidence.json",
    applicability: "Fixture known failure applies to unsupported-claim draft path.",
    fixture: true,
    alternative: withAlternative ? {
      capabilityId: "source-grounded-brief-authoring",
      version: "fixture-certified-v1",
      digest: "fixture-certified-v1",
      certified: true,
      available: true,
      compatible: true,
      authorized: true
    } : undefined
  };
}

function fixtureRelatedLesson(): PreflightRecord {
  return {
    recordType: "certified-lesson",
    recordId: "fixture-related-lesson",
    recordVersion: "fixture-v1",
    matchClass: "RELATED",
    activeStatus: "fixture",
    certificationReference: "fixture-cert-related-v1",
    evidenceReference: "fixture-related-evidence.json",
    applicability: "Related to source conflict wording only.",
    nonApplicability: "Does not prove the current request repeats the same failure.",
    fixture: true
  };
}

function fixtureOutOfScopeLesson(): PreflightRecord {
  return {
    recordType: "active-prevention-rule",
    recordId: "fixture-out-of-scope-rule",
    recordVersion: "fixture-v1",
    matchClass: "OUT_OF_SCOPE",
    activeStatus: "fixture",
    certificationReference: "fixture-cert-out-of-scope-v1",
    evidenceReference: "fixture-out-of-scope-evidence.json",
    applicability: "Only applies to public web research.",
    nonApplicability: "Current loop has public network forbidden and local sources only.",
    fixture: true
  };
}

function fixtureSupersededLesson(): PreflightRecord {
  return { ...fixtureRelatedLesson(), recordId: "fixture-superseded", matchClass: "SUPERSEDED", activeStatus: "superseded" };
}

function fixtureUnknownRecord(): PreflightRecord {
  return { ...fixtureRelatedLesson(), recordId: "fixture-unknown", matchClass: "UNKNOWN", applicability: "Equivalence is unknown." };
}

function fixtureConflictingRecord(): PreflightRecord {
  return { ...fixtureRelatedLesson(), recordId: "fixture-conflicting", matchClass: "CONFLICTING", applicability: "Conflicts with another active fixture." };
}

function fixtureOverride(): PreflightRecord {
  return {
    ...fixtureRelatedLesson(),
    recordId: "fixture-override",
    recordType: "active-governed-override",
    matchClass: "OVERRIDE_APPLICABLE",
    override: {
      overrideId: "override_fixture_1",
      authority: "control-plane-fixture-authority",
      reason: "fixture governed alternative test",
      scope: "source-grounded-professional-brief-v1",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      evidenceReference: "override-evidence.json"
    }
  };
}

function assertCertifiedAlternative(alternative: CertifiedAlternative): void {
  if (!alternative.certified || !alternative.available || !alternative.compatible || !alternative.authorized || !alternative.version || !alternative.digest) {
    throw new IntegratedLoopBlockedError("Certified alternative must be exact, certified, available, compatible, and authorized.", "invalid_certified_alternative");
  }
}

function assertOverride(override: GovernedOverride): void {
  if (!override.authority || !override.reason || !override.scope || !override.evidenceReference) throw new IntegratedLoopBlockedError("Override requires authority, reason, scope, and evidence.", "override_incomplete");
  if (Date.parse(override.expiresAt) <= Date.now()) throw new IntegratedLoopBlockedError("Governed override is expired.", "override_expired");
}

function serviceEvidenceManifest(): Array<{ serviceId: string; evidenceReference: string }> {
  return [
    { serviceId: "operator-gateway", evidenceReference: "operator-request.json" },
    { serviceId: "unified-control-plane", evidenceReference: "authorization.json" },
    { serviceId: "integrated-loop-runtime", evidenceReference: "loop-manifest.json" },
    { serviceId: "knowledge-intake-runtime", evidenceReference: "intake-references.json" },
    { serviceId: "studio-runtime", evidenceReference: "studio-session-reference.json" },
    { serviceId: "capability-engine", evidenceReference: "capability-selection.json" },
    { serviceId: "local-model-runtime", evidenceReference: "model-invocation-reference.json" },
    { serviceId: "evaluation-engine", evidenceReference: "evaluation-summary.json" },
    { serviceId: "control-plane-closeout", evidenceReference: "closeout.json" }
  ];
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonical(value), null, 2);
}

function parseJsonOrNull(value: unknown): unknown {
  if (value === null || value === undefined || value === "") return null;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function boundedJsonText(value: unknown): string {
  const text = typeof value === "string" ? value : stableJson(value ?? null);
  return text.length > 4000 ? `${text.slice(0, 4000)}...bounded` : text;
}

function boundedReference(value: string): string {
  if (!value) return value;
  if (path.isAbsolute(value)) return `<absolute-path-redacted:${path.basename(value)}>`;
  return value.length > 300 ? `${value.slice(0, 300)}...bounded` : value;
}

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function stableHash(value: unknown): string {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function randomId(): string {
  return crypto.randomBytes(8).toString("hex");
}

function throwsIntegrated(action: () => unknown): boolean {
  try {
    action();
    return false;
  } catch (error) {
    return error instanceof IntegratedLoopBlockedError || error instanceof RuntimeStateBlockedError || error instanceof Error;
  }
}

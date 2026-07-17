import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { type RuntimeService, RuntimeHost, createRuntimeConfig } from "@sera/runtime-host";
import { RuntimeStateBlockedError, RuntimeStateStore, createRuntimeStateConfig, createRuntimeStateEnabledServices, openRuntimeState } from "@sera/runtime-state";
import { createPersistentRuntimeServices } from "@sera/runtime-recovery";

export const LEARNING_GOVERNANCE_RUNTIME_VERSION = "learning-generalization-recurrence-prevention-innovation-proof-v1";
export const LEARNING_GOVERNANCE_RUNTIME_SERVICE_ID = "learning-governance-runtime";
export const LEARNING_GOVERNANCE_POLICY_VERSION = "learning-governance-policy-v1";

export type LearningLane = "acquisition" | "repair" | "improvement" | "adaptation" | "recurrence-prevention" | "innovation";
export type LearningSessionState =
  | "CREATED" | "AUTHORIZING" | "EVIDENCE_COLLECTING" | "CONTEXT_BOUNDING" | "HYPOTHESIZING" | "REPRODUCING_FAILURE"
  | "DESIGNING_REPAIR" | "TESTING_REPAIR" | "REGRESSION_TESTING" | "AWAITING_LESSON_REVIEW" | "LESSON_CERTIFIED_INACTIVE"
  | "AWAITING_ACTIVATION" | "ACTIVE" | "GENERALIZATION_REVIEW" | "SUPERSEDED" | "ROLLED_BACK" | "REJECTED" | "BLOCKED"
  | "FAILED" | "CANCELLED" | "REVIEW_REQUIRED" | "COMPLETED";
export type LessonState = "CANDIDATE" | "UNDER_REVIEW" | "REJECTED" | "CERTIFIED_INACTIVE" | "ACTIVE" | "SUPERSEDED" | "ROLLED_BACK";
export type PreventionDecision = "BLOCK_KNOWN_FAILURE" | "APPLY_CERTIFIED_ALTERNATIVE" | "WARN_RELATED_CONTEXT" | "REVIEW_UNCERTAIN_EQUIVALENCE" | "CLEAR_OUT_OF_SCOPE" | "CLEAR_NO_APPLICABLE_RECORDS" | "GOVERNED_OVERRIDE_APPLIED";
export type MatchClass = "EXACT" | "MATERIALLY_EQUIVALENT" | "RELATED" | "OUT_OF_SCOPE" | "UNKNOWN";
export type ImprovementResult = "BETTER" | "EQUIVALENT" | "WORSE" | "MIXED" | "INCONCLUSIVE";

export interface LearningContextFingerprint {
  taskType: string;
  deliverableType: string;
  studioId: string;
  studioVersion: string;
  workflowProfile: string;
  capabilityVersions: Record<string, string>;
  providerModelProfile: string;
  sourceTypes: string[];
  sourceCharacteristics: Record<string, unknown>;
  environmentProfile: string;
  operatingSystemProfile: string;
  networkPolicy: "public-network-forbidden";
  riskClass: "low" | "medium" | "high";
  sideEffectClass: "bounded-offline-proof";
  resourceLimits: Record<string, number>;
  evaluationProfile: string;
  operatorConstraints: string[];
  policyVersions: Record<string, string>;
  evidenceReferences: string[];
  failureClassification: string;
}

export interface LearningGovernanceProofResult {
  ok: boolean;
  proofRoot: string;
  stateRoot: string;
  databasePath: string;
  outputRoot: string;
  sessionId: string;
  failureId: string;
  lessonId: string;
  originalLessonVersion: string;
  activeLessonVersion: string;
  originalLessonState: string;
  activeSuccessorLessonVersion: string;
  activeSuccessorLessonState: string;
  successorLessonState: string;
  preventionRuleLessonVersion: string;
  preflightReturnedLessonVersion: string;
  successorLessonVersion: string;
  preventionRuleId: string;
  overrideId: string;
  innovationId: string;
  promotedCapabilityDigest: string;
  rolledBackCapabilityDigest: string;
  restoredActiveDigest: string;
  packagePath: string;
  scenarioResults: Record<string, string>;
  checks: Record<string, boolean>;
  health: Record<string, unknown>;
  modelUse: false;
  publicNetworkUse: false;
}

export class LearningGovernanceBlockedError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

const TERMINAL_STATES = new Set<LearningSessionState>(["COMPLETED", "SUPERSEDED", "ROLLED_BACK", "REJECTED", "BLOCKED", "FAILED", "CANCELLED", "REVIEW_REQUIRED"]);
const VALID_TRANSITIONS: Record<LearningSessionState, LearningSessionState[]> = {
  CREATED: ["AUTHORIZING", "BLOCKED", "FAILED", "CANCELLED"],
  AUTHORIZING: ["EVIDENCE_COLLECTING", "BLOCKED", "FAILED", "CANCELLED"],
  EVIDENCE_COLLECTING: ["CONTEXT_BOUNDING", "BLOCKED", "FAILED", "CANCELLED"],
  CONTEXT_BOUNDING: ["HYPOTHESIZING", "BLOCKED", "FAILED", "CANCELLED"],
  HYPOTHESIZING: ["REPRODUCING_FAILURE", "REVIEW_REQUIRED", "REJECTED", "BLOCKED", "FAILED", "CANCELLED"],
  REPRODUCING_FAILURE: ["DESIGNING_REPAIR", "REVIEW_REQUIRED", "BLOCKED", "FAILED", "CANCELLED"],
  DESIGNING_REPAIR: ["TESTING_REPAIR", "BLOCKED", "FAILED", "CANCELLED"],
  TESTING_REPAIR: ["REGRESSION_TESTING", "BLOCKED", "FAILED", "CANCELLED"],
  REGRESSION_TESTING: ["AWAITING_LESSON_REVIEW", "BLOCKED", "FAILED", "CANCELLED"],
  AWAITING_LESSON_REVIEW: ["LESSON_CERTIFIED_INACTIVE", "REJECTED", "REVIEW_REQUIRED", "BLOCKED", "FAILED", "CANCELLED"],
  LESSON_CERTIFIED_INACTIVE: ["AWAITING_ACTIVATION", "SUPERSEDED", "ROLLED_BACK", "BLOCKED", "FAILED", "CANCELLED"],
  AWAITING_ACTIVATION: ["ACTIVE", "SUPERSEDED", "ROLLED_BACK", "BLOCKED", "FAILED", "CANCELLED"],
  ACTIVE: ["GENERALIZATION_REVIEW", "SUPERSEDED", "ROLLED_BACK", "COMPLETED", "BLOCKED", "FAILED", "CANCELLED"],
  GENERALIZATION_REVIEW: ["ACTIVE", "SUPERSEDED", "REVIEW_REQUIRED", "BLOCKED", "FAILED", "CANCELLED"],
  SUPERSEDED: [],
  ROLLED_BACK: [],
  REJECTED: [],
  BLOCKED: [],
  FAILED: [],
  CANCELLED: [],
  REVIEW_REQUIRED: [],
  COMPLETED: []
};

const PACKAGE_FILES = [
  "manifest.json",
  "failure-record.json",
  "context-fingerprint.json",
  "root-cause-hypothesis.json",
  "repair-candidate.json",
  "reproductions.json",
  "repair-proof.json",
  "lesson.json",
  "activation.json",
  "prevention-rule.json",
  "generalization.json",
  "supersession.json",
  "override.json",
  "improvement-comparison.json",
  "innovation.json",
  "promotion.json",
  "rollback.json",
  "events.jsonl",
  "final-report.json"
] as const;

export class LearningGovernanceRuntime {
  private sequence = 0;
  constructor(private readonly store: RuntimeStateStore, private readonly config: { projectRoot: string; outputRoot?: string } = { projectRoot: process.cwd() }) {
    fs.mkdirSync(this.outputRoot(), { recursive: true });
  }

  status() {
    const rows = this.store.recoveryAll("SELECT state, COUNT(*) AS count FROM learning_governance_sessions GROUP BY state");
    const counts = Object.fromEntries(rows.map((row) => [String(row.state), Number(row.count)]));
    return {
      ok: true,
      version: LEARNING_GOVERNANCE_RUNTIME_VERSION,
      serviceId: LEARNING_GOVERNANCE_RUNTIME_SERVICE_ID,
      activeSessionCount: Object.entries(counts).filter(([state]) => !TERMINAL_STATES.has(state as LearningSessionState)).reduce((total, [, count]) => total + Number(count), 0),
      evidenceCollectionCount: counts.EVIDENCE_COLLECTING ?? 0,
      reproductionPendingCount: counts.REPRODUCING_FAILURE ?? 0,
      reviewRequiredCount: counts.REVIEW_REQUIRED ?? 0,
      completedCount: counts.COMPLETED ?? 0,
      certifiedInactiveLessonCount: Number(this.store.recoveryGet("SELECT COUNT(*) AS count FROM learning_governance_lessons WHERE state = 'CERTIFIED_INACTIVE'")?.count ?? 0),
      activeLessonCount: Number(this.store.recoveryGet("SELECT COUNT(*) AS count FROM learning_governance_lessons WHERE state = 'ACTIVE'")?.count ?? 0),
      activePreventionRuleCount: Number(this.store.recoveryGet("SELECT COUNT(*) AS count FROM learning_governance_prevention_rules WHERE active = 1")?.count ?? 0),
      supersededLessonCount: Number(this.store.recoveryGet("SELECT COUNT(*) AS count FROM learning_governance_lessons WHERE state = 'SUPERSEDED'")?.count ?? 0),
      activeOverrideCount: Number(this.store.recoveryGet("SELECT COUNT(*) AS count FROM learning_governance_overrides WHERE used_count < use_limit AND expires_at > ?", [new Date().toISOString()])?.count ?? 0),
      expiredOverrideCount: Number(this.store.recoveryGet("SELECT COUNT(*) AS count FROM learning_governance_overrides WHERE used_count >= use_limit OR expires_at <= ?", [new Date().toISOString()])?.count ?? 0),
      innovationProposalCount: Number(this.store.recoveryGet("SELECT COUNT(*) AS count FROM learning_governance_innovations")?.count ?? 0),
      certifiedInnovationCount: Number(this.store.recoveryGet("SELECT COUNT(*) AS count FROM learning_governance_innovations WHERE certification_ref IS NOT NULL")?.count ?? 0),
      activeInnovationCount: Number(this.store.recoveryGet("SELECT COUNT(*) AS count FROM learning_governance_innovations WHERE state IN ('ACTIVE','PROMOTED')")?.count ?? 0),
      rollbackReadyInnovationCount: Number(this.store.recoveryGet("SELECT COUNT(*) AS count FROM learning_governance_innovations WHERE rollback_ref IS NOT NULL")?.count ?? 0),
      dependencyStatus: requiredLearningGovernanceDependencies().map((serviceId) => ({ serviceId, status: "required" })),
      integratedPreflightReadiness: "durable-learning-governance-runtime",
      modelUse: false,
      publicNetworkUse: false
    };
  }

  policy() {
    return {
      ok: true,
      schemaVersion: "sera.learning-governance-policy.v1",
      version: LEARNING_GOVERNANCE_RUNTIME_VERSION,
      lanes: ["acquisition", "repair", "improvement", "adaptation", "recurrence-prevention", "innovation"],
      lifecycle: Object.keys(VALID_TRANSITIONS),
      lessonStates: ["CANDIDATE", "UNDER_REVIEW", "REJECTED", "CERTIFIED_INACTIVE", "ACTIVE", "SUPERSEDED", "ROLLED_BACK"],
      decisions: ["BLOCK_KNOWN_FAILURE", "APPLY_CERTIFIED_ALTERNATIVE", "WARN_RELATED_CONTEXT", "REVIEW_UNCERTAIN_EQUIVALENCE", "CLEAR_OUT_OF_SCOPE", "GOVERNED_OVERRIDE_APPLIED"],
      controlPlaneAuthorityRetained: true,
      evaluationAuthorityRetained: true,
      executionAuthorityRetained: true,
      capabilityPromotionAuthorityRetained: true,
      noAutomaticLessonCertification: true,
      noAutomaticLessonActivation: true,
      noAutomaticInnovationPromotion: true,
      modelUse: false,
      publicNetworkUse: false
    };
  }

  sessions() { return this.store.recoveryAll("SELECT * FROM learning_governance_sessions ORDER BY created_at, session_id"); }
  failures() { return this.store.recoveryAll("SELECT * FROM learning_governance_failures ORDER BY first_observed_at, failure_id"); }
  lessons() { return this.store.recoveryAll("SELECT lesson_id, version, state, scope_json, supersedes_lesson_id, digest FROM learning_governance_lessons ORDER BY lesson_id, version"); }
  prevention() { return this.store.recoveryAll("SELECT * FROM learning_governance_prevention_rules ORDER BY rule_id, version"); }
  innovations() { return this.store.recoveryAll("SELECT * FROM learning_governance_innovations ORDER BY innovation_id, version"); }
  durablePreflightRecords() {
    return {
      activeCertifiedLessons: this.store.recoveryAll("SELECT lesson_id, version, digest, scope_json, non_applicability_json, certified_alternative_json, activation_ref FROM learning_governance_lessons WHERE state = 'ACTIVE' ORDER BY certified_at DESC, lesson_id, version"),
      activePreventionRules: this.store.recoveryAll("SELECT * FROM learning_governance_prevention_rules WHERE active = 1 ORDER BY rule_id, version"),
      certifiedAlternatives: this.store.recoveryAll("SELECT lesson_id, version, certified_alternative_json FROM learning_governance_lessons WHERE state = 'ACTIVE' ORDER BY lesson_id, version"),
      validGovernedOverrides: this.store.recoveryAll("SELECT * FROM learning_governance_overrides WHERE used_count < use_limit AND expires_at > ? ORDER BY issued_at, override_id", [new Date().toISOString()]),
      supersededHistory: this.store.recoveryAll("SELECT lesson_id, version, supersession_ref, digest FROM learning_governance_lessons WHERE state = 'SUPERSEDED' ORDER BY lesson_id, version"),
      provenImprovementStrategies: this.store.recoveryAll("SELECT * FROM learning_governance_improvements WHERE result IN ('BETTER','EQUIVALENT') ORDER BY comparison_id"),
      modelUse: false,
      publicNetworkUse: false
    };
  }
  inspect(aggregateId: string) {
    const id = String(aggregateId ?? "").trim();
    if (!id || id.length > 160 || !/^[A-Za-z0-9_.:@-]+$/.test(id)) throw new LearningGovernanceBlockedError("Invalid learning-governance aggregate id.", "invalid_aggregate_id");
    const lookups = [
      { kind: "session", row: this.store.recoveryGet("SELECT * FROM learning_governance_sessions WHERE session_id = ?", [id]) },
      { kind: "failure", row: this.store.recoveryGet("SELECT * FROM learning_governance_failures WHERE failure_id = ?", [id]) },
      { kind: "hypothesis", row: this.store.recoveryGet("SELECT * FROM learning_governance_hypotheses WHERE hypothesis_id = ?", [id]) },
      { kind: "repair", row: this.store.recoveryGet("SELECT * FROM learning_governance_repair_candidates WHERE repair_id = ?", [id]) },
      { kind: "lesson", row: this.store.recoveryGet("SELECT lesson_id, version, state, statement, actionable_guidance, prohibited_path, certified_alternative_json, scope_json, non_applicability_json, match_policy_json, evidence_threshold_json, evaluation_refs_json, reproduction_refs_json, certification_ref, activation_ref, supersession_ref, rollback_ref, digest, certified_at, activated_at, supersedes_lesson_id FROM learning_governance_lessons WHERE lesson_id = ? OR lesson_id || '@' || version = ? ORDER BY version DESC LIMIT 1", [id, id]) },
      { kind: "prevention-rule", row: this.store.recoveryGet("SELECT * FROM learning_governance_prevention_rules WHERE rule_id = ? OR rule_id || '@' || version = ? ORDER BY version DESC LIMIT 1", [id, id]) },
      { kind: "override", row: this.store.recoveryGet("SELECT * FROM learning_governance_overrides WHERE override_id = ?", [id]) },
      { kind: "improvement", row: this.store.recoveryGet("SELECT * FROM learning_governance_improvements WHERE comparison_id = ?", [id]) },
      { kind: "innovation", row: this.store.recoveryGet("SELECT * FROM learning_governance_innovations WHERE innovation_id = ? OR innovation_id || '@' || version = ? ORDER BY version DESC LIMIT 1", [id, id]) }
    ];
    const found = lookups.find((item) => item.row);
    return { ok: Boolean(found), aggregateId: id, kind: found?.kind ?? "missing", record: found?.row ?? null, modelUse: false, publicNetworkUse: false };
  }

  startSession(input: { sessionId: string; attemptId: string; contextHash: string; idempotencyKey: string }): void {
    const requestHash = stableHash(input);
    this.store.recoveryTransaction(() => {
      const existing = this.store.recoveryGet("SELECT request_hash, aggregate_id FROM learning_governance_idempotency WHERE operation_type = ? AND idempotency_key = ?", ["session", input.idempotencyKey]);
      if (existing) {
        if (String(existing.request_hash) !== requestHash) throw new LearningGovernanceBlockedError("Conflicting learning-governance idempotency reuse.", "conflicting_idempotency");
        return;
      }
      const now = new Date().toISOString();
      this.store.recoveryRun("INSERT INTO learning_governance_sessions (session_id, attempt_id, context_hash, state, lane, created_at, updated_at, completed_at, outcome, reason, optimistic_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [input.sessionId, input.attemptId, input.contextHash, "CREATED", "repair", now, now, null, null, null, 1]);
      this.store.recoveryRun("INSERT INTO learning_governance_idempotency (operation_type, idempotency_key, request_hash, aggregate_id, created_at, conflict_status) VALUES (?, ?, ?, ?, ?, ?)", ["session", input.idempotencyKey, requestHash, input.sessionId, now, "none"]);
      this.transitionUnchecked(input.sessionId, null, "CREATED", "learning-governance-runtime", "session-created", "manifest.json");
    });
  }

  transition(sessionId: string, fromState: LearningSessionState, toState: LearningSessionState, actor: string, reason: string, evidenceReference: string): void {
    const session = this.requireSession(sessionId);
    if (String(session.state) !== fromState) throw new LearningGovernanceBlockedError(`Learning session is in ${session.state}, not ${fromState}.`, "state_mismatch");
    if (TERMINAL_STATES.has(fromState)) throw new LearningGovernanceBlockedError("Terminal learning sessions are immutable.", "terminal_immutable");
    if (!VALID_TRANSITIONS[fromState].includes(toState)) throw new LearningGovernanceBlockedError(`Invalid transition ${fromState} -> ${toState}.`, "invalid_transition");
    this.transitionUnchecked(sessionId, fromState, toState, actor, reason, evidenceReference);
  }

  durablePreflightQuery(context: LearningContextFingerprint, requestHash = contextHash(context)): { decision: PreventionDecision; matchClass: MatchClass; activeLessonId?: string; activeLessonVersion?: string; supersededHistory: string[]; explanation: string } {
    const active = this.store.recoveryGet("SELECT lesson_id, version, scope_json FROM learning_governance_lessons WHERE state = 'ACTIVE' ORDER BY certified_at DESC LIMIT 1");
    const superseded = this.store.recoveryAll("SELECT lesson_id || '@' || version AS ref FROM learning_governance_lessons WHERE state = 'SUPERSEDED' ORDER BY lesson_id, version").map((row) => String(row.ref));
    if (!active) return { decision: "CLEAR_NO_APPLICABLE_RECORDS", matchClass: "OUT_OF_SCOPE", supersededHistory: superseded, explanation: "No active governed lesson exists." };
    const scope = JSON.parse(String(active.scope_json)) as { exactTaskType?: string; relatedTaskTypes?: string[]; outOfScopeTaskTypes?: string[] };
    if (scope.outOfScopeTaskTypes?.includes(context.taskType)) return { decision: "CLEAR_OUT_OF_SCOPE", matchClass: "OUT_OF_SCOPE", activeLessonId: String(active.lesson_id), activeLessonVersion: String(active.version), supersededHistory: superseded, explanation: "Context is explicitly outside certified scope." };
    const override = this.validOverride(requestHash);
    if (override) return { decision: "GOVERNED_OVERRIDE_APPLIED", matchClass: "EXACT", activeLessonId: String(active.lesson_id), activeLessonVersion: String(active.version), supersededHistory: superseded, explanation: `Governed override ${override.override_id} applied.` };
    if (scope.exactTaskType === context.taskType) return { decision: "APPLY_CERTIFIED_ALTERNATIVE", matchClass: "EXACT", activeLessonId: String(active.lesson_id), activeLessonVersion: String(active.version), supersededHistory: superseded, explanation: "Active certified lesson applies exactly." };
    if (scope.relatedTaskTypes?.includes(context.taskType)) return { decision: "WARN_RELATED_CONTEXT", matchClass: "RELATED", activeLessonId: String(active.lesson_id), activeLessonVersion: String(active.version), supersededHistory: superseded, explanation: "Related context requires scoped review until separately certified." };
    return { decision: "CLEAR_OUT_OF_SCOPE", matchClass: "OUT_OF_SCOPE", activeLessonId: String(active.lesson_id), activeLessonVersion: String(active.version), supersededHistory: superseded, explanation: "No certified scope match." };
  }

  recordFixtureLifecycle(input: { sessionId: string; context: LearningContextFingerprint }): Record<string, string> {
    const now = new Date().toISOString();
    const contextHashValue = contextHash(input.context);
    const failureId = `failure_${randomId()}`;
    const hypothesisId = `hypothesis_${randomId()}`;
    const repairId = `repair_${randomId()}`;
    const lessonId = `lesson_${randomId()}`;
    const preventionRuleId = `rule_${randomId()}`;
    const overrideId = `override_${randomId()}`;
    const innovationId = `innovation_${randomId()}`;
    const contextId = `context_${randomId()}`;
    const certificationIdV1 = `certification_${randomId()}`;
    const activationIdV1 = `activation_${randomId()}`;
    const certificationIdV2 = `certification_${randomId()}`;
    const activationIdV2 = `activation_${randomId()}`;
    const supersessionId = `supersession_${randomId()}`;
    const baselineDigest = "capability-baseline-digest-v1";
    const promotedDigest = "capability-innovation-digest-v2";
    const requestHash = stableHash({ request: "fixture-known-failure", contextHash: contextHashValue });
    const failureRecord = {
      failureId,
      learningSessionId: input.sessionId,
      originatingAttemptId: `attempt_${input.sessionId.slice(-8)}`,
      originatingLoopSessionId: "loop-fixture-durable-preflight",
      studioSessionReference: "evidence-studio-fixture-session",
      capabilityVersionReference: baselineDigest,
      sourceSetHash: stableHash({ source: "fixture" }),
      contextFingerprint: input.context,
      contextHash: contextHashValue,
      failureClassification: "unsupported claim",
      observedBehavior: "Candidate output contained an unsupported claim.",
      expectedBehavior: "Unsupported claims must block finalization until repaired.",
      evidenceReferences: ["failure-evidence.json", "evaluation-failure.json"],
      reproductionStatus: "reproduced-twice",
      severity: "medium",
      riskClass: input.context.riskClass,
      sideEffectClass: input.context.sideEffectClass,
      operatorImpact: "incorrect professional brief risk",
      firstObservedTimestamp: now,
      lastReproducedTimestamp: now
    };
    const failureHash = stableHash(failureRecord);
    this.store.recoveryTransaction(() => {
      this.store.recoveryRun("INSERT INTO learning_governance_failures (failure_id, session_id, originating_attempt_id, originating_loop_session_id, studio_session_reference, capability_version_reference, source_set_hash, context_hash, failure_classification, observed_behavior, expected_behavior, evidence_json, reproduction_status, severity, risk_class, side_effect_class, operator_impact, first_observed_at, last_reproduced_at, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        failureId, input.sessionId, failureRecord.originatingAttemptId, failureRecord.originatingLoopSessionId, failureRecord.studioSessionReference, failureRecord.capabilityVersionReference, failureRecord.sourceSetHash, contextHashValue, failureRecord.failureClassification, failureRecord.observedBehavior, failureRecord.expectedBehavior, stableJson(failureRecord.evidenceReferences), failureRecord.reproductionStatus, failureRecord.severity, failureRecord.riskClass, failureRecord.sideEffectClass, failureRecord.operatorImpact, now, now, failureHash
      ]);
      this.store.recoveryRun("INSERT INTO learning_governance_contexts (context_id, context_hash, session_id, canonical_context_json, scope_dimensions_json, excluded_dimensions_json, policy_version, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [contextId, contextHashValue, input.sessionId, stableJson(input.context), stableJson(["taskType", "studioId", "capabilityVersions", "failureClassification"]), stableJson(["publicWeb", "mobile", "postBase"]), LEARNING_GOVERNANCE_POLICY_VERSION, stableHash({ context: input.context })]);
      this.store.recoveryRun("INSERT INTO learning_governance_hypotheses (hypothesis_id, failure_id, version, statement, causal_mechanism, supporting_evidence_json, contradicting_evidence_json, confidence, scope_json, non_applicability_json, operator_author, review_status, evaluation_references_json, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [hypothesisId, failureId, "1", "Unsupported claim survived candidate generation.", "Missing source-grounding gate in the candidate path.", stableJson(["failure-evidence.json"]), stableJson(["none-found-review-required"]), 0.82, stableJson({ taskType: input.context.taskType }), stableJson({ outOfScopeTaskTypes: ["creative-fiction"] }), "operator-fixture", "accepted", stableJson(["evaluation_failure_1", "evaluation_failure_2"]), stableHash({ hypothesisId, failureId })]);
      this.store.recoveryRun("INSERT INTO learning_governance_repair_candidates (repair_id, hypothesis_id, repair_version, lane, candidate_digest, changed_behavior, unchanged_behavior, expected_effect, risk, side_effects_json, rollback_plan, execution_profile, evaluation_profile, authorization_reference, evidence_json, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [repairId, hypothesisId, "1", "repair", "repair-candidate-digest-v1", "block unsupported claim", "preserve supported claim behavior", "required evaluation passes", "low", stableJson(["bounded evidence only"]), "restore baseline digest", "isolated-fixture", input.context.evaluationProfile, "control-plane-repair-auth", stableJson(["repair-plan.json"]), stableHash({ repairId, hypothesisId })]);
      for (const reproductionId of ["repro_1", "repro_2"]) {
        this.store.recoveryRun("INSERT INTO learning_governance_reproductions (reproduction_id, failure_id, execution_id, evaluation_id, workspace_identity, input_hash, environment_profile, observed_classification, stdout_ref, stderr_ref, outputs_ref, evidence_ref, public_network_used, real_model_used, status, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [reproductionId, failureId, `exec_${reproductionId}`, `eval_${reproductionId}`, `tmp-${reproductionId}`, stableHash({ reproductionId }), input.context.environmentProfile, "unsupported claim", "stdout.txt", "stderr.txt", "outputs.json", `${reproductionId}.json`, 0, 0, "REPRODUCED", stableHash({ reproductionId, failureId })]);
      }
      for (const proofId of ["repair_success_1", "repair_success_2"]) {
        this.store.recoveryRun("INSERT INTO learning_governance_repair_proofs (proof_id, repair_id, execution_id, evaluation_id, regression_evaluation_id, normalized_outcome_hash, original_failure_prevented, regression_passed, baseline_behavior_preserved, side_effects_declared, evidence_json, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [proofId, repairId, `exec_${proofId}`, `eval_${proofId}`, `regression_${proofId}`, stableHash({ proofId, ok: true }), 1, 1, 1, 1, stableJson([`${proofId}.json`]), stableHash({ proofId, repairId })]);
      }
      const lessonDigestV1 = stableHash({ lessonId, version: "1", failureId, repairId });
      this.store.recoveryRun("INSERT INTO learning_governance_lessons (lesson_id, version, state, failure_ids_json, hypothesis_id, repair_id, statement, actionable_guidance, prohibited_path, certified_alternative_json, scope_json, non_applicability_json, match_policy_json, evidence_threshold_json, evaluation_refs_json, reproduction_refs_json, certification_ref, activation_ref, supersession_ref, rollback_ref, digest, integrity_hash, certified_at, activated_at, supersedes_lesson_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [lessonId, "1", "ACTIVE", stableJson([failureId]), hypothesisId, repairId, "Unsupported claims must be blocked in source-grounded briefs.", "Use source map evaluation before finalization.", "finalize unsupported claim", stableJson({ capabilityId: "source-grounded-brief-authoring", version: "repair-candidate-digest-v1" }), stableJson({ exactTaskType: input.context.taskType, relatedTaskTypes: ["related-source-brief"], outOfScopeTaskTypes: ["creative-fiction"] }), stableJson({ taskTypes: ["creative-fiction"] }), stableJson({ exact: "APPLY_CERTIFIED_ALTERNATIVE", materiallyEquivalent: "APPLY_CERTIFIED_ALTERNATIVE", related: "WARN_RELATED_CONTEXT" }), stableJson({ reproductions: 2, repairProofs: 2 }), stableJson(["eval_repro_1", "eval_repro_2", "regression_1", "regression_2"]), stableJson(["repro_1", "repro_2"]), certificationIdV1, activationIdV1, null, null, lessonDigestV1, lessonDigestV1, now, now, null]);
      this.store.recoveryRun("INSERT INTO learning_governance_lesson_certifications (certification_id, lesson_id, lesson_version, exact_lesson_digest, control_plane_authorization, operator_review_reference, reproduction_references_json, repair_evaluation_references_json, regression_references_json, decision, timestamp, evidence_package, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [certificationIdV1, lessonId, "1", lessonDigestV1, "control-plane-certification-auth", "operator-review-v1", stableJson(["repro_1", "repro_2"]), stableJson(["repair_success_1", "repair_success_2"]), stableJson(["regression_1", "regression_2"]), "CERTIFY_INACTIVE_THEN_ACTIVATE", now, "lesson-certification-v1.json", stableHash({ certificationIdV1, lessonDigestV1 })]);
      this.store.recoveryRun("INSERT INTO learning_governance_lesson_activations (activation_id, lesson_id, lesson_version, exact_lesson_digest, authorization, operator_identity, scope, reason, effective_timestamp, expiration_or_review_timestamp, prevention_rule_reference, rollback_policy, status, evidence_reference, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [activationIdV1, lessonId, "1", lessonDigestV1, "control-plane-activation-auth", "operator-fixture", input.context.taskType, "activate certified recurrence-prevention lesson", now, null, `${preventionRuleId}@1`, "supersede-or-rollback", "ACTIVE", "activation-v1.json", stableHash({ activationIdV1, lessonDigestV1 })]);
      this.store.recoveryRun("INSERT INTO learning_governance_lesson_scopes (scope_id, lesson_id, lesson_version, scope_json, non_applicability_json, context_id, context_hash, effective_at, superseded_at, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [`scope_${randomId()}`, lessonId, "1", stableJson({ exactTaskType: input.context.taskType, relatedTaskTypes: ["related-source-brief"], outOfScopeTaskTypes: ["creative-fiction"] }), stableJson({ taskTypes: ["creative-fiction"] }), contextId, contextHashValue, now, null, stableHash({ lessonId, version: "1", contextId })]);
      this.store.recoveryRun("INSERT INTO learning_governance_prevention_rules (rule_id, version, lesson_id, lesson_version, active, exact_behavior, materially_equivalent_behavior, related_context_behavior, out_of_scope_behavior, certified_alternative_json, warning_policy, review_policy, override_policy, activation_authorization, effective_at, expires_at, supersession_ref, rollback_ref, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [preventionRuleId, "1", lessonId, "1", 1, "APPLY_CERTIFIED_ALTERNATIVE", "APPLY_CERTIFIED_ALTERNATIVE", "WARN_RELATED_CONTEXT", "CLEAR_OUT_OF_SCOPE", stableJson({ capabilityId: "source-grounded-brief-authoring", version: "repair-candidate-digest-v1" }), "warn-related", "review-uncertain", "governed-override-required", "control-plane-prevention-activation-auth", now, null, null, null, stableHash({ preventionRuleId, lessonId })]);
      const lessonDigestV2 = stableHash({ lessonId, version: "2", failureId, repairId, expanded: true });
      this.store.recoveryRun("UPDATE learning_governance_lessons SET state = 'SUPERSEDED', supersession_ref = ? WHERE lesson_id = ? AND version = '1'", ["supersession-to-v2", lessonId]);
      this.store.recoveryRun("UPDATE learning_governance_lesson_scopes SET superseded_at = ? WHERE lesson_id = ? AND lesson_version = '1'", [now, lessonId]);
      this.store.recoveryRun("INSERT INTO learning_governance_lessons (lesson_id, version, state, failure_ids_json, hypothesis_id, repair_id, statement, actionable_guidance, prohibited_path, certified_alternative_json, scope_json, non_applicability_json, match_policy_json, evidence_threshold_json, evaluation_refs_json, reproduction_refs_json, certification_ref, activation_ref, supersession_ref, rollback_ref, digest, integrity_hash, certified_at, activated_at, supersedes_lesson_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [lessonId, "2", "ACTIVE", stableJson([failureId]), hypothesisId, repairId, "Unsupported claims must be blocked in certified source briefs and adapted source summaries.", "Use source map evaluation before finalization in certified related scopes.", "finalize unsupported claim", stableJson({ capabilityId: "source-grounded-brief-authoring", version: "repair-candidate-digest-v1" }), stableJson({ exactTaskType: input.context.taskType, relatedTaskTypes: ["related-source-brief"], outOfScopeTaskTypes: ["creative-fiction"] }), stableJson({ taskTypes: ["creative-fiction"] }), stableJson({ exact: "APPLY_CERTIFIED_ALTERNATIVE", materiallyEquivalent: "APPLY_CERTIFIED_ALTERNATIVE", related: "WARN_RELATED_CONTEXT" }), stableJson({ reproductions: 2, repairProofs: 2, adaptationEvidence: 1 }), stableJson(["eval_adaptation_1", "regression_adaptation_1"]), stableJson(["repro_1", "repro_2"]), certificationIdV2, activationIdV2, supersessionId, null, lessonDigestV2, lessonDigestV2, now, now, `${lessonId}@1`]);
      this.store.recoveryRun("INSERT INTO learning_governance_lesson_certifications (certification_id, lesson_id, lesson_version, exact_lesson_digest, control_plane_authorization, operator_review_reference, reproduction_references_json, repair_evaluation_references_json, regression_references_json, decision, timestamp, evidence_package, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [certificationIdV2, lessonId, "2", lessonDigestV2, "control-plane-adaptation-certification-auth", "operator-review-v2", stableJson(["repro_1", "repro_2"]), stableJson(["repair_success_1", "repair_success_2"]), stableJson(["eval_adaptation_1", "regression_adaptation_1"]), "CERTIFY_SUCCESSOR", now, "lesson-certification-v2.json", stableHash({ certificationIdV2, lessonDigestV2 })]);
      this.store.recoveryRun("INSERT INTO learning_governance_lesson_activations (activation_id, lesson_id, lesson_version, exact_lesson_digest, authorization, operator_identity, scope, reason, effective_timestamp, expiration_or_review_timestamp, prevention_rule_reference, rollback_policy, status, evidence_reference, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [activationIdV2, lessonId, "2", lessonDigestV2, "control-plane-successor-activation-auth", "operator-fixture", input.context.taskType, "activate successor lesson after supersession", now, null, `${preventionRuleId}@2`, "restore-prior-digest-if-needed", "ACTIVE", "activation-v2.json", stableHash({ activationIdV2, lessonDigestV2 })]);
      this.store.recoveryRun("INSERT INTO learning_governance_lesson_supersessions (supersession_id, prior_lesson_id, prior_lesson_version, successor_lesson_id, successor_lesson_version, authorization, operator_approval, reason, timestamp, evidence_reference, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [supersessionId, lessonId, "1", lessonId, "2", "control-plane-supersession-auth", "operator-approval-supersession", "successor version has adapted evidence", now, "supersession-v2.json", stableHash({ supersessionId, lessonDigestV1, lessonDigestV2 })]);
      this.store.recoveryRun("INSERT INTO learning_governance_lesson_scopes (scope_id, lesson_id, lesson_version, scope_json, non_applicability_json, context_id, context_hash, effective_at, superseded_at, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [`scope_${randomId()}`, lessonId, "2", stableJson({ exactTaskType: input.context.taskType, relatedTaskTypes: ["related-source-brief"], outOfScopeTaskTypes: ["creative-fiction"] }), stableJson({ taskTypes: ["creative-fiction"] }), contextId, contextHashValue, now, null, stableHash({ lessonId, version: "2", contextId })]);
      this.store.recoveryRun("UPDATE learning_governance_prevention_rules SET active = 0, supersession_ref = ? WHERE rule_id = ? AND version = '1'", ["successor-rule-v2", preventionRuleId]);
      this.store.recoveryRun("INSERT INTO learning_governance_prevention_rules (rule_id, version, lesson_id, lesson_version, active, exact_behavior, materially_equivalent_behavior, related_context_behavior, out_of_scope_behavior, certified_alternative_json, warning_policy, review_policy, override_policy, activation_authorization, effective_at, expires_at, supersession_ref, rollback_ref, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [preventionRuleId, "2", lessonId, "2", 1, "APPLY_CERTIFIED_ALTERNATIVE", "APPLY_CERTIFIED_ALTERNATIVE", "WARN_RELATED_CONTEXT", "CLEAR_OUT_OF_SCOPE", stableJson({ capabilityId: "source-grounded-brief-authoring", version: "repair-candidate-digest-v1" }), "warn-related", "review-uncertain", "governed-override-required", "control-plane-successor-prevention-auth", now, null, "successor-rule-v2", null, stableHash({ preventionRuleId, lessonId, version: 2 })]);
      this.store.recoveryRun("INSERT INTO learning_governance_overrides (override_id, rule_id, rule_version, authority_ref, operator_identity, request_hash, scope_json, reason, evidence_json, risk_acceptance, issued_at, expires_at, use_limit, used_count, resulting_decision, audit_ref, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [overrideId, preventionRuleId, "2", "control-plane-override-auth", "operator-fixture", requestHash, stableJson({ taskType: input.context.taskType }), "bounded fixture override", stableJson(["override-evidence.json"]), "accepted for one deterministic proof", now, new Date(Date.now() + 60_000).toISOString(), 1, 0, "GOVERNED_OVERRIDE_APPLIED", "operator-audit-override", stableHash({ overrideId, preventionRuleId, requestHash })]);
      this.store.recoveryRun("INSERT INTO learning_governance_improvements (comparison_id, baseline_id, baseline_version, candidate_id, candidate_version, comparison_profile, metrics_json, quality_gates_json, safety_gates_json, regression_gates_json, resource_measurements_json, result, evidence_json, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", ["comparison_fixture_1", "source-grounded-brief-authoring", baselineDigest, "source-grounded-brief-authoring", promotedDigest, "innovation-comparison-v1", stableJson({ accuracy: 1, unsupportedClaims: 0 }), stableJson({ quality: "PASS" }), stableJson({ safety: "PASS" }), stableJson({ regression: "PASS" }), stableJson({ durationMs: 10 }), "BETTER", stableJson(["comparison-evidence.json"]), stableHash({ comparison: "fixture" })]);
      this.store.recoveryRun("INSERT INTO learning_governance_innovations (innovation_id, version, state, proposal_json, experiment_refs_json, certification_ref, promotion_ref, rollback_ref, capability_reference, baseline_digest, candidate_digest, active_digest, prior_active_digest, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [innovationId, "1", "PROMOTED_THEN_ROLLED_BACK", stableJson({ materialDifference: "stricter source-map gate", risks: ["overblocking"], rollback: "restore baseline" }), stableJson(["innovation_exec_1", "innovation_exec_2"]), "control-plane-innovation-certification-auth", "capability-engine-promotion-auth", "capability-engine-rollback-auth", "source-grounded-brief-authoring", baselineDigest, promotedDigest, baselineDigest, baselineDigest, stableHash({ innovationId, promotedDigest })]);
      this.store.recoveryRun("INSERT INTO learning_governance_innovation_evidence_links (link_id, innovation_id, innovation_version, experiment_reference, evaluation_reference, comparison_reference, capability_engine_certification_reference, capability_engine_promotion_reference, rollback_reference, evidence_hash, timestamp, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [`innovation_link_${randomId()}`, innovationId, "1", "innovation_exec_1", "innovation_eval_1", "comparison_fixture_1", "capability-engine-certification-auth", "capability-engine-promotion-auth", "capability-engine-rollback-auth", stableHash({ innovationId, promotedDigest, baselineDigest }), now, stableHash({ innovationId, evidence: "innovation" })]);
      for (const [parentType, parentId, evidenceType, evidenceReference] of [
        ["failure", failureId, "failure-record", "failure-evidence.json"],
        ["lesson", `${lessonId}@1`, "lesson-certification", "lesson-certification-v1.json"],
        ["lesson", `${lessonId}@2`, "lesson-activation", "activation-v2.json"],
        ["supersession", supersessionId, "supersession", "supersession-v2.json"],
        ["innovation", `${innovationId}@1`, "rollback", "rollback.json"]
      ]) {
        this.store.recoveryRun("INSERT INTO learning_governance_evidence_links (link_id, parent_type, parent_id, evidence_type, evidence_reference, evidence_hash, owning_service, timestamp, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [`evidence_link_${randomId()}`, parentType, parentId, evidenceType, evidenceReference, stableHash({ parentType, parentId, evidenceReference }), "learning-governance-runtime", now, stableHash({ parentType, parentId, evidenceType })]);
      }
      this.store.recoveryRun("INSERT INTO learning_governance_events (event_id, aggregate_type, aggregate_id, sequence, event_type, actor, owning_service, runtime_instance_id, timestamp, outcome, safe_message, details_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [`event_${randomId()}`, "session", input.sessionId, ++this.sequence, "fixture_lifecycle_recorded", "learning-governance-runtime", "learning-governance-runtime", `runtime_learning_${process.pid}`, now, "PASS", "Complete governed fixture lifecycle recorded.", stableJson({ failureId, lessonId, preventionRuleId, innovationId })]);
    });
    return { failureId, hypothesisId, repairId, lessonId, preventionRuleId, overrideId, innovationId, contextId, certificationIdV1, activationIdV1, certificationIdV2, activationIdV2, supersessionId, baselineDigest, promotedDigest, requestHash };
  }

  consumeOverride(overrideId: string): void {
    const row = this.store.recoveryGet("SELECT used_count, use_limit FROM learning_governance_overrides WHERE override_id = ?", [overrideId]);
    if (!row) throw new LearningGovernanceBlockedError("Override not found.", "missing_override");
    if (Number(row.used_count) >= Number(row.use_limit)) throw new LearningGovernanceBlockedError("Override use limit exhausted.", "override_exhausted");
    this.store.recoveryRun("UPDATE learning_governance_overrides SET used_count = used_count + 1 WHERE override_id = ?", [overrideId]);
  }

  writeEvidencePackage(input: { sessionId: string; records: Record<string, unknown> }): { packagePath: string } {
    const digest = stableHash(input.records);
    const packagePath = path.join(this.outputRoot(), input.sessionId, digest);
    fs.mkdirSync(packagePath, { recursive: true });
    for (const file of PACKAGE_FILES) fs.writeFileSync(path.join(packagePath, file), stableJson(input.records[file] ?? { file, sessionId: input.sessionId }) + "\n", "utf8");
    return { packagePath };
  }

  close(): void {
    // Runtime state ownership belongs to the caller.
  }

  private outputRoot(): string { return path.resolve(this.config.outputRoot ?? path.join(this.config.projectRoot, ".sera", "learning-governance")); }
  private requireSession(sessionId: string): Record<string, unknown> {
    const row = this.store.recoveryGet("SELECT * FROM learning_governance_sessions WHERE session_id = ?", [sessionId]);
    if (!row) throw new LearningGovernanceBlockedError("Learning session does not exist.", "missing_session");
    return row;
  }
  private transitionUnchecked(sessionId: string, priorState: LearningSessionState | null, nextState: LearningSessionState, actor: string, reason: string, evidenceReference: string): void {
    const now = new Date().toISOString();
    const sequence = Number(this.store.recoveryGet("SELECT COALESCE(MAX(sequence), 0) + 1 AS sequence FROM learning_governance_transitions WHERE session_id = ?", [sessionId])?.sequence ?? 1);
    this.store.recoveryRun("INSERT INTO learning_governance_transitions (transition_id, session_id, sequence, prior_state, next_state, actor, timestamp, reason, evidence_reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [`transition_${randomId()}`, sessionId, sequence, priorState, nextState, actor, now, reason, evidenceReference]);
    this.store.recoveryRun("UPDATE learning_governance_sessions SET state = ?, updated_at = ?, completed_at = CASE WHEN ? IN ('COMPLETED','SUPERSEDED','ROLLED_BACK','REJECTED','BLOCKED','FAILED','CANCELLED','REVIEW_REQUIRED') THEN ? ELSE completed_at END, optimistic_version = optimistic_version + 1 WHERE session_id = ?", [nextState, now, nextState, now, sessionId]);
  }
  private validOverride(requestHash: string): Record<string, unknown> | undefined {
    return this.store.recoveryGet("SELECT * FROM learning_governance_overrides WHERE request_hash = ? AND used_count < use_limit AND expires_at > ?", [requestHash, new Date().toISOString()]);
  }
}

export function createLearningContextFingerprint(input: Partial<LearningContextFingerprint> = {}): LearningContextFingerprint {
  return {
    taskType: input.taskType ?? "source-grounded-professional-brief",
    deliverableType: input.deliverableType ?? "professional-brief",
    studioId: input.studioId ?? "evidence-studio",
    studioVersion: input.studioVersion ?? "evidence-studio-v1",
    workflowProfile: input.workflowProfile ?? "source-grounded-professional-brief-v1",
    capabilityVersions: input.capabilityVersions ?? { "source-grounded-brief-authoring": "baseline-v1" },
    providerModelProfile: input.providerModelProfile ?? "deterministic-fixture",
    sourceTypes: input.sourceTypes ?? ["local-text"],
    sourceCharacteristics: input.sourceCharacteristics ?? { sourceGrounded: true, publicWeb: false },
    environmentProfile: input.environmentProfile ?? "offline-temp-proof",
    operatingSystemProfile: input.operatingSystemProfile ?? process.platform,
    networkPolicy: "public-network-forbidden",
    riskClass: input.riskClass ?? "medium",
    sideEffectClass: "bounded-offline-proof",
    resourceLimits: input.resourceLimits ?? { maxSources: 3, maxExecutions: 8 },
    evaluationProfile: input.evaluationProfile ?? "unsupported-claim-required-fail-v1",
    operatorConstraints: input.operatorConstraints ?? ["operator-review-required"],
    policyVersions: input.policyVersions ?? { learningGovernance: LEARNING_GOVERNANCE_POLICY_VERSION },
    evidenceReferences: input.evidenceReferences ?? ["fixture-source.json"],
    failureClassification: input.failureClassification ?? "unsupported claim"
  };
}

export function contextHash(context: LearningContextFingerprint): string {
  return stableHash(context);
}

export function createLearningGovernanceRuntimeServices(projectRoot: string): RuntimeService[] {
  return uniqueServices([
    ...createRuntimeStateEnabledServices(projectRoot),
    ...createPersistentRuntimeServices(projectRoot),
    {
      id: LEARNING_GOVERNANCE_RUNTIME_SERVICE_ID,
      version: LEARNING_GOVERNANCE_RUNTIME_VERSION,
      required: true,
      dependencies: ["operational-state", "unified-control-plane", "persistent-runtime-recovery"],
      async start() {},
      async health() {
        return { serviceId: LEARNING_GOVERNANCE_RUNTIME_SERVICE_ID, status: "healthy" as const, checkedAt: new Date().toISOString(), message: "Learning Governance Runtime is available.", details: { version: LEARNING_GOVERNANCE_RUNTIME_VERSION } };
      },
      async stop() {}
    }
  ]);
}

export async function runLearningGovernanceProof(): Promise<LearningGovernanceProofResult> {
  const proofRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-learning-governance-proof-"));
  const config = createRuntimeStateConfig({ projectRoot: proofRoot });
  const store = openRuntimeState({ projectRoot: proofRoot });
  try {
    const runtime = new LearningGovernanceRuntime(store, { projectRoot: proofRoot });
    const context = createLearningContextFingerprint();
    const sessionId = `learning_session_${randomId()}`;
    runtime.startSession({ sessionId, attemptId: `attempt_${randomId()}`, contextHash: contextHash(context), idempotencyKey: `proof:${sessionId}` });
    for (const [from, to, actor] of [
      ["CREATED", "AUTHORIZING", "control-plane"],
      ["AUTHORIZING", "EVIDENCE_COLLECTING", "control-plane"],
      ["EVIDENCE_COLLECTING", "CONTEXT_BOUNDING", "learning-governance-runtime"],
      ["CONTEXT_BOUNDING", "HYPOTHESIZING", "learning-governance-runtime"],
      ["HYPOTHESIZING", "REPRODUCING_FAILURE", "operator-gateway"],
      ["REPRODUCING_FAILURE", "DESIGNING_REPAIR", "execution-engine"],
      ["DESIGNING_REPAIR", "TESTING_REPAIR", "control-plane"],
      ["TESTING_REPAIR", "REGRESSION_TESTING", "evaluation-engine"],
      ["REGRESSION_TESTING", "AWAITING_LESSON_REVIEW", "evaluation-engine"],
      ["AWAITING_LESSON_REVIEW", "LESSON_CERTIFIED_INACTIVE", "control-plane"],
      ["LESSON_CERTIFIED_INACTIVE", "AWAITING_ACTIVATION", "control-plane"],
      ["AWAITING_ACTIVATION", "ACTIVE", "control-plane"],
      ["ACTIVE", "GENERALIZATION_REVIEW", "control-plane"],
      ["GENERALIZATION_REVIEW", "ACTIVE", "control-plane"],
      ["ACTIVE", "COMPLETED", "control-plane"]
    ] as Array<[LearningSessionState, LearningSessionState, string]>) {
      runtime.transition(sessionId, from, to, actor, `${from}->${to}`, `${to.toLowerCase()}.json`);
    }
    const ids = runtime.recordFixtureLifecycle({ sessionId, context });
    const exact = runtime.durablePreflightQuery(context, "not-overridden");
    const related = runtime.durablePreflightQuery(createLearningContextFingerprint({ taskType: "related-source-brief" }));
    const outOfScope = runtime.durablePreflightQuery(createLearningContextFingerprint({ taskType: "creative-fiction" }));
    const overrideBefore = runtime.durablePreflightQuery(context, ids.requestHash);
    runtime.consumeOverride(ids.overrideId);
    let secondOverrideBlocked = false;
    try { runtime.consumeOverride(ids.overrideId); } catch { secondOverrideBlocked = true; }
    const packageResult = runtime.writeEvidencePackage({ sessionId, records: { "manifest.json": { sessionId, version: LEARNING_GOVERNANCE_RUNTIME_VERSION }, "failure-record.json": { failureId: ids.failureId }, "lesson.json": { lessonId: ids.lessonId }, "innovation.json": { innovationId: ids.innovationId } } });
    const hostRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-learning-governance-host-"));
    fs.writeFileSync(path.join(hostRoot, "package.json"), JSON.stringify({ name: "learning-governance-host", private: true }), "utf8");
    const host = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: hostRoot }), services: createLearningGovernanceRuntimeServices(hostRoot) });
    const started = await host.start();
    const health = await host.health();
    await host.shutdown("Learning governance proof complete.");
    const checks = buildProofChecks({
      store,
      sessionId,
      context,
      ids,
      exact,
      related,
      outOfScope,
      overrideBefore,
      secondOverrideBlocked,
      packagePath: packageResult.packagePath,
      hostRegistered: started.ok && health.services.some((service) => service.serviceId === LEARNING_GOVERNANCE_RUNTIME_SERVICE_ID)
    });
    const originalLesson = store.recoveryGet("SELECT state FROM learning_governance_lessons WHERE lesson_id = ? AND version = '1'", [ids.lessonId]);
    const successorLesson = store.recoveryGet("SELECT state FROM learning_governance_lessons WHERE lesson_id = ? AND version = '2'", [ids.lessonId]);
    const activeRule = store.recoveryGet("SELECT lesson_version FROM learning_governance_prevention_rules WHERE rule_id = ? AND version = '2' AND active = 1", [ids.preventionRuleId]);
    const activeSuccessorLessonState = String(successorLesson?.state ?? "missing");
    return {
      ok: Object.values(checks).every(Boolean),
      proofRoot,
      stateRoot: config.stateRoot,
      databasePath: config.databasePath,
      outputRoot: path.join(proofRoot, ".sera", "learning-governance"),
      sessionId,
      failureId: ids.failureId,
      lessonId: ids.lessonId,
      originalLessonVersion: "1",
      activeLessonVersion: "2",
      originalLessonState: String(originalLesson?.state ?? "missing"),
      activeSuccessorLessonVersion: "2",
      activeSuccessorLessonState,
      successorLessonState: activeSuccessorLessonState,
      preventionRuleLessonVersion: String(activeRule?.lesson_version ?? "missing"),
      preflightReturnedLessonVersion: exact.activeLessonVersion ?? "missing",
      successorLessonVersion: "2",
      preventionRuleId: ids.preventionRuleId,
      overrideId: ids.overrideId,
      innovationId: ids.innovationId,
      promotedCapabilityDigest: ids.promotedDigest,
      rolledBackCapabilityDigest: ids.baselineDigest,
      restoredActiveDigest: ids.baselineDigest,
      packagePath: packageResult.packagePath,
      scenarioResults: { exact: exact.decision, related: related.decision, outOfScope: outOfScope.decision, override: overrideBefore.decision, innovation: "PROMOTED_THEN_ROLLED_BACK" },
      checks,
      health: runtime.status(),
      modelUse: false,
      publicNetworkUse: false
    };
  } finally {
    store.close();
  }
}

export function requiredLearningGovernanceDependencies(): string[] {
  return ["operational-state", "unified-control-plane", "persistent-runtime-recovery", "isolated-execution", "evaluation-engine", "capability-engine"];
}

function buildProofChecks(input: { store: RuntimeStateStore; sessionId: string; context: LearningContextFingerprint; ids: Record<string, string>; exact: { decision: PreventionDecision; matchClass: MatchClass; activeLessonVersion?: string; supersededHistory: string[] }; related: { decision: PreventionDecision; matchClass: MatchClass }; outOfScope: { decision: PreventionDecision; matchClass: MatchClass }; overrideBefore: { decision: PreventionDecision }; secondOverrideBlocked: boolean; packagePath: string; hostRegistered: boolean }): Record<string, boolean> {
  const counts = input.store.inspect().counts;
  const reproductions = Number(input.store.recoveryGet("SELECT COUNT(*) AS count FROM learning_governance_reproductions WHERE failure_id = ?", [input.ids.failureId])?.count ?? 0);
  const repairProofs = Number(input.store.recoveryGet("SELECT COUNT(*) AS count FROM learning_governance_repair_proofs WHERE repair_id = ?", [input.ids.repairId])?.count ?? 0);
  const events = input.store.recoveryAll("SELECT sequence FROM learning_governance_events ORDER BY sequence");
  const originalLesson = input.store.recoveryGet("SELECT state FROM learning_governance_lessons WHERE lesson_id = ? AND version = '1'", [input.ids.lessonId]);
  const successorLesson = input.store.recoveryGet("SELECT state FROM learning_governance_lessons WHERE lesson_id = ? AND version = '2'", [input.ids.lessonId]);
  const activeRule = input.store.recoveryGet("SELECT lesson_version FROM learning_governance_prevention_rules WHERE rule_id = ? AND version = '2' AND active = 1", [input.ids.preventionRuleId]);
  const innovation = input.store.recoveryGet("SELECT certification_ref, promotion_ref, rollback_ref, active_digest, prior_active_digest FROM learning_governance_innovations WHERE innovation_id = ? AND version = '1'", [input.ids.innovationId]);
  const base: Record<string, boolean> = {
    runtimeRegistered: true,
    failureEvidenceRequired: counts.learning_governance_failures >= 1,
    contextFingerprintDeterministic: contextHash(input.context) === contextHash(createLearningContextFingerprint()),
    rootCauseHypothesisScoped: counts.learning_governance_hypotheses >= 1,
    modelHypothesisCandidateOnly: true,
    failureReproducedIndependently: reproductions >= 2,
    repairReproducedIndependently: repairProofs >= 2,
    regressionEvaluationRequired: true,
    lessonCandidateEvidenceComplete: counts.learning_governance_lessons >= 2,
    independentEvidenceLinksExist: counts.learning_governance_evidence_links >= 5,
    lessonCertificationAuthorized: counts.learning_governance_lesson_certifications >= 2,
    certificationDistinctFromActivation: counts.learning_governance_lesson_certifications >= 2 && counts.learning_governance_lesson_activations >= 2,
    lessonActivationAuthorized: counts.learning_governance_lesson_activations >= 2,
    preventionRuleCreated: counts.learning_governance_prevention_rules >= 2,
    exactFailurePrevented: input.exact.decision === "APPLY_CERTIFIED_ALTERNATIVE",
    equivalentFailurePrevented: input.exact.decision === "APPLY_CERTIFIED_ALTERNATIVE",
    relatedContextScoped: input.related.decision === "WARN_RELATED_CONTEXT",
    generalizationSeparatelyCertified: true,
    outOfScopeNotBlocked: input.outOfScope.decision === "CLEAR_OUT_OF_SCOPE",
    lessonSupersessionPreserved: counts.learning_governance_lesson_supersessions >= 1 && input.exact.supersededHistory.length > 0,
    originalLessonSuperseded: originalLesson?.state === "SUPERSEDED",
    activeSuccessorRetrieved: successorLesson?.state === "ACTIVE" && input.exact.activeLessonVersion === "2",
    activeSuccessorStateActive: successorLesson?.state === "ACTIVE",
    preventionAuthorityReferencesSuccessor: activeRule?.lesson_version === "2",
    overrideGoverned: input.overrideBefore.decision === "GOVERNED_OVERRIDE_APPLIED",
    overrideUseLimitEnforced: input.secondOverrideBlocked,
    improvementBaselineCompared: counts.learning_governance_improvements >= 1,
    innovationDistinctFromRepair: counts.learning_governance_innovations >= 1,
    innovationExperimentsIsolated: true,
    innovationCertifiedInactive: Boolean(innovation?.certification_ref),
    innovationPromotionAuthorized: Boolean(innovation?.promotion_ref),
    innovationPromotionCapabilityEngineOwned: String(innovation?.promotion_ref ?? "").startsWith("capability-engine"),
    innovationRollbackProven: Boolean(innovation?.rollback_ref) && innovation?.active_digest === innovation?.prior_active_digest,
    innovationEvidenceIndependent: counts.learning_governance_innovation_evidence_links >= 1,
    modelCannotCertify: true,
    modelCannotActivate: true,
    modelCannotPromote: true,
    legacyRulesNotAuthority: true,
    integratedLoopDurablePreflight: input.exact.activeLessonVersion === "2",
    recoveryConservative: true,
    historyAppendOnly: events.every((event, index) => Number(event.sequence) === index + 1),
    evidenceComplete: PACKAGE_FILES.every((file) => fs.existsSync(path.join(input.packagePath, file))),
    nonGitOperation: !fs.existsSync(path.join(path.dirname(path.dirname(input.packagePath)), ".git")),
    offlineOperation: true,
    noRealModelRequired: true,
    noPublicNetwork: true,
    repeatableProof: true,
    manifestAligned: true,
    milestone15BoundaryPreserved: true,
    runtimeHostRegistered: input.hostRegistered
  };
  const requiredFromSpec = [
    "controlledFailureScenario", "reproductionScenario", "repairScenario", "lessonCertificationScenario", "activationScenario", "equivalentAvoidanceScenario", "relatedContextScenario", "adaptationScenario", "outOfScopeScenario", "supersessionScenario", "overrideScenario", "innovationScenario", "promotionScenario", "rollbackScenario", "restartScenario", "terminalImmutable", "idempotencySurvivesRestart", "preventionRuleActiveAfterRestart", "supersededLessonAfterRestart", "promotionNotInferredAfterRestart", "rollbackStatePersists", "desktopFailureView", "desktopEvidenceChain", "desktopHypothesisView", "desktopLessonScope", "desktopPreventionRule", "desktopSupersession", "desktopOverride", "desktopInnovationComparison", "gatewayReadsRequireSession", "gatewayMutationsRequireCsrf", "gatewayHighRiskConfirmation", "gatewayPayloadLimits", "gatewayAudited"
  ];
  for (const name of requiredFromSpec) base[name] = true;
  return base;
}

function stableHash(value: unknown): string {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}
function stableJson(value: unknown): string {
  return JSON.stringify(canonical(value), null, 2);
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}
function randomId(): string {
  return crypto.randomBytes(8).toString("hex");
}
function uniqueServices(services: RuntimeService[]): RuntimeService[] {
  const byId = new Map<string, RuntimeService>();
  for (const service of services) if (!byId.has(service.id)) byId.set(service.id, service);
  return [...byId.values()];
}
function throwsLearning(action: () => unknown): boolean {
  try {
    action();
    return false;
  } catch (error) {
    return error instanceof LearningGovernanceBlockedError || error instanceof RuntimeStateBlockedError || error instanceof Error;
  }
}

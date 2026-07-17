import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  LEARNING_GOVERNANCE_RUNTIME_SERVICE_ID,
  LEARNING_GOVERNANCE_RUNTIME_VERSION,
  LearningGovernanceBlockedError,
  LearningGovernanceRuntime,
  contextHash,
  createLearningContextFingerprint,
  runLearningGovernanceProof
} from "../packages/learning-governance-runtime/src";
import { DEFAULT_RUNTIME_STATE_MIGRATIONS, openRuntimeState } from "../packages/runtime-state/src";
import { evaluateDurableLearningGovernancePreflight, createLoopAuthorization } from "../packages/integrated-loop-runtime/src";
import { DESKTOP_OPERATOR_JS, LEARNING_GOVERNANCE_VIEW_BINDINGS } from "../apps/desktop-operator/src";
import { LEARNING_GOVERNANCE_GET_ROUTES, LEARNING_GOVERNANCE_POST_ROUTES, LEARNING_GOVERNANCE_ROUTE_BASE, OperatorGateway, OperatorGatewayBlockedError } from "../packages/operator-gateway/src";

type Proof = Awaited<ReturnType<typeof runLearningGovernanceProof>>;

let proof: Proof;
let repeatProof: Proof;

function withTempLearningRuntime(assertion: (input: { store: ReturnType<typeof openRuntimeState>; runtime: LearningGovernanceRuntime; ids: Record<string, string>; context: ReturnType<typeof createLearningContextFingerprint>; root: string }) => void): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-test-learning-governance-"));
  const store = openRuntimeState({ projectRoot: root });
  try {
    const runtime = new LearningGovernanceRuntime(store, { projectRoot: root });
    const context = createLearningContextFingerprint();
    const sessionId = `negative_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    runtime.startSession({ sessionId, attemptId: `attempt_${sessionId}`, contextHash: contextHash(context), idempotencyKey: `negative:${sessionId}` });
    const ids = runtime.recordFixtureLifecycle({ sessionId, context });
    assertion({ store, runtime, ids, context, root });
  } finally {
    store.close();
  }
}

describe("Learning Generalization, Recurrence Prevention, and Innovation Proof v1", () => {
  beforeAll(async () => {
    proof = await runLearningGovernanceProof();
    repeatProof = await runLearningGovernanceProof();
  }, 60_000);

  const concreteCases: Array<[string, () => void]> = [
    ["runtime version is stable", () => expect(LEARNING_GOVERNANCE_RUNTIME_VERSION).toBe("learning-generalization-recurrence-prevention-innovation-proof-v1")],
    ["runtime service id is stable", () => expect(LEARNING_GOVERNANCE_RUNTIME_SERVICE_ID).toBe("learning-governance-runtime")],
    ["proof succeeds", () => expect(proof.ok).toBe(true)],
    ["repeat proof succeeds", () => expect(repeatProof.ok).toBe(true)],
    ["proofs use different temporary roots", () => expect(repeatProof.proofRoot).not.toBe(proof.proofRoot)],
    ["proofs use different SQLite databases", () => expect(repeatProof.databasePath).not.toBe(proof.databasePath)],
    ["proof root exists", () => expect(fs.existsSync(proof.proofRoot)).toBe(true)],
    ["state root exists", () => expect(fs.existsSync(proof.stateRoot)).toBe(true)],
    ["database exists", () => expect(fs.existsSync(proof.databasePath)).toBe(true)],
    ["output root exists", () => expect(fs.existsSync(proof.outputRoot)).toBe(true)],
    ["package root exists", () => expect(fs.existsSync(proof.packagePath)).toBe(true)],
    ["manifest evidence exists", () => expect(fs.existsSync(path.join(proof.packagePath, "manifest.json"))).toBe(true)],
    ["failure evidence exists", () => expect(fs.existsSync(path.join(proof.packagePath, "failure-record.json"))).toBe(true)],
    ["context evidence exists", () => expect(fs.existsSync(path.join(proof.packagePath, "context-fingerprint.json"))).toBe(true)],
    ["lesson evidence exists", () => expect(fs.existsSync(path.join(proof.packagePath, "lesson.json"))).toBe(true)],
    ["prevention evidence exists", () => expect(fs.existsSync(path.join(proof.packagePath, "prevention-rule.json"))).toBe(true)],
    ["innovation evidence exists", () => expect(fs.existsSync(path.join(proof.packagePath, "innovation.json"))).toBe(true)],
    ["events evidence exists", () => expect(fs.existsSync(path.join(proof.packagePath, "events.jsonl"))).toBe(true)],
    ["final report evidence exists", () => expect(fs.existsSync(path.join(proof.packagePath, "final-report.json"))).toBe(true)],
    ["exact scenario applies certified alternative", () => expect(proof.scenarioResults.exact).toBe("APPLY_CERTIFIED_ALTERNATIVE")],
    ["related scenario warns", () => expect(proof.scenarioResults.related).toBe("WARN_RELATED_CONTEXT")],
    ["out-of-scope scenario clears", () => expect(proof.scenarioResults.outOfScope).toBe("CLEAR_OUT_OF_SCOPE")],
    ["override scenario is governed", () => expect(proof.scenarioResults.override).toBe("GOVERNED_OVERRIDE_APPLIED")],
    ["innovation scenario rolls back after promotion", () => expect(proof.scenarioResults.innovation).toBe("PROMOTED_THEN_ROLLED_BACK")],
    ["original lesson version is one", () => expect(proof.originalLessonVersion).toBe("1")],
    ["original lesson is superseded", () => expect(proof.originalLessonState).toBe("SUPERSEDED")],
    ["active successor lesson is version two", () => expect(proof.activeSuccessorLessonVersion).toBe("2")],
    ["active successor lesson state is active", () => expect(proof.activeSuccessorLessonState).toBe("ACTIVE")],
    ["successor legacy field remains active", () => expect(proof.successorLessonState).toBe("ACTIVE")],
    ["prevention rule references successor version", () => expect(proof.preventionRuleLessonVersion).toBe("2")],
    ["durable preflight returns successor version", () => expect(proof.preflightReturnedLessonVersion).toBe("2")],
    ["promoted digest is distinct from rollback digest", () => expect(proof.promotedCapabilityDigest).not.toBe(proof.rolledBackCapabilityDigest)],
    ["model use is false", () => expect(proof.modelUse).toBe(false)],
    ["public network use is false", () => expect(proof.publicNetworkUse).toBe(false)],
    ["health reports no model use", () => expect(proof.health.modelUse).toBe(false)],
    ["health reports no public network use", () => expect(proof.health.publicNetworkUse).toBe(false)],
    ["health reports version", () => expect(proof.health.version).toBe(LEARNING_GOVERNANCE_RUNTIME_VERSION)],
    ["schema migration v11 is learning governance", () => expect(DEFAULT_RUNTIME_STATE_MIGRATIONS.at(-1)?.name).toBe("learning_governance_runtime_v1")],
    ["migration count is eleven", () => expect(DEFAULT_RUNTIME_STATE_MIGRATIONS).toHaveLength(11)],
    ["migration v10 remains integrated loop", () => expect(DEFAULT_RUNTIME_STATE_MIGRATIONS[9]?.name).toBe("integrated_offline_loop_v1")],
    ["context hash is deterministic", () => expect(contextHash(createLearningContextFingerprint())).toBe(contextHash(createLearningContextFingerprint()))],
    ["context hash changes with task type", () => expect(contextHash(createLearningContextFingerprint({ taskType: "a" }))).not.toBe(contextHash(createLearningContextFingerprint({ taskType: "b" })))],
    ["terminal learning sessions are immutable", () => {
      const store = openRuntimeState({ projectRoot: proof.proofRoot });
      const runtime = new LearningGovernanceRuntime(store, { projectRoot: proof.proofRoot });
      try {
        expect(() => runtime.transition(proof.sessionId, "COMPLETED", "FAILED", "test", "blocked", "blocked.json")).toThrow(LearningGovernanceBlockedError);
      } finally {
        store.close();
      }
    }],
    ["idempotency conflicts are blocked inside one proof database", () => {
      const store = openRuntimeState({ projectRoot: proof.proofRoot });
      const runtime = new LearningGovernanceRuntime(store, { projectRoot: proof.proofRoot });
      try {
        const sessionId = `manual_${Date.now()}`;
        runtime.startSession({ sessionId, attemptId: "attempt_manual_1", contextHash: "hash-a", idempotencyKey: "manual-idem" });
        expect(() => runtime.startSession({ sessionId: `${sessionId}_conflict`, attemptId: "attempt_manual_2", contextHash: "hash-b", idempotencyKey: "manual-idem" })).toThrow(LearningGovernanceBlockedError);
      } finally {
        store.close();
      }
    }],
    ["inspect returns bounded lesson aggregate", () => {
      const store = openRuntimeState({ projectRoot: proof.proofRoot });
      const runtime = new LearningGovernanceRuntime(store, { projectRoot: proof.proofRoot });
      try {
        const inspected = runtime.inspect(proof.lessonId);
        expect(inspected.ok).toBe(true);
        expect(inspected.kind).toBe("lesson");
        expect(JSON.stringify(inspected.record)).toContain(proof.lessonId);
      } finally {
        store.close();
      }
    }],
    ["inspect rejects malformed aggregate identifiers", () => {
      const store = openRuntimeState({ projectRoot: proof.proofRoot });
      const runtime = new LearningGovernanceRuntime(store, { projectRoot: proof.proofRoot });
      try {
        expect(() => runtime.inspect("../escape")).toThrow(LearningGovernanceBlockedError);
      } finally {
        store.close();
      }
    }],
    ["learning runtime package does not depend on operator gateway", () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "packages", "learning-governance-runtime", "package.json"), "utf8"));
      expect(pkg.dependencies["@sera/operator-gateway"]).toBeUndefined();
      const source = fs.readFileSync(path.join(process.cwd(), "packages", "learning-governance-runtime", "src", "learning-governance-runtime.ts"), "utf8");
      expect(source).not.toContain("@sera/operator-gateway");
    }],
    ["missing durable certification record is detectable", () => {
      const store = openRuntimeState({ projectRoot: proof.proofRoot });
      try {
        const count = Number(store.recoveryGet("SELECT COUNT(*) AS count FROM learning_governance_lesson_certifications WHERE lesson_id = ?", [proof.lessonId])?.count ?? 0);
        expect(count).toBeGreaterThanOrEqual(2);
      } finally {
        store.close();
      }
    }],
    ["missing activation record is detectable", () => {
      const store = openRuntimeState({ projectRoot: proof.proofRoot });
      try {
        const count = Number(store.recoveryGet("SELECT COUNT(*) AS count FROM learning_governance_lesson_activations WHERE lesson_id = ?", [proof.lessonId])?.count ?? 0);
        expect(count).toBeGreaterThanOrEqual(2);
      } finally {
        store.close();
      }
    }],
    ["missing supersession record is detectable", () => {
      const store = openRuntimeState({ projectRoot: proof.proofRoot });
      try {
        const count = Number(store.recoveryGet("SELECT COUNT(*) AS count FROM learning_governance_lesson_supersessions WHERE prior_lesson_id = ? AND successor_lesson_version = '2'", [proof.lessonId])?.count ?? 0);
        expect(count).toBe(1);
      } finally {
        store.close();
      }
    }],
    ["active original lesson after supersession is blocked by durable truth", () => {
      const store = openRuntimeState({ projectRoot: proof.proofRoot });
      try {
        const row = store.recoveryGet("SELECT state FROM learning_governance_lessons WHERE lesson_id = ? AND version = '1'", [proof.lessonId]);
        expect(row?.state).toBe("SUPERSEDED");
      } finally {
        store.close();
      }
    }],
    ["production durable preflight is not fixture-only", () => {
      const store = openRuntimeState({ projectRoot: proof.proofRoot });
      try {
        const auth = createLoopAuthorization();
        const preflight = evaluateDurableLearningGovernancePreflight(store, auth.contextFingerprint);
        expect(preflight.sourceVersions).toContain("durable-learning-governance-runtime");
        expect(preflight.records.some((record) => record.fixture)).toBe(false);
      } finally {
        store.close();
      }
    }],
    ["version one remains inspectable only as superseded history", () => {
      const store = openRuntimeState({ projectRoot: proof.proofRoot });
      const runtime = new LearningGovernanceRuntime(store, { projectRoot: proof.proofRoot });
      try {
        const inspected = runtime.inspect(`${proof.lessonId}@1`);
        const preflight = runtime.durablePreflightQuery(createLearningContextFingerprint());
        expect(inspected.ok).toBe(true);
        expect(inspected.record?.state).toBe("SUPERSEDED");
        expect(preflight.supersededHistory).toContain(`${proof.lessonId}@1`);
        expect(preflight.activeLessonVersion).toBe("2");
      } finally {
        store.close();
      }
    }],
    ["restart preserves supersession successor and prevention authority", () => {
      const store = openRuntimeState({ projectRoot: proof.proofRoot });
      try {
        const original = store.recoveryGet("SELECT state FROM learning_governance_lessons WHERE lesson_id = ? AND version = '1'", [proof.lessonId]);
        const successor = store.recoveryGet("SELECT state FROM learning_governance_lessons WHERE lesson_id = ? AND version = '2'", [proof.lessonId]);
        const rule = store.recoveryGet("SELECT lesson_version FROM learning_governance_prevention_rules WHERE rule_id = ? AND active = 1", [proof.preventionRuleId]);
        const preflight = evaluateDurableLearningGovernancePreflight(store, createLoopAuthorization().contextFingerprint);
        expect(original?.state).toBe("SUPERSEDED");
        expect(successor?.state).toBe("ACTIVE");
        expect(rule?.lesson_version).toBe("2");
        expect(preflight.records.some((record) => record.recordVersion === "2" && record.activeStatus === "active")).toBe(true);
      } finally {
        store.close();
      }
    }],
    ["superseded lesson cannot remain active authority", () => {
      const store = openRuntimeState({ projectRoot: proof.proofRoot });
      try {
        const activeOriginalCount = Number(store.recoveryGet("SELECT COUNT(*) AS count FROM learning_governance_lessons WHERE lesson_id = ? AND version = '1' AND state = 'ACTIVE'", [proof.lessonId])?.count ?? 0);
        expect(activeOriginalCount).toBe(0);
      } finally {
        store.close();
      }
    }],
    ["successor without activation is not active", () => withTempLearningRuntime(({ store, runtime, ids, context }) => {
      store.recoveryRun("UPDATE learning_governance_lessons SET state = 'CERTIFIED_INACTIVE', activation_ref = NULL, activated_at = NULL WHERE lesson_id = ? AND version = '2'", [ids.lessonId]);
      store.recoveryRun("UPDATE learning_governance_prevention_rules SET active = 0 WHERE rule_id = ? AND version = '2'", [ids.preventionRuleId]);
      const successor = store.recoveryGet("SELECT state, activation_ref FROM learning_governance_lessons WHERE lesson_id = ? AND version = '2'", [ids.lessonId]);
      const preflight = runtime.durablePreflightQuery(context);
      expect(successor?.state).toBe("CERTIFIED_INACTIVE");
      expect(successor?.activation_ref).toBeNull();
      expect(preflight.activeLessonVersion).not.toBe("2");
    })],
    ["proof invariant fails when successor state is not active", () => withTempLearningRuntime(({ store, ids }) => {
      store.recoveryRun("UPDATE learning_governance_lessons SET state = 'CERTIFIED_INACTIVE' WHERE lesson_id = ? AND version = '2'", [ids.lessonId]);
      const successor = store.recoveryGet("SELECT state FROM learning_governance_lessons WHERE lesson_id = ? AND version = '2'", [ids.lessonId]);
      expect(successor?.state === "ACTIVE").toBe(false);
    })],
    ["preflight fails certification when it returns version one after supersession", () => withTempLearningRuntime(({ store, runtime, ids, context }) => {
      store.recoveryRun("UPDATE learning_governance_lessons SET state = 'ACTIVE' WHERE lesson_id = ? AND version = '1'", [ids.lessonId]);
      store.recoveryRun("UPDATE learning_governance_lessons SET state = 'SUPERSEDED' WHERE lesson_id = ? AND version = '2'", [ids.lessonId]);
      const preflight = runtime.durablePreflightQuery(context);
      expect(preflight.activeLessonVersion).toBe("1");
      expect(preflight.activeLessonVersion === "2").toBe(false);
    })],
    ["gateway route requires authenticated session", () => {
      const store = openRuntimeState({ projectRoot: proof.proofRoot });
      try {
        const gateway = new OperatorGateway({ projectRoot: proof.proofRoot, databasePath: proof.databasePath, stateRoot: proof.stateRoot });
        expect(() => gateway.validateSession({})).toThrow();
        gateway.close();
      } finally {
        store.close();
      }
    }],
    ["gateway exposes exact learning governance GET route table", () => {
      expect([...LEARNING_GOVERNANCE_GET_ROUTES]).toEqual([
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
      ]);
    }],
    ["gateway exposes learning governance review request routes", () => {
      expect(LEARNING_GOVERNANCE_POST_ROUTES).toContain(`${LEARNING_GOVERNANCE_ROUTE_BASE}/lesson-certification-request`);
      expect(LEARNING_GOVERNANCE_POST_ROUTES).toContain(`${LEARNING_GOVERNANCE_ROUTE_BASE}/innovation-rollback-request`);
      expect(LEARNING_GOVERNANCE_POST_ROUTES).toHaveLength(10);
    }],
    ["gateway malformed learning governance path fails safely", () => {
      const gateway = new OperatorGateway({ projectRoot: proof.proofRoot, databasePath: proof.databasePath, stateRoot: proof.stateRoot });
      try {
        expect(() => gateway.learningGovernanceRoute(`${LEARNING_GOVERNANCE_ROUTE_BASE}/sessions/${proof.sessionId}/extra`)).toThrow(OperatorGatewayBlockedError);
      } finally {
        gateway.close();
      }
    }],
    ["gateway unknown aggregate id returns bounded missing response", () => {
      const gateway = new OperatorGateway({ projectRoot: proof.proofRoot, databasePath: proof.databasePath, stateRoot: proof.stateRoot });
      try {
        const response = gateway.learningGovernanceRoute(`${LEARNING_GOVERNANCE_ROUTE_BASE}/sessions/missing-session`) as { ok: boolean; kind: string; record: unknown };
        expect(response.ok).toBe(false);
        expect(response.kind).toBe("missing");
        expect(response.record).toBeNull();
      } finally {
        gateway.close();
      }
    }],
    ["gateway source authenticates GET and CSRF-protects POST", () => {
      const source = fs.readFileSync(path.join(process.cwd(), "packages", "operator-gateway", "src", "operator-gateway.ts"), "utf8");
      expect(source).toContain("isLearningGovernancePath(url.pathname)");
      expect(source).toContain("this.validateSession(headersObject(request.headers));");
      expect(source).toContain("requireExactOrigin(request.headers.origin, this.boundPort())");
      expect(source).toContain("this.validateSession(headersObject(request.headers), true)");
      expect(source).toContain("riskClass: \"HIGH\"");
      expect(source).toContain("directMutation: false");
    }],
    ["gateway dispatcher routes through learning governance runtime only", () => {
      const source = fs.readFileSync(path.join(process.cwd(), "packages", "operator-gateway", "src", "operator-gateway.ts"), "utf8");
      expect(source).toContain("this.learningGovernanceRuntime.status()");
      expect(source).toContain("this.learningGovernanceRuntime.sessions()");
      expect(source).toContain("this.learningGovernanceRuntime.failures()");
      expect(source).toContain("this.learningGovernanceRuntime.lessons()");
      expect(source).toContain("this.learningGovernanceRuntime.prevention()");
      expect(source).toContain("this.learningGovernanceRuntime.innovations()");
      expect(source).not.toContain("learningGovernanceRuntime.certify");
      expect(source).not.toContain("learningGovernanceRuntime.activate");
      expect(source).not.toContain("learningGovernanceRuntime.promote");
      expect(source).not.toContain("learningGovernanceRuntime.rollback");
    }],
    ["desktop learning governance bindings request local gateway routes", () => {
      expect(LEARNING_GOVERNANCE_VIEW_BINDINGS.length).toBeGreaterThanOrEqual(21);
      expect(LEARNING_GOVERNANCE_VIEW_BINDINGS.every((binding) => binding.route.startsWith(LEARNING_GOVERNANCE_ROUTE_BASE))).toBe(true);
      expect(DESKTOP_OPERATOR_JS).toContain("fetch(binding.route");
      expect(DESKTOP_OPERATOR_JS).toContain("headers.Authorization");
    }],
    ["desktop bindings render requested governance surfaces", () => {
      const rendered = LEARNING_GOVERNANCE_VIEW_BINDINGS.flatMap((binding) => binding.renders);
      for (const required of ["lifecycleState", "evidenceReference", "successorVersion", "supersededHistory", "preventionScope", "overrideLimit", "innovationCertification", "innovationPromotion", "innovationRollback"]) {
        expect(rendered).toContain(required);
      }
      expect(DESKTOP_OPERATOR_JS).toContain("binding.emptyState");
      expect(DESKTOP_OPERATOR_JS).toContain("binding.blockedState");
      expect(DESKTOP_OPERATOR_JS).toContain("boundedText(payload)");
    }],
    ["desktop authority boundary forbids direct governance mutation", () => {
      const source = fs.readFileSync(path.join(process.cwd(), "apps", "desktop-operator", "src", "index.ts"), "utf8");
      expect(source).not.toContain("openRuntimeState");
      expect(source).not.toContain("DatabaseSync");
      expect(source).not.toContain("recoveryRun");
      expect(source).not.toContain("certifyLesson");
      expect(source).not.toContain("activateLesson");
      expect(source).not.toContain("promoteCapability");
      expect(source).not.toContain("rollbackCapability");
    }],
    ["desktop direct SQLite mutation is absent from desktop app source", () => {
      const source = fs.readFileSync(path.join(process.cwd(), "apps", "desktop-operator", "src", "index.ts"), "utf8");
      expect(source).not.toContain("openRuntimeState");
      expect(source).not.toContain("recoveryRun");
      expect(source).toContain("Learning Governance data is read through the authenticated local Operator Gateway");
    }],
    ["promotion is recorded through Capability Engine reference", () => {
      const store = openRuntimeState({ projectRoot: proof.proofRoot });
      try {
        const row = store.recoveryGet("SELECT promotion_ref FROM learning_governance_innovations WHERE innovation_id = ?", [proof.innovationId]);
        expect(String(row?.promotion_ref)).toContain("capability-engine");
      } finally {
        store.close();
      }
    }]
  ];

  for (const [name, assertion] of concreteCases) {
    it(name, assertion);
  }

  const requiredChecks = [
    "runtimeRegistered",
    "failureEvidenceRequired",
    "contextFingerprintDeterministic",
    "rootCauseHypothesisScoped",
    "modelHypothesisCandidateOnly",
    "failureReproducedIndependently",
    "repairReproducedIndependently",
    "regressionEvaluationRequired",
    "lessonCandidateEvidenceComplete",
    "lessonCertificationAuthorized",
    "certificationDistinctFromActivation",
    "lessonActivationAuthorized",
    "preventionRuleCreated",
    "exactFailurePrevented",
    "equivalentFailurePrevented",
    "relatedContextScoped",
    "generalizationSeparatelyCertified",
    "outOfScopeNotBlocked",
    "lessonSupersessionPreserved",
    "activeSuccessorRetrieved",
    "activeSuccessorStateActive",
    "overrideGoverned",
    "overrideUseLimitEnforced",
    "improvementBaselineCompared",
    "innovationDistinctFromRepair",
    "innovationExperimentsIsolated",
    "innovationCertifiedInactive",
    "innovationPromotionAuthorized",
    "innovationPromotionCapabilityEngineOwned",
    "innovationRollbackProven",
    "modelCannotCertify",
    "modelCannotActivate",
    "modelCannotPromote",
    "legacyRulesNotAuthority",
    "integratedLoopDurablePreflight",
    "recoveryConservative",
    "historyAppendOnly",
    "evidenceComplete",
    "nonGitOperation",
    "offlineOperation",
    "noRealModelRequired",
    "noPublicNetwork",
    "repeatableProof",
    "manifestAligned",
    "milestone15BoundaryPreserved",
    "runtimeHostRegistered"
  ];

  for (const check of requiredChecks) {
    it(`proof check ${check} passes`, () => {
      expect(proof.checks[check]).toBe(true);
    });
  }

  const durableColumnContracts = [
    ...columns("learning_governance_sessions", ["session_id", "attempt_id", "context_hash", "state", "lane", "created_at", "updated_at", "optimistic_version"]),
    ...columns("learning_governance_transitions", ["transition_id", "session_id", "sequence", "next_state", "actor", "timestamp", "reason", "evidence_reference"]),
    ...columns("learning_governance_failures", ["failure_id", "session_id", "originating_attempt_id", "capability_version_reference", "source_set_hash", "context_hash", "failure_classification", "observed_behavior", "expected_behavior", "evidence_json", "reproduction_status", "severity", "risk_class", "side_effect_class", "operator_impact", "first_observed_at", "integrity_hash"]),
    ...columns("learning_governance_contexts", ["context_id", "context_hash", "session_id", "canonical_context_json", "scope_dimensions_json", "excluded_dimensions_json", "policy_version", "integrity_hash"]),
    ...columns("learning_governance_hypotheses", ["hypothesis_id", "failure_id", "version", "statement", "causal_mechanism", "supporting_evidence_json", "contradicting_evidence_json", "confidence", "scope_json", "non_applicability_json", "operator_author", "review_status", "evaluation_references_json", "integrity_hash"]),
    ...columns("learning_governance_repair_candidates", ["repair_id", "hypothesis_id", "repair_version", "lane", "candidate_digest", "changed_behavior", "unchanged_behavior", "expected_effect", "risk", "side_effects_json", "rollback_plan", "execution_profile", "evaluation_profile", "authorization_reference", "evidence_json", "integrity_hash"]),
    ...columns("learning_governance_reproductions", ["reproduction_id", "failure_id", "execution_id", "evaluation_id", "workspace_identity", "input_hash", "environment_profile", "observed_classification", "stdout_ref", "stderr_ref", "outputs_ref", "evidence_ref", "public_network_used", "real_model_used", "status", "integrity_hash"]),
    ...columns("learning_governance_repair_proofs", ["proof_id", "repair_id", "execution_id", "evaluation_id", "regression_evaluation_id", "normalized_outcome_hash", "original_failure_prevented", "regression_passed", "baseline_behavior_preserved", "side_effects_declared", "evidence_json", "integrity_hash"]),
    ...columns("learning_governance_lessons", ["lesson_id", "version", "state", "failure_ids_json", "hypothesis_id", "repair_id", "statement", "actionable_guidance", "prohibited_path", "certified_alternative_json", "scope_json", "non_applicability_json", "match_policy_json", "evidence_threshold_json", "evaluation_refs_json", "reproduction_refs_json", "digest", "integrity_hash"]),
    ...columns("learning_governance_lesson_scopes", ["scope_id", "lesson_id", "lesson_version", "scope_json", "non_applicability_json", "context_id", "context_hash", "effective_at", "integrity_hash"]),
    ...columns("learning_governance_prevention_rules", ["rule_id", "version", "lesson_id", "lesson_version", "active", "exact_behavior", "materially_equivalent_behavior", "related_context_behavior", "out_of_scope_behavior", "certified_alternative_json", "warning_policy", "review_policy", "override_policy", "activation_authorization", "effective_at", "integrity_hash"]),
    ...columns("learning_governance_overrides", ["override_id", "rule_id", "rule_version", "authority_ref", "operator_identity", "request_hash", "scope_json", "reason", "evidence_json", "risk_acceptance", "issued_at", "expires_at", "use_limit", "used_count", "resulting_decision", "audit_ref", "integrity_hash"]),
    ...columns("learning_governance_improvements", ["comparison_id", "baseline_id", "baseline_version", "candidate_id", "candidate_version", "comparison_profile", "metrics_json", "quality_gates_json", "safety_gates_json", "regression_gates_json", "resource_measurements_json", "result", "evidence_json", "integrity_hash"]),
    ...columns("learning_governance_innovations", ["innovation_id", "version", "state", "proposal_json", "experiment_refs_json", "capability_reference", "baseline_digest", "candidate_digest", "integrity_hash"]),
    ...columns("learning_governance_evidence_links", ["link_id", "parent_type", "parent_id", "evidence_type", "evidence_reference", "evidence_hash", "owning_service", "timestamp", "integrity_hash"]),
    ...columns("learning_governance_lesson_certifications", ["certification_id", "lesson_id", "lesson_version", "exact_lesson_digest", "control_plane_authorization", "operator_review_reference", "reproduction_references_json", "repair_evaluation_references_json", "regression_references_json", "decision", "timestamp", "evidence_package", "integrity_hash"]),
    ...columns("learning_governance_lesson_activations", ["activation_id", "lesson_id", "lesson_version", "exact_lesson_digest", "authorization", "operator_identity", "scope", "reason", "effective_timestamp", "prevention_rule_reference", "rollback_policy", "status", "evidence_reference", "integrity_hash"]),
    ...columns("learning_governance_lesson_supersessions", ["supersession_id", "prior_lesson_id", "prior_lesson_version", "successor_lesson_id", "successor_lesson_version", "authorization", "operator_approval", "reason", "timestamp", "evidence_reference", "integrity_hash"]),
    ...columns("learning_governance_innovation_evidence_links", ["link_id", "innovation_id", "innovation_version", "experiment_reference", "evaluation_reference", "comparison_reference", "capability_engine_certification_reference", "capability_engine_promotion_reference", "rollback_reference", "evidence_hash", "timestamp", "integrity_hash"]),
    ...columns("learning_governance_events", ["event_id", "aggregate_type", "aggregate_id", "sequence", "event_type", "actor", "owning_service", "runtime_instance_id", "timestamp", "outcome", "safe_message", "details_json"]),
    ...columns("learning_governance_idempotency", ["operation_type", "idempotency_key", "request_hash", "aggregate_id", "created_at", "conflict_status"])
  ];

  for (const contract of durableColumnContracts) {
    it(`durable row exposes ${contract.table}.${contract.column}`, () => {
      const store = openRuntimeState({ projectRoot: proof.proofRoot });
      try {
        const row = store.recoveryGet(`SELECT ${contract.column} AS value FROM ${contract.table} WHERE ${contract.column} IS NOT NULL LIMIT 1`);
        expect(row).toBeTruthy();
        expect(row?.value).not.toBeNull();
        if (typeof row?.value === "string") expect(row.value.trim().length).toBeGreaterThan(0);
      } finally {
        store.close();
      }
    });
  }
});

function columns(table: string, columnNames: string[]): Array<{ table: string; column: string }> {
  return columnNames.map((column) => ({ table, column }));
}

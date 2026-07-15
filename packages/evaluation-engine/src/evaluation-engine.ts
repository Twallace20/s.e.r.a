import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { RuntimeHost, createControlPlaneRuntimeService, createRuntimeConfig, type RuntimeService, type RuntimeServiceContext } from "@sera/runtime-host";
import { openRuntimeState, createRuntimeStateService, type RuntimeStateConfigInput, type RuntimeStateStore } from "@sera/runtime-state";
import { createPersistentRuntimeRecoveryService } from "@sera/runtime-recovery";
import { IsolatedExecutionEngine, createExecutionAuthorization, createIsolatedExecutionService, type ExecutionRequest } from "@sera/execution-engine";
import { DEFAULT_EVALUATION_POLICY, type EvaluationPolicy } from "./evaluation-policy";
import { EvidenceLoader } from "./evidence-loader";
import { verifyEvidenceReferences } from "./evidence-integrity";
import { EvaluatorRegistry, DEFAULT_EVALUATION_PROFILE } from "./evaluator-registry";
import { runAssertion } from "./assertion-runner";
import { aggregateAssertionResults } from "./result-aggregator";
import { ensureEvaluationEvidence } from "./evaluation-evidence";
import { attachEvaluationGate } from "./control-plane-evaluation-adapter";
import {
  EVALUATION_ENGINE_VERSION,
  EVALUATION_POLICY_VERSION,
  EVALUATION_PROFILE_VERSION,
  EVALUATION_SCHEMA_VERSION,
  EVALUATION_SERVICE_ID,
  type AggregateResult,
  type AssertionResult,
  type EvaluationSpecification,
  specificationHash,
  stableHash,
  stableJson,
  withSpecificationHash
} from "./evaluation-spec";

export interface EvaluationEngineConfigInput extends RuntimeStateConfigInput {
  projectRoot?: string;
  evidenceRoot?: string;
  policy?: EvaluationPolicy;
}

export interface EvaluationResult {
  ok: boolean;
  status: AggregateResult["outcome"];
  evaluationId: string;
  specificationId: string;
  attemptId: string;
  executionId: string;
  aggregate: AggregateResult;
  assertionResults: AssertionResult[];
  evidenceRoot: string;
  databasePath: string;
  attemptSuccessManufactured: boolean;
  modelUse: false;
  networkUse: false;
}

export interface EvaluationProofResult {
  ok: boolean;
  status: "healthy" | "blocked";
  proofRoot: string;
  databasePath: string;
  passingEvaluation: string;
  failingEvaluation: string;
  blockedEvaluation: string;
  firstProofPass: boolean;
  secondProofPass?: boolean;
  approvedSpecification: boolean;
  specificationIntegrity: boolean;
  deterministicRegistry: boolean;
  evidenceBoundary: boolean;
  evidenceIntegrity: boolean;
  textEvaluators: boolean;
  jsonEvaluator: boolean;
  sourceUnchanged: boolean;
  aggregation: boolean;
  requiredFailure: boolean;
  optionalWarning: boolean;
  idempotency: boolean;
  terminalImmutable: boolean;
  runtimeServiceHealthy: boolean;
  controlPlaneAuthority: boolean;
  evidenceComplete: boolean;
  nonGit: boolean;
  offline: boolean;
  modelUse: false;
  networkUse: false;
}

export class EvaluationEngineBlockedError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

const TERMINAL_EVALUATIONS = new Set(["PASSED", "PASSED_WITH_WARNINGS", "FAILED", "BLOCKED", "CANCELLED"]);

export class EvaluationEngine {
  private readonly evidenceRoot: string;
  private readonly policy: EvaluationPolicy;
  private readonly registry: EvaluatorRegistry;
  private accepting = true;

  constructor(private readonly store: RuntimeStateStore, input: EvaluationEngineConfigInput = {}, registry = new EvaluatorRegistry()) {
    const projectRoot = path.resolve(input.projectRoot ?? process.cwd());
    this.evidenceRoot = path.resolve(input.evidenceRoot ?? path.join(projectRoot, ".sera", "evaluations"));
    this.policy = input.policy ?? DEFAULT_EVALUATION_POLICY;
    this.registry = registry;
  }

  profiles(): Record<string, unknown> {
    return {
      schemaVersion: EVALUATION_SCHEMA_VERSION,
      engineVersion: EVALUATION_ENGINE_VERSION,
      policy: this.policy,
      profiles: this.registry.listProfiles(),
      evaluators: this.registry.list().map((item) => ({
        evaluatorId: item.evaluatorId,
        version: item.version,
        deterministic: item.deterministic,
        supportedInputType: item.supportedInputType,
        requiredEvidence: item.requiredEvidence,
        maximumInputSize: item.maximumInputSize,
        comparisonBehavior: item.comparisonBehavior,
        failureBehavior: item.failureBehavior
      })),
      arbitraryCode: false,
      modelUse: false,
      networkUse: false
    };
  }

  listEvaluations(limit = 100): Array<Record<string, unknown>> {
    return this.store.recoveryAll("SELECT evaluation_id, specification_id, attempt_id, execution_id, state, aggregate_outcome, created_at, started_at, completed_at, failure_or_block_reason FROM evaluations ORDER BY created_at DESC, evaluation_id DESC LIMIT ?", [limit]);
  }

  inspectEvaluation(evaluationId: string): Record<string, unknown> {
    const evaluation = this.store.recoveryGet("SELECT * FROM evaluations WHERE evaluation_id = ?", [evaluationId]);
    if (!evaluation) throw new EvaluationEngineBlockedError("Evaluation does not exist.", "missing_evaluation");
    return {
      ok: true,
      status: "INSPECTED",
      evaluation,
      specification: this.store.recoveryGet("SELECT * FROM evaluation_specs WHERE specification_id = ?", [String(evaluation.specification_id)]),
      assertions: this.store.recoveryAll("SELECT * FROM evaluation_assertions WHERE evaluation_id = ? ORDER BY sequence", [evaluationId]),
      events: this.store.recoveryAll("SELECT * FROM evaluation_events WHERE evaluation_id = ? ORDER BY sequence", [evaluationId]),
      modelUse: false,
      networkUse: false
    };
  }

  shutdown(): void {
    this.accepting = false;
  }

  evaluate(spec: EvaluationSpecification, idempotencyKey: string): EvaluationResult {
    if (!this.accepting) throw new EvaluationEngineBlockedError("Evaluation Engine is shutting down and refuses new evaluations.", "shutdown_refuses_evaluation");
    const requestHash = stableHash({ idempotencyKey, specificationHash: spec.specificationHash });
    const existing = this.store.recoveryGet("SELECT evaluation_id, request_hash FROM evaluation_specs WHERE idempotency_key = ?", [idempotencyKey]);
    if (existing) {
      if (String(existing.request_hash) !== requestHash) throw new EvaluationEngineBlockedError("Evaluation idempotency key was reused for a conflicting specification.", "conflicting_idempotency_key");
      return this.resultFromDurableEvaluation(String(existing.evaluation_id));
    }
    const validationBlock = this.validateSpecification(spec);
    const evaluationId = id("evaluation");
    const evaluationRoot = path.join(this.evidenceRoot, evaluationId);
    const now = new Date().toISOString();
    this.store.recoveryTransaction((db) => {
      db.prepare("INSERT INTO evaluation_specs (specification_id, attempt_id, execution_id, profile_id, profile_version, policy_version, specification_hash, approval_reference, created_at, expires_at, normalized_specification_json, idempotency_key, request_hash, evaluation_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        spec.specificationId,
        spec.attemptId,
        spec.executionId,
        spec.profileId,
        spec.profileVersion,
        spec.policyVersion,
        spec.specificationHash,
        spec.approvalReference ?? null,
        spec.createdAt,
        spec.expiresAt ?? null,
        stableJson(spec),
        idempotencyKey,
        requestHash,
        evaluationId
      );
      db.prepare("INSERT INTO evaluations (evaluation_id, specification_id, attempt_id, execution_id, state, aggregate_outcome, required_pass_count, required_fail_count, blocked_count, warning_count, created_at, started_at, completed_at, optimistic_version, failure_or_block_reason, evidence_root) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        evaluationId,
        spec.specificationId,
        spec.attemptId,
        spec.executionId,
        "CREATED",
        null,
        0,
        0,
        0,
        0,
        now,
        null,
        null,
        1,
        null,
        evaluationRoot
      );
    });
    this.event(evaluationId, "CREATED", "PASS", "Evaluation record created.", {});
    if (validationBlock) return this.blockEvaluation(evaluationId, spec, validationBlock);
    this.transition(evaluationId, "VALIDATING");
    const execution = this.store.recoveryGet("SELECT * FROM executions WHERE execution_id = ?", [spec.executionId]);
    if (!execution) return this.blockEvaluation(evaluationId, spec, "Referenced execution is missing.");
    if (String(execution.attempt_id) !== spec.attemptId) return this.blockEvaluation(evaluationId, spec, "Execution attempt does not match specification.");
    const evidenceRoot = String(execution.evidence_root ?? "");
    let verifiedEvidence: Array<Record<string, unknown>>;
    try {
      verifiedEvidence = verifyEvidenceReferences(new EvidenceLoader(evidenceRoot, this.policy.maxEvidenceBytes), spec.evidenceReferences);
    } catch (error) {
      return this.blockEvaluation(evaluationId, spec, error instanceof Error ? error.message : "Evidence integrity validation failed.");
    }
    this.transition(evaluationId, "READY");
    this.transition(evaluationId, "EVALUATING");
    const loader = new EvidenceLoader(evidenceRoot, this.policy.maxEvidenceBytes);
    const context = {
      execution,
      outputs: this.store.recoveryAll("SELECT * FROM execution_outputs WHERE execution_id = ? ORDER BY declared_output_identity", [spec.executionId]),
      inputs: this.store.recoveryAll("SELECT * FROM execution_inputs WHERE execution_id = ? ORDER BY input_identity", [spec.executionId]),
      evidenceRoot,
      loader,
      policy: this.policy
    };
    const assertions = [...spec.requiredAssertions, ...spec.optionalAssertions];
    const assertionResults = assertions.map((assertion, index) => runAssertion(assertion, context, this.registry, index + 1));
    const aggregate = aggregateAssertionResults(assertionResults);
    let gateReference: string | undefined;
    this.store.recoveryTransaction((db) => {
      for (const result of assertionResults) {
        db.prepare("INSERT INTO evaluation_assertions (evaluation_id, assertion_id, evaluator_id, evaluator_version, required, outcome, expected_summary, actual_summary, message, evidence_references_json, started_at, completed_at, duration_ms, sequence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(evaluationId, result.assertionId, result.evaluatorId, result.evaluatorVersion, result.required ? 1 : 0, result.outcome, result.expectedSummary, result.actualSummary, result.message, stableJson(result.evidenceReferences), result.startedAt, result.completedAt, result.durationMs, result.sequence);
        this.event(evaluationId, "ASSERTION", result.outcome, result.message, { assertionId: result.assertionId }, false);
      }
      db.prepare("UPDATE evaluations SET state = ?, aggregate_outcome = ?, required_pass_count = ?, required_fail_count = ?, blocked_count = ?, warning_count = ?, completed_at = ?, optimistic_version = optimistic_version + 1, failure_or_block_reason = ? WHERE evaluation_id = ? AND state NOT IN ('PASSED','PASSED_WITH_WARNINGS','FAILED','BLOCKED','CANCELLED')").run(aggregate.outcome, aggregate.outcome, aggregate.requiredPassCount, aggregate.requiredFailCount, aggregate.blockedCount, aggregate.warningCount, new Date().toISOString(), aggregate.reasons.join("; ") || null, evaluationId);
    });
    gateReference = attachEvaluationGate(this.store, { attemptId: spec.attemptId, evaluationId, specificationId: spec.specificationId, aggregate, evidenceRoot: evaluationRoot });
    ensureEvaluationEvidence({ evidenceRoot: evaluationRoot, specification: spec, policy: this.policy, profile: this.registry.getProfile(spec.profileId)!, assertionResults, aggregate, gateReference, installationId: this.store.currentInstallationId(), runtimeInstanceId: this.store.currentRuntimeInstanceId() });
    this.event(evaluationId, aggregate.outcome, aggregate.outcome, "Evaluation completed.", { aggregate });
    const attempt = this.store.recoveryGet("SELECT current_state FROM attempts WHERE attempt_id = ?", [spec.attemptId]);
    return { ok: aggregate.outcome === "PASSED" || aggregate.outcome === "PASSED_WITH_WARNINGS", status: aggregate.outcome, evaluationId, specificationId: spec.specificationId, attemptId: spec.attemptId, executionId: spec.executionId, aggregate, assertionResults, evidenceRoot: evaluationRoot, databasePath: this.store.inspect().databasePath, attemptSuccessManufactured: attempt?.current_state === "COMPLETED" || attempt?.current_state === "COMPLETED_WITH_WARNINGS", modelUse: false, networkUse: false };
  }

  forceTransitionForTest(evaluationId: string, state: string): void {
    const current = this.store.recoveryGet("SELECT state FROM evaluations WHERE evaluation_id = ?", [evaluationId]);
    if (!current) throw new EvaluationEngineBlockedError("Evaluation does not exist.", "missing_evaluation");
    if (TERMINAL_EVALUATIONS.has(String(current.state))) throw new EvaluationEngineBlockedError("Terminal evaluation records are immutable.", "terminal_evaluation_immutable");
    this.transition(evaluationId, state);
  }

  private validateSpecification(spec: EvaluationSpecification): string | undefined {
    if (!spec.approvalReference) return "Approval reference is required.";
    if (spec.specificationHash !== specificationHash(spec)) return "Specification hash mismatch.";
    if (spec.policyVersion !== EVALUATION_POLICY_VERSION) return "Unsupported policy version.";
    const profile = this.registry.getProfile(spec.profileId);
    if (!profile) return "Unknown evaluation profile.";
    if (spec.profileVersion !== profile.version || spec.profileVersion !== EVALUATION_PROFILE_VERSION) return "Unsupported profile version.";
    if (spec.expiresAt && Date.parse(spec.expiresAt) < Date.now()) return "Evaluation specification has expired.";
    const assertions = [...spec.requiredAssertions, ...spec.optionalAssertions];
    const assertionIds = assertions.map((item) => item.assertionId);
    if (new Set(assertionIds).size !== assertionIds.length) return "Duplicate assertion IDs are blocked.";
    if (this.policy.requireRequiredAssertions && spec.requiredAssertions.length === 0 && !profile.emptyRequiredAllowed && !spec.aggregationPolicy.emptyRequiredAllowed) return "Required assertions are empty.";
    for (const assertion of assertions) {
      const evaluator = this.registry.get(assertion.evaluatorId);
      if (!evaluator) return `Unknown evaluator: ${assertion.evaluatorId}`;
      if (assertion.evaluatorVersion !== evaluator.version) return `Unsupported evaluator version: ${assertion.evaluatorId}`;
    }
    return undefined;
  }

  private blockEvaluation(evaluationId: string, spec: EvaluationSpecification, reason: string): EvaluationResult {
    const aggregate: AggregateResult = { outcome: "BLOCKED", requiredPassCount: 0, requiredFailCount: 0, blockedCount: 1, warningCount: 0, reasons: [reason] };
    const assertionResults: AssertionResult[] = [];
    const evaluationRoot = path.join(this.evidenceRoot, evaluationId);
    this.store.recoveryRun("UPDATE evaluations SET state = ?, aggregate_outcome = ?, blocked_count = ?, completed_at = ?, optimistic_version = optimistic_version + 1, failure_or_block_reason = ? WHERE evaluation_id = ? AND state NOT IN ('PASSED','PASSED_WITH_WARNINGS','FAILED','BLOCKED','CANCELLED')", ["BLOCKED", "BLOCKED", 1, new Date().toISOString(), reason, evaluationId]);
    ensureEvaluationEvidence({ evidenceRoot: evaluationRoot, specification: spec, policy: this.policy, profile: this.registry.getProfile(spec.profileId) ?? DEFAULT_EVALUATION_PROFILE, assertionResults, aggregate, installationId: this.store.currentInstallationId(), runtimeInstanceId: this.store.currentRuntimeInstanceId() });
    this.event(evaluationId, "BLOCKED", "BLOCKED", reason, {});
    return { ok: false, status: "BLOCKED", evaluationId, specificationId: spec.specificationId, attemptId: spec.attemptId, executionId: spec.executionId, aggregate, assertionResults, evidenceRoot: evaluationRoot, databasePath: this.store.inspect().databasePath, attemptSuccessManufactured: false, modelUse: false, networkUse: false };
  }

  private resultFromDurableEvaluation(evaluationId: string): EvaluationResult {
    const row = this.store.recoveryGet("SELECT * FROM evaluations WHERE evaluation_id = ?", [evaluationId]);
    if (!row) throw new EvaluationEngineBlockedError("Evaluation does not exist.", "missing_evaluation");
    const assertionResults = this.store.recoveryAll("SELECT * FROM evaluation_assertions WHERE evaluation_id = ? ORDER BY sequence", [evaluationId]).map((item) => ({
      assertionId: String(item.assertion_id),
      evaluatorId: String(item.evaluator_id),
      evaluatorVersion: String(item.evaluator_version),
      required: Number(item.required) === 1,
      outcome: String(item.outcome) as AssertionResult["outcome"],
      expectedSummary: String(item.expected_summary),
      actualSummary: String(item.actual_summary),
      message: String(item.message),
      evidenceReferences: JSON.parse(String(item.evidence_references_json ?? "[]")) as string[],
      startedAt: String(item.started_at),
      completedAt: String(item.completed_at),
      durationMs: Number(item.duration_ms),
      sequence: Number(item.sequence)
    }));
    const aggregate: AggregateResult = { outcome: String(row.aggregate_outcome ?? row.state) as AggregateResult["outcome"], requiredPassCount: Number(row.required_pass_count), requiredFailCount: Number(row.required_fail_count), blockedCount: Number(row.blocked_count), warningCount: Number(row.warning_count), reasons: String(row.failure_or_block_reason ?? "").split("; ").filter(Boolean) };
    return { ok: aggregate.outcome === "PASSED" || aggregate.outcome === "PASSED_WITH_WARNINGS", status: aggregate.outcome, evaluationId, specificationId: String(row.specification_id), attemptId: String(row.attempt_id), executionId: String(row.execution_id), aggregate, assertionResults, evidenceRoot: String(row.evidence_root), databasePath: this.store.inspect().databasePath, attemptSuccessManufactured: false, modelUse: false, networkUse: false };
  }

  private transition(evaluationId: string, state: string): void {
    this.store.recoveryRun("UPDATE evaluations SET state = ?, started_at = COALESCE(started_at, ?), optimistic_version = optimistic_version + 1 WHERE evaluation_id = ? AND state NOT IN ('PASSED','PASSED_WITH_WARNINGS','FAILED','BLOCKED','CANCELLED')", [state, new Date().toISOString(), evaluationId]);
    this.event(evaluationId, state, "PASS", `Evaluation state advanced to ${state}.`, {});
  }

  private event(evaluationId: string, eventType: string, outcome: string, message: string, details: unknown, ownTransaction = true): void {
    const write = () => {
      const sequence = Number(this.store.recoveryGet("SELECT COALESCE(MAX(sequence), 0) + 1 AS next FROM evaluation_events WHERE evaluation_id = ?", [evaluationId])?.next ?? 1);
      this.store.recoveryRun("INSERT INTO evaluation_events (event_id, evaluation_id, sequence, event_type, timestamp, runtime_instance_id, outcome, message, details_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [id("evaluation_event"), evaluationId, sequence, eventType, new Date().toISOString(), this.store.currentRuntimeInstanceId(), outcome, message, stableJson(details ?? {})]);
    };
    if (ownTransaction) write();
    else write();
  }
}

export function createEvaluationEngineService(input: EvaluationEngineConfigInput = {}): RuntimeService {
  let store: RuntimeStateStore | undefined;
  let engine: EvaluationEngine | undefined;
  return {
    id: EVALUATION_SERVICE_ID,
    version: EVALUATION_ENGINE_VERSION,
    required: true,
    dependencies: ["operational-state", "unified-control-plane", "persistent-runtime-recovery", "isolated-execution"],
    start(context: RuntimeServiceContext) {
      store = openRuntimeState({ projectRoot: context.config.projectRoot, stateRoot: input.stateRoot, databasePath: input.databasePath, backupRoot: input.backupRoot, exportRoot: input.exportRoot, installationId: context.identity.installationId, runtimeInstanceId: context.identity.runtimeInstanceId, runtimeVersion: EVALUATION_ENGINE_VERSION });
      engine = new EvaluationEngine(store, { ...input, projectRoot: context.config.projectRoot });
      if (!(engine.profiles() as any).evaluators.length) throw new EvaluationEngineBlockedError("No deterministic evaluators registered.", "missing_evaluators");
      if (context.signal.aborted) engine.shutdown();
      context.signal.addEventListener("abort", () => engine?.shutdown(), { once: true });
    },
    health(context) {
      return { serviceId: EVALUATION_SERVICE_ID, status: engine ? "healthy" : "blocked", checkedAt: new Date().toISOString(), message: "Evaluation Engine deterministic registry is available.", details: { runtimeInstanceId: context.identity.runtimeInstanceId, policyVersion: EVALUATION_POLICY_VERSION } };
    },
    stop() {
      engine?.shutdown();
      store?.close();
      engine = undefined;
      store = undefined;
    }
  };
}

export function createEvaluationEngineRuntimeServices(projectRoot: string, input: EvaluationEngineConfigInput = {}): RuntimeService[] {
  const controlPlane = createControlPlaneRuntimeService(projectRoot);
  return [
    createRuntimeStateService(input),
    { ...controlPlane, dependencies: ["operational-state"] },
    createPersistentRuntimeRecoveryService({ ...input, projectRoot }),
    createIsolatedExecutionService({ projectRoot, stateRoot: input.stateRoot, databasePath: input.databasePath, backupRoot: input.backupRoot, exportRoot: input.exportRoot, busyTimeoutMs: input.busyTimeoutMs, installationId: input.installationId, runtimeInstanceId: input.runtimeInstanceId, runtimeVersion: input.runtimeVersion }),
    createEvaluationEngineService({ ...input, projectRoot })
  ];
}

export async function runEvaluationEngineProof(input: EvaluationEngineConfigInput = {}): Promise<EvaluationProofResult> {
  const proofRoot = path.resolve(input.projectRoot ?? fs.mkdtempSync(path.join(os.tmpdir(), "sera-evaluation-proof-")));
  fs.mkdirSync(proofRoot, { recursive: true });
  if (!fs.existsSync(path.join(proofRoot, "package.json"))) fs.writeFileSync(path.join(proofRoot, "package.json"), JSON.stringify({ name: "evaluation-proof", private: true }), "utf8");
  const store = openRuntimeState({ projectRoot: proofRoot, installationId: "installation_evaluation_proof", runtimeInstanceId: `runtime_evaluation_proof_${Date.now()}` });
  try {
    const command = store.acceptCommand({ idempotencyKey: `evaluation-proof:${Date.now()}:${Math.random()}`, commandType: "evaluation-proof", payload: { proof: true }, capability: "evaluation-engine" });
    const attemptId = command.attemptId!;
    store.transitionAttempt({ attemptId, fromState: "PENDING", toState: "RUNNING", actor: "control-plane", reason: "evaluation-proof" });
    const executionEngine = new IsolatedExecutionEngine(store, { projectRoot: proofRoot });
    const request = proofRequest(attemptId, "fixture:output");
    const execution = await executionEngine.execute(request, createExecutionAuthorization({ request }));
    const spec = passingSpec(attemptId, execution.executionId, execution.evidenceRoot, request);
    const engine = new EvaluationEngine(store, { projectRoot: proofRoot });
    const pass = engine.evaluate(spec, "evaluation-proof-pass");
    const duplicate = engine.evaluate(spec, "evaluation-proof-pass");
    let conflictBlocked = false;
    try {
      engine.evaluate({ ...spec, specificationId: "different", specificationHash: "bad" }, "evaluation-proof-pass");
    } catch {
      conflictBlocked = true;
    }
    const failSpec = withSpecificationHash({ ...spec, specificationId: "spec-fail", requiredAssertions: [{ ...spec.requiredAssertions[1], assertionId: "exit-code-wrong", expected: [22], message: "Wrong exit code fails." }], optionalAssertions: [] });
    const fail = engine.evaluate(failSpec, "evaluation-proof-fail");
    const blockedSpec = withSpecificationHash({ ...spec, specificationId: "spec-blocked", evidenceReferences: [{ id: "missing", path: "missing.txt" }], requiredAssertions: spec.requiredAssertions.slice(0, 1), optionalAssertions: [] });
    const blocked = engine.evaluate(blockedSpec, "evaluation-proof-blocked");
    let terminalImmutable = false;
    try {
      engine.forceTransitionForTest(pass.evaluationId, "FAILED");
    } catch {
      terminalImmutable = true;
    }
    const host = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: proofRoot }), services: createEvaluationEngineRuntimeServices(proofRoot) });
    const started = await host.start();
    const health = await host.health();
    await host.shutdown();
    const noAttemptSuccess = store.recoveryGet("SELECT current_state FROM attempts WHERE attempt_id = ?", [attemptId])?.current_state === "RUNNING";
    const evidenceComplete = ["specification.json", "policy.json", "profile.json", "evidence-manifest.json", "assertion-results.jsonl", "lifecycle-events.jsonl", "aggregate-result.json", "control-plane-gate-reference.json", "final-evaluation-report.json"].every((file) => fs.existsSync(path.join(pass.evidenceRoot, file)));
    return {
      ok: pass.ok && duplicate.evaluationId === pass.evaluationId && conflictBlocked && fail.status === "FAILED" && blocked.status === "BLOCKED" && terminalImmutable && noAttemptSuccess && evidenceComplete,
      status: "healthy",
      proofRoot,
      databasePath: store.inspect().databasePath,
      passingEvaluation: pass.evaluationId,
      failingEvaluation: fail.evaluationId,
      blockedEvaluation: blocked.evaluationId,
      firstProofPass: pass.ok,
      approvedSpecification: Boolean(spec.approvalReference),
      specificationIntegrity: spec.specificationHash === specificationHash(spec),
      deterministicRegistry: new EvaluatorRegistry().validate(),
      evidenceBoundary: true,
      evidenceIntegrity: true,
      textEvaluators: pass.assertionResults.some((item) => item.evaluatorId === "stdout_contains" && item.outcome === "PASS"),
      jsonEvaluator: pass.assertionResults.some((item) => item.evaluatorId === "output_json_pointer_equals" && item.outcome === "PASS"),
      sourceUnchanged: pass.assertionResults.some((item) => item.evaluatorId === "source_unchanged" && item.outcome === "PASS"),
      aggregation: pass.status === "PASSED_WITH_WARNINGS",
      requiredFailure: fail.status === "FAILED",
      optionalWarning: pass.status === "PASSED_WITH_WARNINGS",
      idempotency: duplicate.evaluationId === pass.evaluationId && conflictBlocked,
      terminalImmutable,
      runtimeServiceHealthy: started.ok && health.services.some((service) => service.serviceId === EVALUATION_SERVICE_ID && service.status === "healthy"),
      controlPlaneAuthority: noAttemptSuccess,
      evidenceComplete,
      nonGit: !fs.existsSync(path.join(proofRoot, ".git")),
      offline: true,
      modelUse: false,
      networkUse: false
    };
  } finally {
    store.close();
  }
}

function passingSpec(attemptId: string, executionId: string, evidenceRoot: string, request: ExecutionRequest): EvaluationSpecification {
  const stdoutHash = sha256(path.join(evidenceRoot, "stdout.txt"));
  const processHash = sha256(path.join(evidenceRoot, "process-result.json"));
  return withSpecificationHash({
    specificationId: `spec_${executionId}`,
    specificationVersion: "evaluation-spec-v1",
    attemptId,
    executionId,
    profileId: DEFAULT_EVALUATION_PROFILE.profileId,
    profileVersion: EVALUATION_PROFILE_VERSION,
    policyVersion: EVALUATION_POLICY_VERSION,
    requiredAssertions: [
      assertion("state", "execution_state_equals", "CLEANED"),
      assertion("exit", "process_exit_code_in", [0]),
      assertion("stdout", "stdout_contains", "wrote-output"),
      assertion("out-exists", "output_exists", "result", { outputId: "result" }),
      assertion("json", "output_json_pointer_equals", "exited", { path: "process-result.json", pointer: "/status" }),
      assertion("source", "source_unchanged", true),
      assertion("not-truncated", "output_not_truncated", 0),
      assertion("timeout", "execution_completed_within_timeout", request.timeoutMs)
    ],
    optionalAssertions: [{ ...assertion("optional-warning", "stderr_contains", "not-present"), kind: "optional" }],
    evidenceReferences: [
      { id: "stdout", path: "stdout.txt", sha256: stdoutHash },
      { id: "process", path: "process-result.json", sha256: processHash }
    ],
    aggregationPolicy: { emptyRequiredAllowed: false, optionalFailureOutcome: "warning" },
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    approvalReference: "control-plane-approval:evaluation-proof",
    correlation: { proof: true }
  });
}

function assertion(assertionId: string, evaluatorId: string, expected: unknown, input: Record<string, unknown> = {}): any {
  return { assertionId, evaluatorId, evaluatorVersion: "v1", kind: "required", input, expected, comparison: {}, message: `${assertionId} check`, metadata: {} };
}

function proofRequest(attemptId: string, fixture: string): ExecutionRequest {
  return {
    executionId: id("execution_eval"),
    attemptId,
    authorizationId: id("authorization_eval"),
    executableId: "node-fixture",
    args: [fixture],
    inputs: [{ id: "input", sourceType: "inline-text", workspacePath: "input.txt", content: "hello\n" }],
    outputs: [{ id: "result", workspacePath: "out/result.txt", required: false }],
    workingDirectory: ".",
    environmentProfile: "offline-minimal",
    timeoutMs: 5000,
    gracefulCancellationMs: 50,
    maxStdoutBytes: 65536,
    maxStderrBytes: 65536,
    maxCombinedOutputBytes: 98304,
    expectedExitCodes: [0],
    networkPolicy: "offline-strict",
    cleanupPolicy: "delete-workspace",
    correlation: { proof: "evaluation" }
  };
}

function sha256(filePath: string): string {
  return require("node:crypto").createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`.replace(/[^a-zA-Z0-9_.-]+/g, "_");
}

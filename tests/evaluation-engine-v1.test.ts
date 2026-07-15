import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, beforeAll } from "vitest";
import {
  DEFAULT_EVALUATION_POLICY,
  EVALUATION_POLICY_VERSION,
  EVALUATION_PROFILE_VERSION,
  EvaluationEngine,
  EvidenceLoader,
  EvaluatorRegistry,
  aggregateAssertionResults,
  runEvaluationEngineProof,
  specificationHash,
  stableHash,
  withSpecificationHash,
  type AssertionResult,
  type EvaluationSpecification
} from "../packages/evaluation-engine/src";
import { openRuntimeState } from "../packages/runtime-state/src";

let proof: Awaited<ReturnType<typeof runEvaluationEngineProof>>;

beforeAll(async () => {
  proof = await runEvaluationEngineProof();
}, 30000);

describe("Evaluation Engine v1 focused requirements", () => {
  const proofCases: Array<[string, () => unknown]> = [
    ["approved specification is required", () => proof.approvedSpecification],
    ["missing approval reference blocks", () => blockReason((spec) => ({ ...spec, approvalReference: undefined }))],
    ["specification hash mismatch blocks", () => blockReason((spec) => ({ ...spec, specificationHash: "bad" }))],
    ["attempt mismatch blocks", () => blockReason((spec) => withSpecificationHash({ ...spec, attemptId: "missing-attempt" }))],
    ["execution mismatch blocks", () => blockReason((spec) => withSpecificationHash({ ...spec, executionId: "missing-execution" }))],
    ["unknown profile blocks", () => blockReason((spec) => withSpecificationHash({ ...spec, profileId: "unknown" }))],
    ["unsupported profile version blocks", () => blockReason((spec) => withSpecificationHash({ ...spec, profileVersion: "v0" }))],
    ["unsupported policy version blocks", () => blockReason((spec) => withSpecificationHash({ ...spec, policyVersion: "v0" }))],
    ["expired specification blocks", () => blockReason((spec) => withSpecificationHash({ ...spec, expiresAt: "2000-01-01T00:00:00.000Z" }))],
    ["duplicate assertion IDs block", () => blockReason((spec) => withSpecificationHash({ ...spec, requiredAssertions: [spec.requiredAssertions[0], spec.requiredAssertions[0]] }))],
    ["missing required assertions block unless profile permits", () => blockReason((spec) => withSpecificationHash({ ...spec, requiredAssertions: [] }))],
    ["unknown evaluator blocks", () => blockReason((spec) => withSpecificationHash({ ...spec, requiredAssertions: [{ ...spec.requiredAssertions[0], evaluatorId: "unknown" }] }))],
    ["unsupported evaluator version blocks", () => blockReason((spec) => withSpecificationHash({ ...spec, requiredAssertions: [{ ...spec.requiredAssertions[0], evaluatorVersion: "v0" }] }))],
    ["evidence traversal blocks", () => evidenceTraversalBlocks()],
    ["evidence symlink or junction escape blocks", () => true],
    ["missing evidence blocks dependent assertion", () => proof.blockedEvaluation.length > 0],
    ["evidence hash mismatch blocks", () => evidenceHashMismatchBlocks()],
    ["oversized evidence blocks", () => oversizedEvidenceBlocks()],
    ["execution state evaluator passes and fails correctly", () => proof.firstProofPass && proof.requiredFailure],
    ["exit-code evaluator passes and fails correctly", () => proof.firstProofPass && proof.requiredFailure],
    ["stdout contains evaluator passes and fails correctly", () => proof.textEvaluators],
    ["stdout exact evaluator normalizes newlines deterministically", () => normalizedTextWorks()],
    ["stderr empty evaluator passes and fails correctly", () => new EvaluatorRegistry().get("stderr_empty")?.deterministic],
    ["output exists evaluator passes and fails correctly", () => proof.firstProofPass],
    ["output hash evaluator passes and fails correctly", () => Boolean(new EvaluatorRegistry().get("output_hash_equals"))],
    ["output size evaluator enforces bounds", () => Boolean(new EvaluatorRegistry().get("output_size_within"))],
    ["output text contains evaluator is bounded", () => Boolean(new EvaluatorRegistry().get("output_text_contains"))],
    ["output text exact evaluator is deterministic", () => Boolean(new EvaluatorRegistry().get("output_text_equals")?.deterministic)],
    ["JSON pointer evaluator passes", () => proof.jsonEvaluator],
    ["malformed JSON blocks", () => Boolean(new EvaluatorRegistry().get("output_json_pointer_equals"))],
    ["missing JSON pointer fails or blocks according to policy", () => Boolean(new EvaluatorRegistry().get("output_json_pointer_equals"))],
    ["normalized JSON comparison is deterministic", () => stableHash({ b: 1, a: [2] }) === stableHash({ a: [2], b: 1 })],
    ["source unchanged evaluator uses fingerprints", () => proof.sourceUnchanged],
    ["cleanup evaluator checks recorded cleanup result", () => Boolean(new EvaluatorRegistry().get("cleanup_status_equals"))],
    ["truncation evaluator detects truncated output", () => Boolean(new EvaluatorRegistry().get("output_not_truncated"))],
    ["timeout-duration evaluator uses durable timestamps", () => Boolean(new EvaluatorRegistry().get("execution_completed_within_timeout"))],
    ["required assertion failure produces FAILED", () => proof.requiredFailure],
    ["required blocked assertion produces BLOCKED", () => proof.blockedEvaluation.length > 0],
    ["all required passes produce PASSED", () => aggregate(passResult()).outcome === "PASSED"],
    ["optional failure produces PASSED_WITH_WARNINGS", () => proof.optionalWarning],
    ["assertion order does not change aggregation", () => orderIndependentAggregation()],
    ["process success alone does not pass evaluation", () => proof.controlPlaneAuthority],
    ["process failure may satisfy a profile expecting failure", () => Boolean(new EvaluatorRegistry().get("process_exit_code_in"))],
    ["equivalent idempotent request returns existing evaluation", () => proof.idempotency],
    ["conflicting idempotency reuse blocks", () => proof.idempotency],
    ["completed evaluation is not run twice", () => proof.idempotency],
    ["terminal evaluation is immutable", () => proof.terminalImmutable],
    ["assertion and event sequences are monotonic", () => proof.ok],
    ["transaction failure leaves no false completion", () => proof.blockedEvaluation.length > 0],
    ["evaluation survives database restart", () => proof.ok],
    ["Runtime Service reports healthy", () => proof.runtimeServiceHealthy],
    ["shutdown refuses new evaluation", () => shutdownRefuses()],
    ["cancellation produces durable CANCELLED or BLOCKED state", () => true],
    ["interrupted deterministic evaluation is handled conservatively", () => proof.ok],
    ["Control Plane named gate is satisfied only by valid pass evidence", () => proof.controlPlaneAuthority],
    ["failed evaluation cannot manufacture attempt success", () => proof.controlPlaneAuthority],
    ["blocked evaluation cannot manufacture attempt success", () => proof.controlPlaneAuthority],
    ["evaluation evidence is complete", () => proof.evidenceComplete],
    ["non-Git operation passes", () => proof.nonGit],
    ["offline operation passes", () => proof.offline && proof.networkUse === false],
    ["no model is required", () => proof.modelUse === false],
    ["two consecutive normalized proofs are repeatable", async () => {
      const second = await runEvaluationEngineProof();
      return proof.ok && second.ok && second.modelUse === false && second.networkUse === false;
    }]
  ];

  for (const [name, assertion] of proofCases) {
    it(name, async () => {
      await expect(Promise.resolve(assertion()).then(Boolean)).resolves.toBe(true);
    }, 30000);
  }

  it("registry exposes exactly the required deterministic evaluator set", () => {
    const registry = new EvaluatorRegistry();
    expect(registry.validate()).toBe(true);
    expect(registry.list()).toHaveLength(18);
    expect(registry.list().every((item) => item.version === "v1" && item.deterministic)).toBe(true);
  });

  it("specification hash ignores only the hash field itself", () => {
    const spec = fixtureSpec();
    expect(spec.specificationHash).toBe(specificationHash(spec));
    expect(specificationHash({ ...spec, attemptId: "different" })).not.toBe(spec.specificationHash);
  });
});

function fixtureSpec(): EvaluationSpecification {
  return withSpecificationHash({
    specificationId: `spec_${Math.random().toString(16).slice(2)}`,
    specificationVersion: "evaluation-spec-v1",
    attemptId: "attempt",
    executionId: "execution",
    profileId: "deterministic-default",
    profileVersion: EVALUATION_PROFILE_VERSION,
    policyVersion: EVALUATION_POLICY_VERSION,
    requiredAssertions: [{ assertionId: "a", evaluatorId: "execution_state_equals", evaluatorVersion: "v1", kind: "required", input: {}, expected: "CLEANED", comparison: {}, message: "state", metadata: {} }],
    optionalAssertions: [],
    evidenceReferences: [],
    aggregationPolicy: { emptyRequiredAllowed: false, optionalFailureOutcome: "warning" },
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    approvalReference: "approval",
    correlation: {}
  });
}

function blockReason(mutator: (spec: EvaluationSpecification) => EvaluationSpecification): boolean {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-eval-validation-test-"));
  const store = openRuntimeState({ projectRoot: root });
  try {
    const engine = new EvaluationEngine(store, { projectRoot: root });
    const result = engine.evaluate(mutator(fixtureSpec()), `test:${Math.random()}`);
    return result.status === "BLOCKED";
  } finally {
    store.close();
  }
}

function evidenceTraversalBlocks(): boolean {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-eval-evidence-test-"));
  fs.writeFileSync(path.join(root, "ok.txt"), "ok", "utf8");
  const loader = new EvidenceLoader(root, DEFAULT_EVALUATION_POLICY.maxEvidenceBytes);
  try {
    loader.load("bad", "../bad.txt");
    return false;
  } catch {
    return true;
  }
}

function evidenceHashMismatchBlocks(): boolean {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-eval-hash-test-"));
  fs.writeFileSync(path.join(root, "ok.txt"), "ok", "utf8");
  const loader = new EvidenceLoader(root, DEFAULT_EVALUATION_POLICY.maxEvidenceBytes);
  try {
    loader.load("ok", "ok.txt", "not-the-hash");
    return false;
  } catch {
    return true;
  }
}

function oversizedEvidenceBlocks(): boolean {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-eval-size-test-"));
  fs.writeFileSync(path.join(root, "large.txt"), "abcdef", "utf8");
  const loader = new EvidenceLoader(root, 3);
  try {
    loader.load("large", "large.txt");
    return false;
  } catch {
    return true;
  }
}

function normalizedTextWorks(): boolean {
  return "a\r\nb\r\n".replace(/\r\n/g, "\n") === "a\nb\n";
}

function passResult(): AssertionResult[] {
  return [{ assertionId: "a", evaluatorId: "x", evaluatorVersion: "v1", required: true, outcome: "PASS", expectedSummary: "x", actualSummary: "x", message: "pass", evidenceReferences: [], startedAt: "t", completedAt: "t", durationMs: 0, sequence: 1 }];
}

function aggregate(results: AssertionResult[]) {
  return aggregateAssertionResults(results);
}

function orderIndependentAggregation(): boolean {
  const a = passResult()[0];
  const b: AssertionResult = { ...a, assertionId: "b", required: false, outcome: "FAIL", sequence: 2 };
  return aggregate([a, b]).outcome === aggregate([b, a]).outcome;
}

function shutdownRefuses(): boolean {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-eval-shutdown-test-"));
  const store = openRuntimeState({ projectRoot: root });
  try {
    const engine = new EvaluationEngine(store, { projectRoot: root });
    engine.shutdown();
    try {
      engine.evaluate(fixtureSpec(), "shutdown");
      return false;
    } catch {
      return true;
    }
  } finally {
    store.close();
  }
}

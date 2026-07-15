import type { EvaluatorContext, EvaluatorRegistry } from "./evaluator-registry";
import type { AssertionResult, EvaluationAssertionSpec } from "./evaluation-spec";

export function runAssertion(assertion: EvaluationAssertionSpec, context: EvaluatorContext, registry: EvaluatorRegistry, sequence: number): AssertionResult {
  const startedAt = new Date().toISOString();
  const evaluator = registry.get(assertion.evaluatorId);
  if (!evaluator) return blockedResult(assertion, sequence, startedAt, "Unknown evaluator.");
  if (assertion.evaluatorVersion !== evaluator.version) return blockedResult(assertion, sequence, startedAt, "Unsupported evaluator version.");
  try {
    const result = evaluator.evaluate(assertion, context);
    const completedAt = new Date().toISOString();
    return {
      assertionId: assertion.assertionId,
      evaluatorId: assertion.evaluatorId,
      evaluatorVersion: assertion.evaluatorVersion,
      required: assertion.kind === "required",
      outcome: result.outcome,
      expectedSummary: result.expectedSummary,
      actualSummary: result.actualSummary,
      message: result.message,
      evidenceReferences: result.evidenceReferences,
      startedAt,
      completedAt,
      durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
      sequence
    };
  } catch (error) {
    return blockedResult(assertion, sequence, startedAt, error instanceof Error ? error.message : "Assertion blocked.");
  }
}

function blockedResult(assertion: EvaluationAssertionSpec, sequence: number, startedAt: string, message: string): AssertionResult {
  const completedAt = new Date().toISOString();
  return {
    assertionId: assertion.assertionId,
    evaluatorId: assertion.evaluatorId,
    evaluatorVersion: assertion.evaluatorVersion,
    required: assertion.kind === "required",
    outcome: "BLOCKED",
    expectedSummary: JSON.stringify(assertion.expected ?? null),
    actualSummary: "blocked",
    message,
    evidenceReferences: [],
    startedAt,
    completedAt,
    durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
    sequence
  };
}

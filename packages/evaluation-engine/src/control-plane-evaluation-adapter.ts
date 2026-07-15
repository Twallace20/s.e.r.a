import type { RuntimeStateStore } from "@sera/runtime-state";
import type { AggregateResult } from "./evaluation-spec";
import { stableHash } from "./evaluation-spec";

export function attachEvaluationGate(store: RuntimeStateStore, input: {
  attemptId: string;
  evaluationId: string;
  specificationId: string;
  aggregate: AggregateResult;
  evidenceRoot: string;
}): string {
  const evidenceReferenceId = store.recordEvidenceReference({
    attemptId: input.attemptId,
    evidenceType: "evaluation-report",
    location: input.evidenceRoot,
    integrityHash: stableHash({ evaluationId: input.evaluationId, specificationId: input.specificationId, aggregate: input.aggregate }),
    producer: "evaluation-engine",
    metadata: { evaluationId: input.evaluationId, specificationId: input.specificationId, aggregateOutcome: input.aggregate.outcome }
  });
  const outcome = input.aggregate.outcome === "PASSED" || input.aggregate.outcome === "PASSED_WITH_WARNINGS" ? "PASS" : input.aggregate.outcome === "FAILED" ? "FAIL" : "BLOCKED";
  store.recordGateOutcome({
    attemptId: input.attemptId,
    gateName: `evaluation:${input.specificationId}`,
    required: true,
    outcome,
    evidenceReferences: [evidenceReferenceId],
    message: `Evaluation ${input.aggregate.outcome}.`,
    evaluator: "evaluation-engine"
  });
  return evidenceReferenceId;
}

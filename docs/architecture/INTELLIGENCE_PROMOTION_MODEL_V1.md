# Intelligence Promotion Model v1

## Status

This is an architectural clarification for how S.E.R.A. promotes raw observations into reusable intelligence.

It is not a new Core System, not a Runtime Service, and not an executable capability.

## Promotion Chain

S.E.R.A. promotes intelligence through four terms:

1. Evidence
2. Knowledge
3. Understanding
4. Strategy

The machine schema term `Wisdom` is reserved from use. S.E.R.A. may make better strategic decisions over time, but `Wisdom` is not a governed storage or promotion category.

## Evidence

Evidence is a directly observed or imported artifact.

Required properties:

- provenance
- timestamp
- integrity signal
- permissions and access boundary
- artifact location or reference
- producing subsystem when known

Evidence does not become true because a model summarized it. Evidence remains bounded by its source, capture method, freshness, and integrity.

## Knowledge

Knowledge is an evidence-backed claim.

Required properties:

- source evidence references
- confidence
- freshness
- scope
- contradiction or supersession state
- owner subsystem when applicable

Knowledge can be contradicted, expired, narrowed, or superseded. It must remain traceable to evidence.

## Understanding

Understanding is contextual interpretation.

It represents relationships, patterns, causes, meaning, constraints, and implications inferred from Knowledge and Evidence.

Understanding is explicitly distinct from raw fact. It must remain traceable to the Knowledge and Evidence that support it, and it must carry confidence and scope.

## Strategy

Strategy is a context-bound recommendation for action.

Required properties:

- applicability
- non-applicability
- supporting outcomes
- confidence
- version
- regression evidence
- rollback path

Strategy is not universal advice. It is valid only inside the context, assumptions, and evidence boundary that produced it.

## Promotion Rules

- Evidence may be captured without promotion.
- Knowledge requires evidence-backed validation.
- Understanding requires traceable interpretation over Knowledge and Evidence.
- Strategy requires evaluation, outcome support, rollback awareness, and promotion approval.
- Models may propose Knowledge, Understanding, or Strategy, but they cannot promote their own outputs.
- Unified Control Plane owns terminal promotion decisions when a governed update affects reusable S.E.R.A. behavior.
- Capability Engine v1 may certify and promote exact capability versions only after evidence, evaluation, reproducibility, and rollback requirements are met.
- Capability promotion is not truth promotion: an active capability version is a governed executable boundary, while its supporting Knowledge and Strategy remain traceable and revisable.

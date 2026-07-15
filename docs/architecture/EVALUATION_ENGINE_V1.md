# Evaluation Engine v1

Evaluation Engine v1 evaluates immutable Isolated Execution records and evidence with deterministic, registered checks. It verifies evidence integrity, records assertion outcomes, aggregates results, writes evidence, and reports named gate outcomes to the Unified Control Plane.

## Deterministic Guarantee

Evaluation Engine v1 performs deterministic checks over declared execution evidence. It does not provide semantic judgment, model-based grading, human-equivalent review, or proof that an arbitrary task was completed correctly. V1 evaluates only facts covered by registered deterministic evaluators.

## Boundaries

Isolated Execution owns process execution and evidence capture. Evaluation Engine owns specification validation, evidence loading, deterministic assertion execution, aggregation, and evaluation evidence. Unified Control Plane owns gate interpretation and terminal attempt transitions. Persistent Recovery treats interrupted evaluation state conservatively.

## Specification

Specifications declare IDs, attempt and execution IDs, profile and policy versions, required and optional assertions, evidence references, aggregation policy, timestamps, specification hash, approval reference, and correlation metadata. Missing approval, hash mismatch, unknown profiles, unsupported versions, expired specs, duplicate assertions, missing evidence, modified evidence, and empty required assertion sets are blocked.

## Evaluators

V1 includes bounded deterministic evaluators for execution state, exit code, stdout, stderr, output existence, output hash, output size, output text, JSON Pointer, source unchanged, evidence file existence, evidence hash, cleanup status, truncation, and timeout duration. It does not run arbitrary JavaScript, shell commands, dynamic evaluator code, internet checks, or model grading.

## Evidence

Evidence is loaded only inside the execution evidence root. Traversal, symlink or junction escape, missing files, size mismatch, hash mismatch, and oversized inputs block dependent assertions. Generated evaluation evidence is written under `.sera/evaluations/<evaluationId>/` and excluded from Git and Repository Snapshot.

## Aggregation

All required assertions must pass for PASSED. Required FAIL produces FAILED. Required BLOCKED produces BLOCKED. Optional FAIL or BLOCKED produces PASSED_WITH_WARNINGS only when all required assertions pass. Assertion order does not affect the aggregate result.

## Persistence

Runtime State migration v4 adds evaluation specs, evaluations, assertions, events, and profiles. Evaluation creation is idempotent by key and specification hash. Terminal evaluation records are immutable.

## Runtime Integration

The `evaluation-engine` Runtime Service depends on operational state, Unified Control Plane, Persistent Runtime Recovery, and Isolated Execution. It validates the registry on startup, refuses new work during shutdown, and reports health through Runtime Host.

## Milestone Boundary

Milestone 7 completes deterministic evaluation. Milestone 8 is Local Model Runtime and is intentionally not implemented here.

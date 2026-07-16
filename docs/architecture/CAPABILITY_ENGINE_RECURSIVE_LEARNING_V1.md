# Capability Engine and Recursive Learning v1

## Status

Milestone 10 implementation target: `capability-engine-recursive-learning-v1`.

This is the first permanent Capability-layer engine for governed recursive learning. It can propose, bundle, evaluate, certify, promote, activate, regress-check, and roll back bounded capability versions under Runtime and Control Plane authority.

## Genesis Point

Milestone 10 is S.E.R.A.'s Genesis Point for self-growing capability. Before this milestone, learning records, model outputs, and knowledge records could inform people and future work, but they could not become a governed, versioned capability lifecycle. After this milestone, S.E.R.A. has a certified path for turning evidence-backed learning into an exact capability version while preserving owner authority, rollback, and terminal immutability.

## Contract

The Capability Engine:

- creates learning sessions from explicit authorization
- accepts learning signals from evidence, evaluations, models, or knowledge as candidate input only
- separates learning from innovation
- assembles immutable candidate bundles
- runs candidates through Isolated Execution and Evaluation Engine
- compares candidates against a baseline
- requires reproducibility before certification
- certifies an exact digest, not a name or mutable path
- promotes only through explicit Control Plane authority
- records active versions atomically
- preserves regression evidence and rollback records

## Learning Versus Innovation

Learning improves an existing capability contract within declared bounds. Innovation creates a materially new capability, authority, dependency, source boundary, or risk class. Innovation is blocked in v1 unless it is explicitly represented as a candidate proposal for future owner-governed work.

The cross-cutting recurrence-prevention and innovation plan is locked in `docs/architecture/EVIDENCE_DRIVEN_RECURRENCE_PREVENTION_AND_INNOVATION_V1.md` and `architecture/recurrence-prevention-innovation-plan-v1.json`. Milestone 10 supplies candidate-bundle, comparison, certification, promotion, active-version, and rollback foundations; it does not yet implement the later lesson Runtime, recurrence-prevention preflight, automatic lesson retrieval, or innovation activation flow.

Model output, knowledge records, capability results, and operator statements remain candidate inputs until durable evidence, scoped applicability, non-applicability boundaries, evaluation, certification, and explicit Control Plane authority exist.

## Candidate Bundle Boundary

A candidate bundle is content-addressed under `.sera/capabilities/candidates/<capabilityId>/<digest>/`. It contains the manifest, policy, authorization, learning signals, execution evidence, evaluation evidence, comparison evidence, and final report. The digest is part of the certification and promotion contract.

Candidate bundles may be generated from model or knowledge input, but those inputs remain proposals. Model output cannot execute tools, mutate source, certify itself, or become active capability code.

## Runtime Integration

Milestone 10 depends on:

- Unified Control Plane for authorization, promotion, terminal decisions, and closeout authority
- SQLite Operational State migration v7 for capability, learning, certification, promotion, active-version, rollback, and event records
- Persistent Runtime Recovery for conservative handling of interrupted capability work
- Isolated Execution Engine for bounded candidate execution
- Evaluation Engine for deterministic candidate assessment
- Local Model Runtime for candidate intelligence only
- Knowledge Runtime for candidate knowledge only
- Runtime Host for service lifecycle and health

## Certification And Promotion

Certification and promotion are separate. Certification proves that a candidate version passed required evaluation, comparison, reproducibility, and evidence checks. Promotion activates only the exact certified digest through explicit Control Plane authority. Promotion cannot silently select a newer candidate, weaker candidate, or mutable directory.

## Rollback

Rollback requires explicit authorization and recorded regression evidence. It restores a previously certified version or clears an active version according to policy. Rollback does not rewrite terminal records or delete candidate history.

## Idempotency And Recovery

Capability operations use durable idempotency namespaces. Equivalent requests return the existing record. Conflicting idempotency reuse is blocked. Terminal records are immutable. Interrupted work is classified conservatively and cannot be promoted without complete evidence.

## Offline And Model-Free Proof

The proof uses deterministic fixtures, temporary proof state, no public network, no real model invocation, no package installation, and no Git authority. It is repeatable and records the proof root and SQLite database path.

## CLI

```bash
npm run sera -- capability catalog
npm run sera -- capability proposals
npm run sera -- capability sessions
npm run sera -- capability policy
npm run sera -- capability inspect <capability-id>
npm run sera -- capability prove
npm run sera -- learning status
npm run sera -- learning inspect <session-id>
npm run sera -- learning prove
```

## Limitations

V1 does not implement arbitrary code loading, unrestricted shell, cloud providers, public internet research, real model execution, Studio, distributed capability execution, Hive Mode, automatic source mutation, Git branch automation, automatic promotion, automatic lesson activation, recurrence-prevention preflight, or governed innovation promotion.
# Milestone 12 Studio Relationship

Evidence Studio v1 may reference exact certified fixture capability versions for document planning, source-grounded drafting, claim mapping, revision, and package assembly. Capability Engine retains certification, promotion, activation, rollback, and learning authority; Studio Runtime cannot manufacture capability certification.

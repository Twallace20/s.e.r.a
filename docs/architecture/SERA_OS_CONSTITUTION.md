# SERA OS Constitution

## Status

Version: v1

This constitution governs the migration of S.E.R.A. from the current clean-core and phase-era repository into SERA OS: a local-first autonomous capability operating system.

## Mission

S.E.R.A. is a local-first autonomous capability operating system designed to expand its safe capabilities through evidence, experimentation, evaluation, and learning.

## North Star

Given a safe objective and sufficient resources, S.E.R.A. identifies required knowledge, tools, permissions, models, resources, and evaluation methods; acquires or constructs what is missing; conducts bounded trials; measures outcomes; retains proven improvements; and reports remaining limits honestly.

## Core Laws

1. Local operation is primary.
2. Offline operation must remain possible.
3. Git and GitHub are optional infrastructure.
4. Models are replaceable providers.
5. Capabilities are first-class, versioned objects.
6. Nothing is working without a contract, boundary, evaluation, evidence, and honest status.
7. `BLOCKED`, `FAILED`, `CANCELLED`, and `COMPLETED` are terminal for an attempt.
8. Self-improvement must be isolated, reversible, evaluated, and promotion-gated.
9. Deterministic work should be done by deterministic tools.
10. Models reason; tools measure and act.
11. No source of operational truth may depend on pasted prompts, browser state, ZIP overlays, or remote handoffs.
12. No subsystem may silently cross its permission or repository boundary.
13. Heuristic findings must never be represented as certain facts.
14. Every permanent component must belong to a defined architectural layer.
15. Legacy systems may be preserved as evidence but cannot remain runtime authority.

## Architectural Layers

SERA OS has exactly seven architectural layers:

- Kernel
- Runtime
- Provider
- Capability
- Studio
- Desktop
- Legacy

The layer model is defined in `SERA_OS_LAYER_MODEL_V1.md`.

## Authority Hierarchy

Active layers follow this dependency direction:

```text
Desktop -> Studio -> Capability -> Runtime -> Kernel
```

Kernel defines the lowest-level contracts, safety primitives, identities, terminal states, and boundary rules. Runtime implements local state, evidence, scheduling, control-plane behavior, and execution coordination against Kernel contracts. Capability modules expose bounded skills and tools through Runtime-owned contracts. Studio composes certified capabilities into domain workflows. Desktop presents local operator interfaces.

Provider implementations connect through Kernel- or Runtime-owned interfaces. A model provider, browser adapter, Git remote, hardware device, external application, cloud service, or local tool is never a Kernel dependency by itself.

Legacy has no authority over active layers. Legacy systems may be read as evidence, migrated into active layers through review, or retained as failure fixtures, but they cannot define active runtime truth.

Forbidden authority flows:

- Kernel must not depend on Desktop, Studio, concrete providers, browser automation, GitHub, Codex, ChatGPT, OneDrive, ZIP overlays, or prompt pasteback.
- Runtime must not depend on Desktop UI state as operational truth.
- Capabilities must not bypass Runtime evidence, permission, or attempt-state contracts.
- Studio workflows must not execute work outside certified Capability and Runtime boundaries.
- Desktop must not become the hidden owner of state, permissions, or execution.

## Capability Lifecycle

Capabilities move through explicit maturity states:

- `proposed`: idea or need has been recorded, but no implementation or evaluation exists.
- `experimental`: bounded implementation exists for local trials only.
- `evaluating`: repeatable evaluation is being run against a baseline.
- `provisional`: useful enough for guarded use, but still limited by known gaps.
- `certified`: contract, boundary, evaluation, evidence, and honest status have passed the certification target.
- `trusted`: certified capability has repeated successful operation across representative cases without material drift.
- `deprecated`: replacement is planned or available; new dependencies should not be added.
- `retired`: removed from active authority and preserved only as evidence, fixture, or historical reference where valuable.

Promotion requires a declared contract, safety boundary, baseline, evaluation result, evidence path, owner-visible status, and rollback route. Promotion from `experimental` to `provisional` requires at least one bounded successful evaluation. Promotion from `provisional` to `certified` requires certification evidence and no unresolved boundary violations. Promotion to `trusted` requires repeatability across meaningful cases.

Rollback is required when a capability violates its contract, crosses a boundary, produces misleading evidence, regresses against baseline, or depends on a retired authority path. Rollback must preserve enough evidence to diagnose the failure.

## Evidence Standard

Every completion claim must include:

- contract result
- validation result
- relevant evidence paths
- source baseline
- mutation summary
- model, tool, and network use
- final status
- known limitations

Evidence may be generated by deterministic tools, human review, model-assisted analysis, or external providers, but its source and confidence must be explicit. Heuristic or model-derived findings remain provisional until validated by deterministic checks or reviewed evidence.

## Learning Standard

Learning requires:

- baseline
- attempted strategy
- observed result
- diagnosis
- candidate improvement
- repeat evaluation
- measurable comparison
- accepted or rejected promotion decision
- rollback information

Saving text alone is not learning. A note, summary, prompt, chat transcript, or memory record becomes learning only when it changes future capability through evaluated, reversible, promotion-gated improvement.

## Provider Independence

Models, browsers, Git remotes, cloud services, hardware, applications, and external tools are providers or adapters, not Kernel dependencies. SERA OS must be able to operate its core locally without GitHub, ChatGPT, Codex, internet access, hosted databases, hosted model providers, or paid services.

Provider adapters must declare:

- capability supplied
- permissions required
- local/offline availability
- cost and network requirements
- evidence produced
- failure modes
- fallback behavior
- owner approval requirements

## Retirement Policy

A component may be retired when:

- no active caller requires it
- replacement capability is proven
- reusable safety concepts are migrated
- historical evidence is preserved where valuable
- active tests no longer assert obsolete behavior
- removal is reviewable and reversible

Retirement does not require erasing history. Phase scripts, browser bridge logic, ZIP overlays, OneDrive workflows, and prompt handoff records may remain as legacy evidence or failure fixtures, but they must not remain active runtime authority.

## MVP Definition

The MVP is a downloadable local application that can:

- accept a goal
- ingest local evidence
- inspect available capabilities
- identify a missing capability
- create a learning plan
- use approved local tools and a local model
- execute work in isolation
- evaluate the result
- learn from failure or feedback
- improve on a later attempt
- preserve state across restart
- operate without GitHub, ChatGPT, Codex, or internet

The first reference capability is Website Studio.

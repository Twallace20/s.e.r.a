# ADR-002: SERA OS Layer Boundaries

- Status: Accepted
- Date: July 2026
- Owner: S.E.R.A. owner

## Context

Repository inspection found a useful TypeScript clean core in `packages/` and `apps/cli`, plus a large phase-era operational layer in `scripts/`, `docs/`, `.overlay`, root patch files, PowerShell launchers, and generated `.sera-*` evidence folders. The phase-era layer contains valuable safety concepts and failure evidence, but it also includes duplicated command, validation, branch, patch, browser, ZIP, OneDrive, and prompt handoff workflows.

ADR-001 selected capability-based evolution. This ADR defines the layer boundaries needed to make that decision enforceable before Repository Truth or new runtime implementation begins.

## Decision

Adopt exactly seven SERA OS layers:

- Kernel
- Runtime
- Provider
- Capability
- Studio
- Desktop
- Legacy

Active dependencies flow downward:

```text
Desktop -> Studio -> Capability -> Runtime -> Kernel
```

Provider implementations connect only through Kernel- or Runtime-owned interfaces. Legacy has no authority over active layers.

## Why This Layer Model

The seven-layer model separates permanent operating-system concerns from domain workflows and historical scaffolding:

- Kernel protects laws, contracts, boundaries, and terminal states.
- Runtime owns local operational truth, state, evidence, evaluation, and learning.
- Provider keeps replaceable models, tools, applications, hardware, browsers, Git remotes, and cloud services outside the core.
- Capability represents versioned skills that can be evaluated and certified.
- Studio composes capabilities into useful domain production systems.
- Desktop gives the owner local control without owning hidden authority.
- Legacy preserves phase-era evidence without allowing it to govern active runtime.

This is narrow enough to be enforceable and broad enough to support Website Studio, future multimodal intake, local models, offline state, and later production workflows.

## Why Phase-Numbered Orchestration Is No Longer Production Architecture

Phase-numbered scripts helped S.E.R.A. accumulate capabilities quickly, but inspection showed they now duplicate core responsibilities and encode temporary transport mechanisms as if they were architecture. Production SERA OS needs stable component identities, contracts, lifecycle states, evaluations, and evidence standards. A phase number can remain historical context, but it cannot be the permanent boundary of a runtime subsystem.

Existing phase work should be classified as production module, evaluation asset, failure fixture, legacy reference, or obsolete before migration.

## Why Models and External Applications Are Providers

Models reason; tools measure and act. A model, browser, Git remote, cloud service, local application, OS integration, or hardware device can be useful, but none of them should define Kernel truth. Treating them as providers keeps SERA OS local-first, replaceable, testable, and offline-capable. It also prevents a specific model, browser session, SaaS account, remote repository, or hardware configuration from becoming an implicit requirement.

## Why Repository Snapshot Precedes Repository Truth

Repository Truth requires classification and claims about what every subsystem is. The previous inspection showed that unbounded traversal is risky in this repository because generated phase and proof folders are large. Repository Snapshot must come first as a deterministic, bounded inventory of source surfaces, runtime-data surfaces, legacy surfaces, and generated artifacts. Repository Truth can then classify a known snapshot instead of guessing from partial scans.

## Why Deterministic Scanners Precede Model Interpretation

Heuristic findings must never be represented as certain facts. Deterministic scanners can count files, parse manifests, identify imports, validate JSON, and detect callers more reliably than model interpretation. Model interpretation is useful after deterministic evidence exists, but it should explain and propose classifications rather than invent repository facts.

## Consequences

Benefits:

- clearer authority boundaries
- reduced coupling from Kernel upward
- local/offline MVP remains possible
- browser, ZIP, prompt, and OneDrive workflows can be retired safely
- capabilities become reusable and certifiable
- learning requires measurable improvement rather than saved text

Costs:

- package boundaries must be revisited
- `apps/operator-console` must shed non-UI capability logic
- `scripts/` must be classified and reduced
- root phase artifacts and proof folders must move out of active architecture
- tests must stop asserting obsolete behavior
- certification will need layer-aware checks

## Compatibility

Existing clean-core packages remain valuable. Existing phase-era scripts, documents, command files, overlays, and proofs remain available as evidence until Repository Snapshot and Repository Truth classify them. This ADR does not delete files, remove certified behavior, or implement new runtime code.

## Retirement Policy

A component can be retired when no active caller requires it, replacement capability is proven, reusable safety concepts are migrated, historical evidence is preserved where valuable, active tests no longer assert obsolete behavior, and the removal is reviewable and reversible.

Legacy components may be preserved as failure fixtures or historical references, but they must not remain runtime authority.

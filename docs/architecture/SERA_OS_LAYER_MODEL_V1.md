# SERA OS Layer Model v1

## Status

Version: v1

This document defines the seven permanent SERA OS layers. Current repository mappings are based on bounded inspection and are intentionally marked as `confirmed`, `provisional`, `review-required`, or `legacy`.

## Dependency Rule

Active layers depend downward:

```text
Desktop -> Studio -> Capability -> Runtime -> Kernel
```

Provider implementations attach through Kernel- or Runtime-owned interfaces. Legacy has no authority over active layers.

## Kernel

Purpose: define the permanent laws, contracts, identities, boundaries, and terminal state rules.

Responsibilities:

- shared types and IDs
- attempt state contracts
- safety primitives
- permission and boundary contracts
- capability lifecycle contracts
- architectural governance records

Allowed dependencies:

- standard library
- deterministic local utilities
- internal Kernel contracts

Forbidden dependencies:

- Desktop, Studio, concrete providers, browser automation, GitHub, ChatGPT, Codex, OneDrive, ZIP overlays, runtime UI state

Current repository candidates:

| Candidate | Mapping |
| --- | --- |
| `packages/shared` | confirmed |
| `packages/contracts` | confirmed |
| `packages/safety` | confirmed |
| `packages/kernel` | provisional; current package imports too broadly |
| `architecture/capability-inventory.json` | provisional governance seed |

Migration targets:

- `sera-os-kernel`
- shared execution and permission contracts
- capability lifecycle schema

Valid components:

- attempt state machine
- boundary policy
- capability ID schema
- provider interface contracts

Invalid placement:

- React UI state
- model-specific client code
- GitHub workflow implementation
- browser DOM automation

Testing expectations:

- pure contract tests
- invalid transition tests
- boundary denial tests
- no network or provider dependency

Evidence expectations:

- contract result
- safety decision record
- terminal status behavior
- known limitations

## Runtime

Purpose: operate SERA OS locally by coordinating state, evidence, scheduling, execution attempts, validation, evaluation, and learning records.

Responsibilities:

- control plane
- local state store
- artifact and evidence storage
- task and attempt lifecycle
- isolated execution coordination
- evaluation orchestration
- learning records and promotion gates

Allowed dependencies:

- Kernel
- provider interfaces owned by Kernel or Runtime
- deterministic local storage and process APIs

Forbidden dependencies:

- Desktop as source of operational truth
- direct browser prompt state
- ZIP overlays as authority
- GitHub as required state store
- concrete model provider hard dependency

Current repository candidates:

| Candidate | Mapping |
| --- | --- |
| `packages/workspace` | confirmed |
| `packages/artifacts` | confirmed |
| `packages/memory` | provisional |
| `packages/knowledge` | provisional |
| `packages/planner` | provisional |
| `packages/certs` | provisional; depends upward on console today |
| `packages/autonomy` | review-required; mixes runtime orchestration and capability behavior |
| `packages/runtime-state` | confirmed; SQLite Operational State v1 |
| `packages/runtime-recovery` | confirmed; Persistent Runtime Recovery v1 |
| `.sera-*` runtime directories | legacy/runtime-data; not source authority |

Migration targets:

- `local-runtime-host`
- `runtime-control-plane`
- `repository-snapshot`
- `repository-truth`
- `runtime-state-store`
- `evaluation-engine`
- `learning-engine`

Valid components:

- local Runtime Host
- SQLite state store via `@sera/runtime-state`
- persistent recovery coordinator via `@sera/runtime-recovery`
- attempt ledger
- evaluation runner
- learning promotion record
- evidence index

Invalid placement:

- UI-only dashboards
- provider-specific SDKs
- phase-numbered orchestration scripts as production runtime

Testing expectations:

- state transition integration tests
- artifact schema tests
- local restart persistence tests
- evaluation repeatability tests

Evidence expectations:

- baseline path
- attempt record
- validation result
- evaluation summary
- state mutation summary

### Runtime Identity Reservation

Milestone 5A introduces persistent `installationId` and per-start `runtimeInstanceId`.

Milestone 5B introduces local SQLite Operational State for command idempotency, attempt state, gate outcomes, evidence references, leases, backups, and deterministic exports.

Milestone 5C introduces Persistent Runtime Recovery for checkpointed interrupted attempts, linked retries, review-required blocking, recovery evidence, and Runtime health integration.

These Runtime milestones do not implement Hive Mode, networking, distributed discovery, remote workers, cloud execution, isolated execution, arbitrary subprocess workloads, or Desktop authority.

## Provider

Purpose: connect replaceable external or local resources through declared interfaces without making them Kernel dependencies.

Responsibilities:

- model adapters
- browser adapters
- Git and GitHub adapters
- OS and hardware adapters
- local tool adapters
- cloud or paid service adapters where explicitly approved

Allowed dependencies:

- Kernel and Runtime-owned provider interfaces
- provider SDKs or system APIs when declared

Forbidden dependencies:

- owning core state
- bypassing Runtime permissions
- becoming required for offline operation
- silently using network, secrets, billing, or remote handoffs

Current repository candidates:

| Candidate | Mapping |
| --- | --- |
| `packages/model-provider` | confirmed starter |
| `scripts/chatgpt-bridge-*` | legacy provider reference only |
| `scripts/sera-chatgpt-*` | legacy provider reference only |
| GitHub workflows | provisional infrastructure provider, not runtime |

Migration targets:

- `model-runtime`
- local model provider adapters
- future browser, Git, hardware, and app adapters

Valid components:

- Ollama adapter behind explicit local model configuration
- deterministic mock model provider
- filesystem tool adapter
- Git adapter with optional use

Invalid placement:

- provider code imported directly by Kernel
- browser state as operational truth
- ChatGPT artifact download as required runtime path

Testing expectations:

- adapter contract tests
- offline fallback tests
- redaction and permission tests
- deterministic mock coverage

Evidence expectations:

- provider name and version
- network/cost/secret use
- request and response summary
- fallback behavior

## Capability

Purpose: expose bounded, versioned skills that SERA OS can evaluate, certify, compose, improve, and retire.

Responsibilities:

- developer workers
- command runners
- patch runners
- branch runners
- research workers
- multimodal intake capability
- capability genome records

Allowed dependencies:

- Runtime
- Kernel
- Provider interfaces through Runtime

Forbidden dependencies:

- direct source mutation without Runtime evidence and permission gates
- untracked self-improvement
- UI as authority
- phase scripts as permanent capability boundaries

Current repository candidates:

| Candidate | Mapping |
| --- | --- |
| `packages/tools` | confirmed |
| `packages/workers` | confirmed |
| `packages/self-improvement` | provisional |
| `packages/research` | provisional |
| `apps/operator-console/src/*runner*.ts` | review-required; should migrate out of UI |
| `scripts/run-approved-*` | review-required or legacy |

Migration targets:

- command runner capability
- file patch capability
- repository intelligence capability
- multimodal intake
- learning engine hooks

Valid components:

- Website Studio implementation capabilities
- local file inspector
- bounded shell command runner
- citation-bound research worker

Invalid placement:

- React components
- raw PowerShell watcher scripts as certified capabilities
- prompt pasteback loops

Testing expectations:

- contract tests per capability
- boundary tests
- evaluation fixtures
- rollback tests where mutation exists

Evidence expectations:

- capability version
- permissions used
- tool/model use
- input and output evidence
- evaluation result

### Capability Engine Name

The permanent engine name is `Capability Engine`.

Do not rename it to "Capability and Intelligence Engine". The Intelligence Pipeline is a cross-system standard, not a reason to turn the Capability Engine into a monolith.

## Studio

Purpose: compose certified capabilities into domain production workflows.

Responsibilities:

- Website Studio
- future app, research, creative, automation, and production studios
- domain-specific planning
- deliverable packaging
- domain QA rubrics

Allowed dependencies:

- Capability
- Runtime for evidence and state
- Provider interfaces through Capability or Runtime

Forbidden dependencies:

- bypassing capability certification
- direct provider lock-in
- replacing evaluations with prompt claims
- owning Kernel contracts

Current repository candidates:

| Candidate | Mapping |
| --- | --- |
| `apps/operator-console/src/workflow-library.ts` | review-required |
| `apps/operator-console/src/workflow-composer.ts` | review-required |
| Website Studio | proposed target; not implemented as clean module yet |

Migration targets:

- `website-studio`
- future production studios

Valid components:

- website brief interpreter
- site evidence intake
- local build plan
- QA rubric runner
- packaging workflow

Invalid placement:

- command allowlist policy
- attempt state machine
- concrete browser automation

Testing expectations:

- end-to-end studio scenario tests
- rubric tests
- artifact completeness tests
- failure and revision loop tests

Evidence expectations:

- goal interpretation
- selected capabilities
- generated deliverables
- QA and evaluation results
- known limitations

### Application Versus Studio

An Application is the internal technical composition of capabilities, workflows, permissions, evaluations, runtime services, and providers.

A Studio is the user-facing experience built on an Application.

Example:

Website Studio -> Website Application -> Certified Capability Composition -> Runtime Services and Providers.

The term `Studio` remains part of S.E.R.A.'s architecture for user-facing production surfaces.

## Desktop

Purpose: provide local operator surfaces for SERA OS.

Responsibilities:

- local CLI
- desktop application
- operator dashboard
- approval inbox
- evidence viewer
- status display

Allowed dependencies:

- Studio
- Capability
- Runtime
- Kernel for displayable contracts

Forbidden dependencies:

- being the only state store
- bypassing Runtime for execution
- hidden mutation authority
- cloud-only operation

Current repository candidates:

| Candidate | Mapping |
| --- | --- |
| `apps/cli` | confirmed |
| `apps/operator-console` | provisional; contains UI and non-UI logic |
| `packages/operator-console` | provisional; likely split between Runtime and Desktop |
| root `SERA_*.ps1` launchers | legacy |

Migration targets:

- `desktop-operator`
- local approval and evidence UI
- downloadable local application shell

Valid components:

- CLI command surface
- local dashboard
- approval review screen
- evidence browser

Invalid placement:

- Kernel policy
- certification authority
- provider-specific runtime implementation

Testing expectations:

- UI rendering tests where practical
- command surface tests
- no hidden execution tests
- offline startup tests

Evidence expectations:

- displayed status source
- approval record path
- operator action record
- no hidden provider use

## Legacy

Purpose: preserve historical evidence, failure fixtures, migration lessons, and obsolete workflows without granting runtime authority.

Responsibilities:

- phase-era scripts and docs
- browser and ZIP workflow archive
- OneDrive and prompt handoff records
- failure fixtures
- retired tests and proofs

Allowed dependencies:

- none for active authority
- may be read by Repository Snapshot or Repository Truth as evidence

Forbidden dependencies:

- active layers depending on Legacy for operational truth
- restoring browser/ZIP/OneDrive as production authority
- tests asserting obsolete runtime behavior

Current repository candidates:

| Candidate | Mapping |
| --- | --- |
| `scripts/phase*` | legacy or review-required |
| `docs/phase*` | legacy |
| `.overlay` | legacy |
| root overlay patches | legacy |
| `commands/phase*.command.json` | legacy or failure fixtures |
| root watcher PowerShell scripts | legacy |
| `.sera-proof` and phase evidence folders | legacy evidence |

Migration targets:

- `legacy/browser-pipeline`
- failure fixtures
- archived evidence

Valid components:

- retired browser automation record
- phase recovery failure fixture
- overlay manifest archive

Invalid placement:

- active control plane
- certified command runner
- source of attempt state truth

Testing expectations:

- only regression fixtures that protect active architecture
- no tests requiring obsolete providers

Evidence expectations:

- reason for preservation
- replacement capability link
- retirement status
- no active authority declaration

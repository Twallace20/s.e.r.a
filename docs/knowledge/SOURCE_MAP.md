# S.E.R.A. Knowledge Source Map

Phase 15 establishes the first repo-level source map for S.E.R.A.'s local knowledge layer. The source map tells S.E.R.A. which repo files should be used as trusted local evidence when it needs to explain its own architecture, certification state, roadmap, safety posture, and operating commands.

This file is tracked in Git. Runtime knowledge artifacts generated under `.sera-knowledge/` remain ignored and can be rebuilt locally with `npm run knowledge:seed`.

## Source map rules

- Source map records describe trusted local repo sources; they do not grant new mutation authority.
- Runtime knowledge records under `.sera-knowledge/` are generated evidence and should not be committed.
- S.E.R.A. should retrieve evidence from these files before claiming what it can do, what it cannot do, or what phase it is in.
- External sources remain out of scope for this phase.
- Source map verification should pass before build, tests, and certification count.

## Seeded evidence groups

| Group | Purpose | Files |
| --- | --- | --- |
| Repo overview | Explains the current certified system, current commands, package boundaries, and intentionally absent capabilities. | `README.md` |
| Validation truth | Defines the local and CI validation commands that keep phases honest. | `docs/BUILD_VALIDATION.md` |
| Certification truth | Defines current certified level, completed runtime levels, and governance milestones. | `docs/roadmap/CERTIFICATION_LADDER.md` |
| Roadmap truth | Defines the remaining staged path from foundation to recursive learning. | `docs/roadmap/NEXT_EVOLUTION_ROADMAP.md` |
| Vision and guardrails | Defines the long-term product vision, non-negotiables, and definition of done. | `docs/vision/SERA_VISION.md`, `docs/vision/NON_NEGOTIABLES.md`, `docs/vision/DEFINITION_OF_DONE.md` |
| Architecture and safety | Defines package boundaries and local-first security expectations. | `docs/architecture/PACKAGE_BOUNDARIES.md`, `docs/security/SECURITY_BASELINE.md` |
| Governance milestones | Explains Phase 14 and Phase 15 as non-authority-expanding governance/evidence phases. | `docs/phases/PHASE_14_CI_CERTIFICATION_GATE_V1.md`, `docs/phases/PHASE_15_KNOWLEDGE_SEEDING_SOURCE_MAP_V1.md` |
| Runtime source evidence | Gives S.E.R.A. traceable source references for kernel orchestration, knowledge indexing, certification, and CLI commands. | `packages/kernel/src/sera-kernel.ts`, `packages/knowledge/src/knowledge-store.ts`, `packages/certs/src/certify.ts`, `apps/cli/src/index.ts` |
| Live autonomy proof | Proves the happy path and failed-validation path for queued autonomous dev work. | `tests/integration/live-autonomy-happy-path.test.ts` |

## Source records

### `README.md`

- Evidence role: repo overview, current state, package boundaries, and operator-facing command examples.
- Use when answering: what S.E.R.A. is, what works now, what is intentionally absent, which packages exist, and how to run the core commands.
- Risk note: README is summary evidence; confirm runtime certification through cert output or certification docs when precision matters.

### `docs/BUILD_VALIDATION.md`

- Evidence role: validation command truth.
- Use when answering: what commands must pass before a phase counts, what artifacts should stay out of Git, and what the expected certification output is.
- Risk note: generated runtime folders are excluded from committed source truth.

### `docs/roadmap/CERTIFICATION_LADDER.md`

- Evidence role: certified capability ladder and governance milestones.
- Use when answering: what certified levels exist, what each level proves, and which phases are governance-only.
- Risk note: a phase name alone is not proof; certification output and clean Git state still matter.

### `docs/roadmap/NEXT_EVOLUTION_ROADMAP.md`

- Evidence role: staged future plan.
- Use when answering: what comes next after the current phase and how the responsible recursive-agent path is sequenced.
- Risk note: roadmap entries are plans, not completed capabilities.

### `docs/vision/SERA_VISION.md`

- Evidence role: product and system north star.
- Use when answering: what S.E.R.A. is intended to become and why the local-first rebuild exists.

### `docs/vision/NON_NEGOTIABLES.md`

- Evidence role: safety and operating law.
- Use when answering: what S.E.R.A. must refuse, avoid, or prove before a capability counts.

### `docs/vision/DEFINITION_OF_DONE.md`

- Evidence role: completion standard.
- Use when answering: what finished means for a S.E.R.A. phase, worker, capability, or repo change.

### `docs/architecture/PACKAGE_BOUNDARIES.md`

- Evidence role: package ownership and boundary map.
- Use when answering: where code should live and which package owns which responsibility.

### `docs/security/SECURITY_BASELINE.md`

- Evidence role: local safety baseline.
- Use when answering: what boundaries exist around files, shell commands, runtime artifacts, and external access.

### `docs/phases/PHASE_14_CI_CERTIFICATION_GATE_V1.md`

- Evidence role: CI gate milestone.
- Use when answering: what Phase 14 added and why it does not change runtime authority.

### `docs/phases/PHASE_15_KNOWLEDGE_SEEDING_SOURCE_MAP_V1.md`

- Evidence role: Phase 15 scope and validation.
- Use when answering: what the knowledge seed/source map phase adds, what remains generated, and what commands validate it.

### `packages/kernel/src/sera-kernel.ts`

- Evidence role: runtime orchestration source.
- Use when answering: which subsystem methods the kernel exposes and how the CLI/certs coordinate runtime work.

### `packages/knowledge/src/knowledge-store.ts`

- Evidence role: local knowledge implementation.
- Use when answering: how ingestion, chunking, search, ignored runtime folders, and summaries work.

### `packages/certs/src/certify.ts`

- Evidence role: certification implementation.
- Use when answering: what the cert runner actually checks and what level it reports.

### `apps/cli/src/index.ts`

- Evidence role: command surface.
- Use when answering: what local CLI commands exist and how operators can invoke them.

## Phase 15 validation contract

Phase 15 is valid when all of the following pass:

```bash
npm run knowledge:source-map
npm run knowledge:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected runtime certification remains:

```text
S.E.R.A. certify: PASS level=operator-console-v1
```

Phase 15 creates a stronger evidence layer for S.E.R.A. to understand itself. It does not enable external research, autonomous execution, automatic lesson activation, or uncontrolled self-modification.

Phase 16 extends the map with the live autonomous happy-path proof so S.E.R.A. can retrieve evidence about the full local loop from task creation through operator reporting.

## Phase 16 source map additions

- `docs/phases/PHASE_16_LIVE_AUTONOMOUS_DEV_HAPPY_PATH_V1.md` — Phase 16 scope, safety boundaries, and validation contract.
- `tests/integration/live-autonomy-happy-path.test.ts` — integration proof for proposal mode, validation-gated apply mode, task completion, memory evidence, autonomy evidence, and operator reporting.

## Phase 17 source map additions

- `packages/memory/src/memory-store.ts` — lesson memory records and the Phase 17 workbench report surface.
- `docs/phases/PHASE_17_LESSON_REVIEW_WORKBENCH_V1.md` — Phase 17 scope, safety boundaries, and validation contract.
- `scripts/run-lesson-review-workbench.mjs` — repeatable local demo proving the workbench writes review packets without automatic approvals or activations.
- `tests/integration/lesson-review-workbench.test.ts` — integration proof that the workbench is review-only and preserves manual activation boundaries.

## Phase 18 source map additions

- `docs/governance/FREE_CORE_COVENANT.md` — free/local-first certification covenant through Phase 45.
- `docs/phases/PHASE_18_LOCAL_MODEL_PROVIDER_V1.md` — Phase 18 scope, boundaries, and validation contract.
- `packages/model-provider/src/model-provider-store.ts` — mock/local/external provider registry and optional local provider readiness.
- `scripts/check-free-core-covenant.mjs` — validates the Free Core Covenant is present and wired into verify.
- `scripts/run-local-model-provider.mjs` — repeatable local demo for the Phase 18 provider boundary.
- `tests/integration/local-model-provider.test.ts` — integration proof for optional local-only provider behavior.

## Phase 19 source map additions

- `docs/phases/PHASE_19_RECURSIVE_LEARNING_V1.md` — Phase 19 scope, recursive learning boundaries, and local validation contract.
- `scripts/run-recursive-learning.mjs` — repeatable local demo proving recursive learning is report-only and preserves human-governed decisions.
- `tests/integration/recursive-learning.test.ts` — integration proof that recursive learning records cycles without approving, activating, or mutating runtime behavior.

## Phase 20 source map additions

- `packages/workers/src/multi-file-developer-worker.ts` — local/free multi-file developer patching with suggestion, backup, validation, and rollback boundaries.
- `docs/phases/PHASE_20_MULTI_FILE_DEV_WORKER_V3.md` — Phase 20 scope, guardrails, and validation contract.
- `scripts/run-multi-file-dev-worker.mjs` — repeatable local demo for multi-file patch apply and rollback proof.
- `tests/integration/multi-file-dev-worker.test.ts` — integration proof for suggestion, direct apply, and validation rollback.

## Phase 21 source map additions

- `packages/research/src/research-knowledge-worker.ts` — local research worker implementation for citation-bound answers, comparisons, summaries, and missing-evidence refusal.
- `docs/phases/PHASE_21_RESEARCH_KNOWLEDGE_WORKER_V1.md` — Phase 21 scope, safety boundaries, and validation contract.
- `scripts/run-research-knowledge-worker.mjs` — repeatable local demo proving citation-bound research behavior without web, paid APIs, or model dependency.
- `tests/integration/research-knowledge-worker.test.ts` — integration proof for local citations, insufficient-evidence refusal, comparisons, summaries, and history records.

## Phase 22 — Operator Console v2 / Terminal UI

- `docs/phases/PHASE_22_OPERATOR_CONSOLE_V2_TERMINAL_UI.md` — Defines the Phase 22 terminal dashboard purpose, boundary, and validation requirements.
- `scripts/lib/operator-console-v2.mjs` — Builds and renders the local operator terminal dashboard from existing runtime evidence.
- `scripts/run-operator-console-v2.mjs` — Runs the Phase 22 dashboard demo and writes local dashboard artifacts.
- `tests/integration/operator-console-v2.test.ts` — Proves the dashboard builds from local evidence, renders terminal text, and writes local artifacts.

## Phase 23 — SQLite Persistence v1

- `docs/phases/PHASE_23_SQLITE_PERSISTENCE_V1.md` — Defines the Phase 23 local SQLite persistence purpose, boundary, and validation requirements.
- `scripts/lib/sqlite-persistence-v1.mjs` — Provides the local SQLite persistence store, schema, summaries, and path containment.
- `scripts/run-sqlite-persistence-v1.mjs` — Runs the Phase 23 SQLite demo and writes local persistence artifacts.
- `tests/integration/sqlite-persistence-v1.test.ts` — Proves database initialization, record round trips, artifact output, and path containment.

## Phase 24 — Tool / Plugin Registry v1

- `docs/phases/PHASE_24_TOOL_PLUGIN_REGISTRY_V1.md` — Defines the Phase 24 registry purpose, boundary, and validation requirements.
- `scripts/lib/tool-plugin-registry-v1.mjs` — Provides local tool/plugin manifest storage, risk classification, permission classification, and summary artifacts.
- `scripts/run-tool-plugin-registry-v1.mjs` — Runs the Phase 24 registry demo and writes local registry artifacts.
- `tests/integration/tool-plugin-registry-v1.test.ts` — Proves registry initialization, local/free-core classification, approval guarding, external adapter exclusion, artifact output, and path containment.

## Phase 25 — Capability Registry + Skill Graph v1

Phase 25 adds a local capability registry and skill graph so S.E.R.A. can track what it can do, what evidence supports each capability, what tools and knowledge each capability depends on, and what needs improvement.

- `docs/phases/PHASE_25_CAPABILITY_REGISTRY_SKILL_GRAPH_V1.md` — Defines Phase 25 purpose, boundary, validation, and completion criteria.
- `scripts/lib/capability-registry-skill-graph-v1.mjs` — Implements the local capability registry, capability assessment, skill graph, event log, and summary artifacts.
- `scripts/run-capability-registry-skill-graph-v1.mjs` — Runs the Phase 25 demo and writes local capability reports.
- `tests/integration/capability-registry-skill-graph-v1.test.ts` — Verifies local registry initialization, capability registration, graph links, external capability exclusion, and report artifacts.

## Phase 25B — CI Workflow Gate v1

Phase 25B adds a read-only GitHub Actions verification gate so S.E.R.A. branches can produce remote proof without merge authority, source mutation authority, secret access, paid API dependency, or deployment authority.

- `.github/workflows/verify.yml` — Defines the remote validation gate for push, pull request, and manual workflow_dispatch runs.
- `docs/phases/PHASE_25B_CI_WORKFLOW_GATE_V1.md` — Defines Phase 25B purpose, boundary, validation, and completion criteria.
- `scripts/lib/ci-workflow-gate-v1.mjs` — Inspects the workflow gate and writes local evidence reports.
- `scripts/run-ci-workflow-gate-v1.mjs` — Runs the Phase 25B demo and writes local CI gate reports.
- `tests/integration/ci-workflow-gate-v1.test.ts` — Verifies workflow safety checks, mutation blocking, warning detection, and artifact output.

## Phase 25C — Phase Artifact Packet v1

Phase 25C defines the standard artifact packet format for future S.E.R.A. phases, overlays, remote proof, branch handoffs, and overnight work packets.

- `docs/phases/PHASE_25C_PHASE_ARTIFACT_PACKET_V1.md` — Defines Phase 25C purpose, boundary, packet structure, validation, and completion criteria.
- `scripts/lib/phase-artifact-packet-v1.mjs` — Creates and validates local phase packet manifests and writes evidence reports.
- `scripts/run-phase-artifact-packet-v1.mjs` — Runs the Phase 25C demo and writes local packet evidence reports.
- `tests/integration/phase-artifact-packet-v1.test.ts` — Verifies packet initialization, manifest creation, safety checks, and evidence output.

## Phase 26 — Evaluation Harness v1

Phase 26 adds a local deterministic evaluation harness so S.E.R.A. can measure capability quality, safety boundaries, and regressions before future recursive improvement.

- `docs/phases/PHASE_26_EVALUATION_HARNESS_V1.md` — Defines Phase 26 purpose, boundary, evaluation model, and completion criteria.
- `scripts/lib/evaluation-harness-v1.mjs` — Creates local evaluation suites, runs deterministic cases, scores assertions, and writes evidence reports.
- `scripts/run-evaluation-harness-v1.mjs` — Runs the Phase 26 demo and writes local evaluation evidence reports.
- `tests/integration/evaluation-harness-v1.test.ts` — Verifies runtime initialization, suite creation, scoring, blocker detection, and evidence output.

## Phase 27 — Regression Baseline Registry v1

Phase 27 adds a local regression baseline registry so S.E.R.A. can preserve known-good evaluation expectations and detect drift before future autonomous or overnight development work is trusted.

- `docs/phases/PHASE_27_REGRESSION_BASELINE_REGISTRY_V1.md` — Defines Phase 27 purpose, baseline model, safety boundary, and completion criteria.
- `scripts/lib/regression-baseline-registry-v1.mjs` — Creates baseline records, validates protected expectations, compares evaluation summaries, and writes evidence reports.
- `scripts/run-regression-baseline-registry-v1.mjs` — Runs the Phase 27 demo and writes local regression baseline evidence reports.
- `tests/integration/regression-baseline-registry-v1.test.ts` — Verifies runtime initialization, default baseline creation, validation, regression detection, and evidence output.

## Phase 28 — Curriculum Builder v1

Phase 28 adds a local curriculum builder so S.E.R.A. can convert capability gaps, regression baselines, and roadmap goals into a sequenced learning plan before more autonomy is trusted.

- `docs/phases/PHASE_28_CURRICULUM_BUILDER_V1.md` — Defines Phase 28 purpose, curriculum model, safety boundary, and completion criteria.
- `scripts/lib/curriculum-builder-v1.mjs` — Ranks capability gaps, creates curriculum modules, validates owner-approval boundaries, and writes evidence reports.
- `scripts/run-curriculum-builder-v1.mjs` — Runs the Phase 28 demo and writes local curriculum evidence reports.
- `tests/integration/curriculum-builder-v1.test.ts` — Verifies runtime initialization, gap ranking, curriculum creation, safety boundaries, and evidence output.

## Phase 29 — Domain Learning Packs v1

Phase 29 adds local domain learning packs so S.E.R.A. can package curriculum modules into safe, reviewable domain plans before learning activation is trusted.

- `docs/phases/PHASE_29_DOMAIN_LEARNING_PACKS_V1.md` — Defines Phase 29 purpose, domain pack model, safety boundary, and completion criteria.
- `scripts/lib/domain-learning-packs-v1.mjs` — Creates domain learning pack registries, validates pack objectives, checks boundaries, and writes evidence reports.
- `scripts/run-domain-learning-packs-v1.mjs` — Runs the Phase 29 demo and writes local domain pack evidence reports.
- `tests/integration/domain-learning-packs-v1.test.ts` — Verifies runtime initialization, registry creation, pack validation, safety boundaries, and evidence output.

## Phase 30 — Knowledge Refresh + Source Trust v1

Phase 30 adds a local source trust registry so S.E.R.A. can separate source-of-truth documents, implementation evidence, test evidence, generated runtime evidence, planning notes, and review-required external references before learning activation or remote work relies on them.

- `docs/phases/PHASE_30_KNOWLEDGE_REFRESH_SOURCE_TRUST_V1.md` — Defines Phase 30 purpose, source trust model, refresh policy boundary, and completion criteria.
- `scripts/lib/knowledge-refresh-source-trust-v1.mjs` — Creates source trust registries, validates freshness/trust boundaries, blocks network refresh, and writes evidence reports.
- `scripts/run-knowledge-refresh-source-trust-v1.mjs` — Runs the Phase 30 demo and writes local source trust evidence reports.
- `tests/integration/knowledge-refresh-source-trust-v1.test.ts` — Verifies runtime initialization, registry creation, trust validation, safety boundaries, and evidence output.

## Phase 31 — Planner / Task Decomposer v2

Phase 31 adds a local planner v2 and task decomposer so S.E.R.A. can convert trusted phase objectives into ordered tasks, dependencies, validation gates, evidence requirements, and owner approval checkpoints before orchestration or remote work attempts to act.

- `docs/phases/PHASE_31_PLANNER_TASK_DECOMPOSER_V2.md` — Defines Phase 31 purpose, planner model, boundary rules, and completion criteria.
- `scripts/lib/planner-task-decomposer-v2.mjs` — Creates phase plans, validates dependencies and gates, decomposes tasks, and writes evidence reports.
- `scripts/run-planner-task-decomposer-v2.mjs` — Runs the Phase 31 demo and writes local planner evidence reports.
- `tests/integration/planner-task-decomposer-v2.test.ts` — Verifies runtime initialization, plan creation, dependency validation, decomposition, and safety boundaries.

## Phase 32 — Phase Packet Generator v1

Phase 32 adds a local phase packet generator so S.E.R.A. can convert trusted objectives, task decompositions, validation gates, evidence requirements, rollback notes, and owner approval checkpoints into standardized phase packet blueprints before implementation or execution.

- `docs/phases/PHASE_32_PHASE_PACKET_GENERATOR_V1.md` — Defines Phase 32 purpose, packet generator boundary, validation, and completion criteria.
- `scripts/lib/phase-packet-generator-v1.mjs` — Creates, validates, summarizes, and writes local phase packet generator evidence.
- `scripts/run-phase-packet-generator-v1.mjs` — Runs the Phase 32 demo and writes packet generator reports.
- `tests/integration/phase-packet-generator-v1.test.ts` — Verifies packet generation, validation, readiness summary, reporting, and safety boundaries.

## Phase 33 — Branch Proposal Builder v1

Phase 33 adds a local branch proposal builder so S.E.R.A. can convert generated phase packet context into a reviewable branch proposal with declared files, validation commands, evidence requirements, risk checks, and owner approval gates before any branch is created or executed.

- `docs/phases/PHASE_33_BRANCH_PROPOSAL_BUILDER_V1.md` — Defines Phase 33 purpose, branch proposal boundary, validation, and completion criteria.
- `docs/phases/PHASE_34_BRANCH_READINESS_INSPECTOR_V1.md` — Defines Phase 34 purpose, branch proposal boundary, validation, and completion criteria.
- `docs/phases/PHASE_35_REMOTE_PHASE_RUNNER_BLUEPRINT_V1.md` — Defines Phase 35 purpose, branch proposal boundary, validation, and completion criteria.
- `docs/phases/PHASE_36_OWNER_APPROVAL_QUEUE_V1.md` — Defines Phase 36 purpose, branch proposal boundary, validation, and completion criteria.
- `docs/phases/PHASE_37_SELF_HOSTED_RUNNER_ADAPTER_V1.md` — Defines Phase 37 purpose, branch proposal boundary, validation, and completion criteria.
- `docs/phases/PHASE_38_COMMAND_ALLOWLIST_GATE_V1.md` — Defines Phase 38 purpose, branch proposal boundary, validation, and completion criteria.
- `docs/phases/PHASE_39_EVIDENCE_CAPTURE_BUNDLE_V1.md` — Defines Phase 39 purpose, branch proposal boundary, validation, and completion criteria.
- `docs/phases/PHASE_40_OVERNIGHT_BRANCH_WORKER_V1.md` — Defines Phase 40 purpose, branch proposal boundary, validation, and completion criteria.
- `scripts/lib/branch-proposal-builder-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/lib/branch-readiness-inspector-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/lib/remote-phase-runner-blueprint-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/lib/owner-approval-queue-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/lib/self-hosted-runner-adapter-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/lib/command-allowlist-gate-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/lib/evidence-capture-bundle-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/lib/overnight-branch-worker-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/run-branch-proposal-builder-v1.mjs` — Runs the Phase 33 demo and writes branch proposal reports.
- `scripts/run-branch-readiness-inspector-v1.mjs` — Runs the Phase 34 demo and writes branch proposal reports.
- `scripts/run-remote-phase-runner-blueprint-v1.mjs` — Runs the Phase 35 demo and writes branch proposal reports.
- `scripts/run-owner-approval-queue-v1.mjs` — Runs the Phase 36 demo and writes branch proposal reports.
- `scripts/run-self-hosted-runner-adapter-v1.mjs` — Runs the Phase 37 demo and writes branch proposal reports.
- `scripts/run-command-allowlist-gate-v1.mjs` — Runs the Phase 38 demo and writes branch proposal reports.
- `scripts/run-evidence-capture-bundle-v1.mjs` — Runs the Phase 39 demo and writes branch proposal reports.
- `scripts/run-overnight-branch-worker-v1.mjs` — Runs the Phase 40 demo and writes branch proposal reports.
- `tests/integration/branch-proposal-builder-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.
- `tests/integration/branch-readiness-inspector-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.
- `tests/integration/remote-phase-runner-blueprint-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.
- `tests/integration/owner-approval-queue-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.
- `tests/integration/self-hosted-runner-adapter-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.
- `tests/integration/command-allowlist-gate-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.
- `tests/integration/evidence-capture-bundle-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.
- `tests/integration/overnight-branch-worker-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.

## PHASE 34 — BRANCH READINESS INSPECTOR V1

- docs/phases/PHASE_34_BRANCH_READINESS_INSPECTOR_V1.md
- scripts/lib/branch-readiness-inspector-v1.mjs
- scripts/run-branch-readiness-inspector-v1.mjs
- tests/integration/branch-readiness-inspector-v1.test.ts

## Phase 34 — Branch Readiness Inspector v1

docs/phases/PHASE_34_BRANCH_READINESS_INSPECTOR_V1.md
scripts/lib/branch-readiness-inspector-v1.mjs
scripts/run-branch-readiness-inspector-v1.mjs
tests/integration/branch-readiness-inspector-v1.test.ts

## PHASE 35 — REMOTE PHASE RUNNER BLUEPRINT V1

- docs/phases/PHASE_35_REMOTE_PHASE_RUNNER_BLUEPRINT_V1.md
- scripts/lib/remote-phase-runner-blueprint-v1.mjs
- scripts/run-remote-phase-runner-blueprint-v1.mjs
- tests/integration/remote-phase-runner-blueprint-v1.test.ts

## PHASE 36 — OWNER APPROVAL QUEUE V1

- docs/phases/PHASE_36_OWNER_APPROVAL_QUEUE_V1.md
- scripts/lib/owner-approval-queue-v1.mjs
- scripts/run-owner-approval-queue-v1.mjs
- tests/integration/owner-approval-queue-v1.test.ts

## PHASE 37 — SELF-HOSTED RUNNER ADAPTER V1

- docs/phases/PHASE_37_SELF_HOSTED_RUNNER_ADAPTER_V1.md
- scripts/lib/self-hosted-runner-adapter-v1.mjs
- scripts/run-self-hosted-runner-adapter-v1.mjs
- tests/integration/self-hosted-runner-adapter-v1.test.ts

## PHASE 38 — COMMAND ALLOWLIST GATE V1

- docs/phases/PHASE_38_COMMAND_ALLOWLIST_GATE_V1.md
- scripts/lib/command-allowlist-gate-v1.mjs
- scripts/run-command-allowlist-gate-v1.mjs
- tests/integration/command-allowlist-gate-v1.test.ts

## PHASE 39 — EVIDENCE CAPTURE BUNDLE V1

- docs/phases/PHASE_39_EVIDENCE_CAPTURE_BUNDLE_V1.md
- scripts/lib/evidence-capture-bundle-v1.mjs
- scripts/run-evidence-capture-bundle-v1.mjs
- tests/integration/evidence-capture-bundle-v1.test.ts

## PHASE 40 — OVERNIGHT BRANCH WORKER V1

- docs/phases/PHASE_40_OVERNIGHT_BRANCH_WORKER_V1.md
- scripts/lib/overnight-branch-worker-v1.mjs
- scripts/run-overnight-branch-worker-v1.mjs
- tests/integration/overnight-branch-worker-v1.test.ts

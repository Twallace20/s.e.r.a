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
- `docs/phases/PHASE_41_OWNER_DECISION_RECORDER_V1.md` — Defines Phase 41 purpose, branch proposal boundary, validation, and completion criteria.
- `docs/phases/PHASE_42_APPROVAL_GATED_ACTION_PLAN_V1.md` — Defines Phase 42 purpose, branch proposal boundary, validation, and completion criteria.
- `docs/phases/PHASE_43_SESSION_LOCK_GUARD_V1.md` — Defines Phase 43 purpose, branch proposal boundary, validation, and completion criteria.
- `docs/phases/PHASE_44_EMERGENCY_STOP_GUARD_V1.md` — Defines Phase 44 purpose, branch proposal boundary, validation, and completion criteria.
- `docs/phases/PHASE_45_FREE_CORE_COVENANT_CHECKPOINT_V1.md` — Defines Phase 45 purpose, branch proposal boundary, validation, and completion criteria.
- `scripts/lib/branch-proposal-builder-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/lib/branch-readiness-inspector-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/lib/remote-phase-runner-blueprint-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/lib/owner-approval-queue-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/lib/self-hosted-runner-adapter-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/lib/command-allowlist-gate-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/lib/evidence-capture-bundle-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/lib/overnight-branch-worker-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/lib/owner-decision-recorder-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/lib/approval-gated-action-plan-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/lib/session-lock-guard-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/lib/emergency-stop-guard-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/lib/free-core-covenant-checkpoint-v1.mjs` — Creates, validates, summarizes, and writes local branch proposal evidence.
- `scripts/run-branch-proposal-builder-v1.mjs` — Runs the Phase 33 demo and writes branch proposal reports.
- `scripts/run-branch-readiness-inspector-v1.mjs` — Runs the Phase 34 demo and writes branch proposal reports.
- `scripts/run-remote-phase-runner-blueprint-v1.mjs` — Runs the Phase 35 demo and writes branch proposal reports.
- `scripts/run-owner-approval-queue-v1.mjs` — Runs the Phase 36 demo and writes branch proposal reports.
- `scripts/run-self-hosted-runner-adapter-v1.mjs` — Runs the Phase 37 demo and writes branch proposal reports.
- `scripts/run-command-allowlist-gate-v1.mjs` — Runs the Phase 38 demo and writes branch proposal reports.
- `scripts/run-evidence-capture-bundle-v1.mjs` — Runs the Phase 39 demo and writes branch proposal reports.
- `scripts/run-overnight-branch-worker-v1.mjs` — Runs the Phase 40 demo and writes branch proposal reports.
- `scripts/run-owner-decision-recorder-v1.mjs` — Runs the Phase 41 demo and writes branch proposal reports.
- `scripts/run-approval-gated-action-plan-v1.mjs` — Runs the Phase 42 demo and writes branch proposal reports.
- `scripts/run-session-lock-guard-v1.mjs` — Runs the Phase 43 demo and writes branch proposal reports.
- `scripts/run-emergency-stop-guard-v1.mjs` — Runs the Phase 44 demo and writes branch proposal reports.
- `scripts/run-free-core-covenant-checkpoint-v1.mjs` — Runs the Phase 45 demo and writes branch proposal reports.
- `tests/integration/branch-proposal-builder-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.
- `tests/integration/branch-readiness-inspector-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.
- `tests/integration/remote-phase-runner-blueprint-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.
- `tests/integration/owner-approval-queue-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.
- `tests/integration/self-hosted-runner-adapter-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.
- `tests/integration/command-allowlist-gate-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.
- `tests/integration/evidence-capture-bundle-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.
- `tests/integration/overnight-branch-worker-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.
- `tests/integration/owner-decision-recorder-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.
- `tests/integration/approval-gated-action-plan-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.
- `tests/integration/session-lock-guard-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.
- `tests/integration/emergency-stop-guard-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.
- `tests/integration/free-core-covenant-checkpoint-v1.test.ts` — Verifies branch proposal creation, validation, reporting, and safety boundaries.

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

## PHASE 41 — OWNER DECISION RECORDER V1

- docs/phases/PHASE_41_OWNER_DECISION_RECORDER_V1.md
- scripts/lib/owner-decision-recorder-v1.mjs
- scripts/run-owner-decision-recorder-v1.mjs
- tests/integration/owner-decision-recorder-v1.test.ts

## PHASE 42 — APPROVAL-GATED ACTION PLAN V1

- docs/phases/PHASE_42_APPROVAL_GATED_ACTION_PLAN_V1.md
- scripts/lib/approval-gated-action-plan-v1.mjs
- scripts/run-approval-gated-action-plan-v1.mjs
- tests/integration/approval-gated-action-plan-v1.test.ts

## PHASE 43 — SESSION LOCK GUARD V1

- docs/phases/PHASE_43_SESSION_LOCK_GUARD_V1.md
- scripts/lib/session-lock-guard-v1.mjs
- scripts/run-session-lock-guard-v1.mjs
- tests/integration/session-lock-guard-v1.test.ts

## PHASE 44 — EMERGENCY STOP GUARD V1

- docs/phases/PHASE_44_EMERGENCY_STOP_GUARD_V1.md
- scripts/lib/emergency-stop-guard-v1.mjs
- scripts/run-emergency-stop-guard-v1.mjs
- tests/integration/emergency-stop-guard-v1.test.ts

## PHASE 45 — FREE CORE COVENANT CHECKPOINT V1

- docs/phases/PHASE_45_FREE_CORE_COVENANT_CHECKPOINT_V1.md
- scripts/lib/free-core-covenant-checkpoint-v1.mjs
- scripts/run-free-core-covenant-checkpoint-v1.mjs
- tests/integration/free-core-covenant-checkpoint-v1.test.ts

| Private operator app shell | Defines the first private web app shell, app boundaries, build commands, verification script, and next Phase 47–50 sequence. | `docs/phases/PHASE_46_PRIVATE_OPERATOR_APP_SHELL_V1.md`, `apps/operator-console/README.md`, `apps/operator-console/src/App.tsx`, `scripts/lib/private-operator-app-shell-v1.mjs`, `tests/integration/private-operator-app-shell-v1.test.ts` |

### `docs/phases/PHASE_46_PRIVATE_OPERATOR_APP_SHELL_V1.md`

- Evidence role: Phase 46 private app shell contract and build instructions.
- Use when answering: how to apply, build, preview, validate, merge, tag, and close Phase 46.
- Risk note: Phase 46 is a frontend/private shell milestone and does not grant new backend, command execution, runner, mutation, or auto-merge authority.

### `apps/operator-console/README.md`

- Evidence role: local operator app usage, build, and preview commands.
- Use when answering: how to run the private app locally.

### `apps/operator-console/src/App.tsx`

- Evidence role: implemented dashboard surfaces and sample UI structure.
- Use when answering: which private app modules are visible in Phase 46.

### `scripts/lib/private-operator-app-shell-v1.mjs`

- Evidence role: Phase 46 verification contract and safety boundaries.
- Use when answering: what Phase 46 proves and blocks.

### `tests/integration/private-operator-app-shell-v1.test.ts`

- Evidence role: test proof for app surfaces, build docs, evidence writing, and authority boundaries.
- Use when answering: whether Phase 46 is tested.

## Phase 46 Private Operator App Shell v1 app-shell source records

### `scripts/run-private-operator-app-shell-v1.mjs`

- Evidence role: Phase 46 demo runner for the private operator app shell.
- Use when answering: how to run the app-shell proof command and confirm the Phase 46 PASS result.

### `apps/operator-console/package.json`

- Evidence role: private operator console app package boundary, local scripts, and frontend dependencies.
- Use when answering: how the private app shell is installed, previewed, and built locally.

### `apps/operator-console/index.html`

- Evidence role: Vite HTML entrypoint for the private operator console.
- Use when answering: where the private app shell mounts in the browser.

### `apps/operator-console/vite.config.ts`

- Evidence role: Vite configuration for the private operator console app.
- Use when answering: how the local frontend build and preview tooling is configured.

### `apps/operator-console/tsconfig.json`

- Evidence role: TypeScript configuration for the private operator console app.
- Use when answering: how the app shell TypeScript surface is checked separately from core runtime packages.

### `apps/operator-console/src/main.tsx`

- Evidence role: React entrypoint for the private operator console.
- Use when answering: how the app shell is mounted into the Vite frontend.

### `apps/operator-console/src/styles.css`

- Evidence role: private operator console design system, layout styling, and dark-mode shell presentation.
- Use when answering: how the Phase 46 visual direction is implemented without backend logic.

| Operator app runtime reader | Defines the read-only status packet that connects the private operator app shell to current S.E.R.A. repo/runtime truth without adding backend execution. | `docs/phases/PHASE_47_OPERATOR_APP_RUNTIME_READER_V1.md`, `apps/operator-console/src/runtime-status.ts`, `scripts/lib/operator-app-runtime-reader-v1.mjs`, `scripts/run-operator-app-runtime-reader-v1.mjs`, `tests/integration/operator-app-runtime-reader-v1.test.ts` |

### `docs/phases/PHASE_47_OPERATOR_APP_RUNTIME_READER_V1.md`

- Evidence role: Phase 47 runtime-reader contract and validation instructions.
- Use when answering: what Phase 47 wires into the private app and what authority it still blocks.

### `apps/operator-console/src/runtime-status.ts`

- Evidence role: typed frontend-consumable S.E.R.A. status packet.
- Use when answering: what status fields the private operator app reads in Phase 47.

### `scripts/lib/operator-app-runtime-reader-v1.mjs`

- Evidence role: Phase 47 verification contract and runtime-reader safety boundaries.
- Use when answering: how the runtime-reader surface is checked.

### `scripts/run-operator-app-runtime-reader-v1.mjs`

- Evidence role: Phase 47 demo runner.
- Use when answering: how to prove the runtime reader is ready.

### `tests/integration/operator-app-runtime-reader-v1.test.ts`

- Evidence role: test proof for runtime-reader fields, app binding, report writing, and blocked unsafe boundaries.
- Use when answering: how Phase 47 remains read-only and private-app-only.

| Request intake | Defines the capture-only private operator request intake surface for Phase 48. | `docs/phases/PHASE_48_REQUEST_INTAKE_V1.md`, `apps/operator-console/src/request-intake.ts`, `scripts/lib/request-intake-v1.mjs`, `scripts/run-request-intake-v1.mjs`, `tests/integration/request-intake-v1.test.ts` |

### `docs/phases/PHASE_48_REQUEST_INTAKE_V1.md`

- Evidence role: Phase 48 request-intake contract and validation instructions.
- Use when answering: what Phase 48 adds, what it blocks, and why it remains capture-only.

### `apps/operator-console/src/request-intake.ts`

- Evidence role: typed frontend-consumable request draft packet and request-intake safety gates.
- Use when answering: what fields the private operator app can display for request intake.

### `scripts/lib/request-intake-v1.mjs`

- Evidence role: Phase 48 verification contract and request-intake safety boundary checks.
- Use when answering: how the request-intake surface is validated as capture-only.

### `scripts/run-request-intake-v1.mjs`

- Evidence role: Phase 48 demo runner.
- Use when answering: how to prove request intake is ready.

### `tests/integration/request-intake-v1.test.ts`

- Evidence role: test proof for request fields, app bindings, generated reports, and blocked unsafe boundaries.
- Use when answering: how Phase 48 blocks command execution, runner connectivity, auto-submit, auto-route, auto-merge, and self-approval.

| File intake | Defines the metadata-only private operator file intake surface for Phase 49. | `docs/phases/PHASE_49_FILE_INTAKE_V1.md`, `apps/operator-console/src/file-intake.ts`, `scripts/lib/file-intake-v1.mjs`, `scripts/run-file-intake-v1.mjs`, `tests/integration/file-intake-v1.test.ts` |

### `docs/phases/PHASE_49_FILE_INTAKE_V1.md`

- Evidence role: Phase 49 file-intake contract and validation instructions.
- Use when answering: what Phase 49 adds, what it blocks, and why it remains metadata-only.

### `apps/operator-console/src/file-intake.ts`

- Evidence role: typed frontend-consumable file metadata packet and file-intake safety gates.
- Use when answering: what file metadata the private operator app can display for intake review.

### `scripts/lib/file-intake-v1.mjs`

- Evidence role: Phase 49 verification contract and file-intake safety boundary checks.
- Use when answering: how the file-intake surface is validated as metadata-only.

### `scripts/run-file-intake-v1.mjs`

- Evidence role: Phase 49 demo runner.
- Use when answering: how to prove file intake is ready.

### `tests/integration/file-intake-v1.test.ts`

- Evidence role: test proof for file metadata fields, app bindings, generated reports, and blocked unsafe boundaries.
- Use when answering: how Phase 49 blocks arbitrary file access, file execution, file mutation, runner connectivity, auto-processing, auto-routing, auto-merge, and self-approval.

| Workflow library | Defines the catalog-only private operator workflow library surface for Phase 50. | `docs/phases/PHASE_50_WORKFLOW_LIBRARY_V1.md`, `apps/operator-console/src/workflow-library.ts`, `scripts/lib/workflow-library-v1.mjs`, `scripts/run-workflow-library-v1.mjs`, `tests/integration/workflow-library-v1.test.ts` |

### `docs/phases/PHASE_50_WORKFLOW_LIBRARY_V1.md`

- Evidence role: Phase 50 workflow-library contract and validation instructions.
- Use when answering: what Phase 50 adds, what it blocks, and why it remains catalog-only.

### `apps/operator-console/src/workflow-library.ts`

- Evidence role: typed frontend-consumable workflow catalog packet and workflow-library safety gates.
- Use when answering: what workflow definitions the private operator app can display for owner review.

### `scripts/lib/workflow-library-v1.mjs`

- Evidence role: Phase 50 verification contract and workflow-library safety boundary checks.
- Use when answering: how the workflow-library surface is validated as catalog-only.

### `scripts/run-workflow-library-v1.mjs`

- Evidence role: Phase 50 demo runner.
- Use when answering: how to prove workflow library is ready.

### `tests/integration/workflow-library-v1.test.ts`

- Evidence role: test proof for workflow fields, app bindings, generated reports, and blocked unsafe boundaries.
- Use when answering: how Phase 50 blocks command execution, runner connectivity, auto-processing, auto-routing, auto-merge, and self-approval.

| Workflow composer | Defines the composition-only private operator workflow composer surface for Phase 51. | `docs/phases/PHASE_51_WORKFLOW_COMPOSER_V1.md`, `apps/operator-console/src/workflow-composer.ts`, `scripts/lib/workflow-composer-v1.mjs`, `scripts/run-workflow-composer-v1.mjs`, `tests/integration/workflow-composer-v1.test.ts` |

### `docs/phases/PHASE_51_WORKFLOW_COMPOSER_V1.md`

- Evidence role: Phase 51 workflow-composer contract and validation instructions.
- Use when answering: what Phase 51 adds, what it blocks, and why it remains composition-only.

### `apps/operator-console/src/workflow-composer.ts`

- Evidence role: typed frontend-consumable plan preview packet and workflow-composer safety gates.
- Use when answering: how request, file, and workflow signals become a plan preview for Tyler review.

### `scripts/lib/workflow-composer-v1.mjs`

- Evidence role: Phase 51 verification contract and workflow-composer safety boundary checks.
- Use when answering: how the workflow-composer surface is validated as preview-only.

### `scripts/run-workflow-composer-v1.mjs`

- Evidence role: Phase 51 demo runner.
- Use when answering: how to prove workflow composer is ready.

### `tests/integration/workflow-composer-v1.test.ts`

- Evidence role: test proof for composition fields, app bindings, generated reports, and blocked unsafe boundaries.
- Use when answering: how Phase 51 blocks command execution, runner connectivity, file mutation, auto-processing, auto-routing, auto-merge, and self-approval.

| Local plan review queue | Defines the review-queue-only private operator plan review surface for Phase 52. | `docs/phases/PHASE_52_LOCAL_PLAN_REVIEW_QUEUE_V1.md`, `apps/operator-console/src/plan-review-queue.ts`, `scripts/lib/local-plan-review-queue-v1.mjs`, `scripts/run-local-plan-review-queue-v1.mjs`, `tests/integration/local-plan-review-queue-v1.test.ts` |

### `docs/phases/PHASE_52_LOCAL_PLAN_REVIEW_QUEUE_V1.md`

- Evidence role: Phase 52 local plan review queue contract and validation instructions.
- Use when answering: what Phase 52 adds, what it blocks, and why it remains review-queue-only.

### `apps/operator-console/src/plan-review-queue.ts`

- Evidence role: typed frontend-consumable local plan review queue packet and safety gates.
- Use when answering: how composed plan previews become Tyler-reviewable queue items.

### `scripts/lib/local-plan-review-queue-v1.mjs`

- Evidence role: Phase 52 verification contract and review queue safety boundary checks.
- Use when answering: how the plan review queue surface is validated as review-only.

### `scripts/run-local-plan-review-queue-v1.mjs`

- Evidence role: Phase 52 demo runner.
- Use when answering: how to prove local plan review queue is ready.

### `tests/integration/local-plan-review-queue-v1.test.ts`

- Evidence role: test proof for review items, app bindings, generated reports, and blocked unsafe boundaries.
- Use when answering: how Phase 52 blocks command execution, runner connectivity, file mutation, auto-approval, auto-processing, auto-routing, auto-merge, and self-approval.

| Owner review decision draft | Defines the draft-only Tyler decision surface for Phase 53. | `docs/phases/PHASE_53_OWNER_REVIEW_DECISION_DRAFT_V1.md`, `apps/operator-console/src/owner-review-decision-draft.ts`, `scripts/lib/owner-review-decision-draft-v1.mjs`, `scripts/run-owner-review-decision-draft-v1.mjs`, `tests/integration/owner-review-decision-draft-v1.test.ts` |

### `docs/phases/PHASE_53_OWNER_REVIEW_DECISION_DRAFT_V1.md`

- Evidence role: Phase 53 decision-draft contract and validation instructions.
- Use when answering: what Phase 53 adds, what it blocks, and why it remains draft-only.

### `apps/operator-console/src/owner-review-decision-draft.ts`

- Evidence role: typed frontend-consumable owner decision draft packet and safety gates.
- Use when answering: which decision options Tyler can review in the private operator app.

### `scripts/lib/owner-review-decision-draft-v1.mjs`

- Evidence role: Phase 53 verification contract and owner decision draft safety boundary checks.
- Use when answering: how the owner decision draft surface is validated as draft-only.

### `scripts/run-owner-review-decision-draft-v1.mjs`

- Evidence role: Phase 53 demo runner.
- Use when answering: how to prove owner review decision drafts are ready.

### `tests/integration/owner-review-decision-draft-v1.test.ts`

- Evidence role: test proof for decision fields, app bindings, generated reports, and blocked unsafe boundaries.
- Use when answering: how Phase 53 blocks command execution, runner connectivity, task creation, final approval, auto-approval, auto-route, auto-merge, and self-approval.

| Operator owner decision record surface | Defines the record-preview-only Tyler decision record surface for Phase 54. | `docs/phases/PHASE_54_OPERATOR_OWNER_DECISION_RECORD_SURFACE_V1.md`, `apps/operator-console/src/owner-decision-record-surface.ts`, `scripts/lib/operator-owner-decision-record-surface-v1.mjs`, `scripts/run-operator-owner-decision-record-surface-v1.mjs`, `tests/integration/operator-owner-decision-record-surface-v1.test.ts` |

### `docs/phases/PHASE_54_OPERATOR_OWNER_DECISION_RECORD_SURFACE_V1.md`

- Evidence role: Phase 54 decision-record surface contract and validation instructions.
- Use when answering: what Phase 54 adds, what it blocks, and why it remains record-preview-only.

### `apps/operator-console/src/owner-decision-record-surface.ts`

- Evidence role: typed frontend-consumable owner decision record surface packet and safety gates.
- Use when answering: how Tyler-owned decision record previews appear in the private operator app.

### `scripts/lib/operator-owner-decision-record-surface-v1.mjs`

- Evidence role: Phase 54 verification contract and owner decision record surface safety boundary checks.
- Use when answering: how the record surface is validated as preview-only and non-executable.

### `scripts/run-operator-owner-decision-record-surface-v1.mjs`

- Evidence role: Phase 54 demo runner.
- Use when answering: how to prove owner decision record surfaces are ready.

### `tests/integration/operator-owner-decision-record-surface-v1.test.ts`

- Evidence role: test proof for record fields, app bindings, generated reports, and blocked unsafe boundaries.
- Use when answering: how Phase 54 blocks command execution, runner connectivity, record persistence, task creation, final approval, auto-approval, auto-route, auto-merge, and self-approval.

| Local desktop worker blueprint | Defines the blueprint-only local desktop worker contract for Phase 55. | `docs/phases/PHASE_55_LOCAL_DESKTOP_WORKER_BLUEPRINT_V1.md`, `apps/operator-console/src/local-desktop-worker-blueprint.ts`, `scripts/lib/local-desktop-worker-blueprint-v1.mjs`, `scripts/run-local-desktop-worker-blueprint-v1.mjs`, `tests/integration/local-desktop-worker-blueprint-v1.test.ts` |

### `docs/phases/PHASE_55_LOCAL_DESKTOP_WORKER_BLUEPRINT_V1.md`

- Evidence role: Phase 55 local desktop worker blueprint contract and validation instructions.
- Use when answering: what Phase 55 adds, what it blocks, and why it remains blueprint-only.

### `apps/operator-console/src/local-desktop-worker-blueprint.ts`

- Evidence role: typed frontend-consumable local desktop worker blueprint packet and safety gates.
- Use when answering: how the future local worker contract appears in the private operator app.

### `scripts/lib/local-desktop-worker-blueprint-v1.mjs`

- Evidence role: Phase 55 verification contract and local desktop worker blueprint safety boundary checks.
- Use when answering: how the worker blueprint is validated as non-executable and contract-only.

### `scripts/run-local-desktop-worker-blueprint-v1.mjs`

- Evidence role: Phase 55 demo runner.
- Use when answering: how to prove the local desktop worker blueprint is ready.

### `tests/integration/local-desktop-worker-blueprint-v1.test.ts`

- Evidence role: test proof for worker blueprint fields, app bindings, generated reports, and blocked unsafe boundaries.
- Use when answering: how Phase 55 blocks command execution, runner connectivity, worker spawn, task execution, record persistence, final approval, auto-route, auto-merge, and self-approval.

| Local worker health panel | Defines the declarative health surface for the future local desktop worker in Phase 56. | `docs/phases/PHASE_56_LOCAL_WORKER_HEALTH_PANEL_V1.md`, `apps/operator-console/src/local-worker-health-panel.ts`, `scripts/lib/local-worker-health-panel-v1.mjs`, `scripts/run-local-worker-health-panel-v1.mjs`, `tests/integration/local-worker-health-panel-v1.test.ts` |

### `docs/phases/PHASE_56_LOCAL_WORKER_HEALTH_PANEL_V1.md`

- Evidence role: Phase 56 local worker health panel contract and validation instructions.
- Use when answering: what Phase 56 adds, what it blocks, and why the worker remains offline by design.

### `apps/operator-console/src/local-worker-health-panel.ts`

- Evidence role: typed frontend-consumable local worker health panel packet and safety gates.
- Use when answering: how future worker health appears in the private operator app before any live connection.

### `scripts/lib/local-worker-health-panel-v1.mjs`

- Evidence role: Phase 56 verification contract and local worker health panel boundary checks.
- Use when answering: how the health panel is validated as non-polling, non-executing, and declarative only.

### `scripts/run-local-worker-health-panel-v1.mjs`

- Evidence role: Phase 56 demo runner.
- Use when answering: how to prove the local worker health panel is ready.

### `tests/integration/local-worker-health-panel-v1.test.ts`

- Evidence role: test proof for health panel fields, app bindings, generated reports, and blocked unsafe boundaries.
- Use when answering: how Phase 56 blocks health polling, live heartbeat, process inspection, worker spawn, command execution, runner connectivity, task execution, final approval, auto-route, auto-merge, and self-approval.

| Local worker dry-run harness | Defines the simulation-only dry-run practice lane for the future local desktop worker in Phase 57. | `docs/phases/PHASE_57_LOCAL_WORKER_DRY_RUN_HARNESS_V1.md`, `apps/operator-console/src/local-worker-dry-run-harness.ts`, `scripts/lib/local-worker-dry-run-harness-v1.mjs`, `scripts/run-local-worker-dry-run-harness-v1.mjs`, `tests/integration/local-worker-dry-run-harness-v1.test.ts` |

### `docs/phases/PHASE_57_LOCAL_WORKER_DRY_RUN_HARNESS_V1.md`

- Evidence role: Phase 57 local worker dry-run harness contract and validation instructions.
- Use when answering: what Phase 57 adds, what it blocks, and why worker behavior remains simulation-only.

### `apps/operator-console/src/local-worker-dry-run-harness.ts`

- Evidence role: typed frontend-consumable dry-run harness packet, steps, evidence requirements, and safety gates.
- Use when answering: how future worker behavior appears in the private operator app before any live worker execution.

### `scripts/lib/local-worker-dry-run-harness-v1.mjs`

- Evidence role: Phase 57 verification contract and dry-run boundary checks.
- Use when answering: how the dry-run harness is validated as simulated-only, evidence-only, non-executing, and non-mutating.

### `scripts/run-local-worker-dry-run-harness-v1.mjs`

- Evidence role: Phase 57 demo runner.
- Use when answering: how to prove the local worker dry-run harness is ready.

### `tests/integration/local-worker-dry-run-harness-v1.test.ts`

- Evidence role: test proof for dry-run fields, app bindings, generated reports, and blocked unsafe boundaries.
- Use when answering: how Phase 57 blocks worker spawn, task execution, command execution, shell execution, runner connectivity, polling, process inspection, filesystem mutation, persistence, final approval, auto-route, auto-merge, and self-approval.

| Windows Task Scheduler status check | Defines the declarative scheduling-readiness surface for the future local desktop worker in Phase 58. | `docs/phases/PHASE_58_WINDOWS_TASK_SCHEDULER_STATUS_CHECK_V1.md`, `apps/operator-console/src/windows-task-scheduler-status-check.ts`, `scripts/lib/windows-task-scheduler-status-check-v1.mjs`, `scripts/run-windows-task-scheduler-status-check-v1.mjs`, `tests/integration/windows-task-scheduler-status-check-v1.test.ts` |

### `docs/phases/PHASE_58_WINDOWS_TASK_SCHEDULER_STATUS_CHECK_V1.md`

- Evidence role: Phase 58 Windows Task Scheduler status check contract and validation instructions.
- Use when answering: what Phase 58 adds, what it blocks, and why scheduling remains declarative-only.

### `apps/operator-console/src/windows-task-scheduler-status-check.ts`

- Evidence role: typed frontend-consumable Windows scheduler readiness packet, indicators, evidence requirements, and safety gates.
- Use when answering: how future scheduling readiness appears in the private operator app before any scheduled execution exists.

### `scripts/lib/windows-task-scheduler-status-check-v1.mjs`

- Evidence role: Phase 58 verification contract and scheduling boundary checks.
- Use when answering: how the scheduler readiness surface is validated as declarative-only, non-querying, non-executing, and non-mutating.

### `scripts/run-windows-task-scheduler-status-check-v1.mjs`

- Evidence role: Phase 58 demo runner.
- Use when answering: how to prove the Windows Task Scheduler status check is ready.

### `tests/integration/windows-task-scheduler-status-check-v1.test.ts`

- Evidence role: test proof for scheduler fields, app bindings, generated reports, and blocked unsafe boundaries.
- Use when answering: how Phase 58 blocks scheduled task creation, query, mutation, deletion, enable/disable, scheduled execution, PowerShell, schtasks, command execution, worker spawn, task execution, runner connectivity, filesystem mutation, persistence, final approval, auto-route, auto-merge, and self-approval.

| Morning status packet | Defines the declarative future-morning summary surface for local overnight work reporting in Phase 59. | `docs/phases/PHASE_59_MORNING_STATUS_PACKET_V1.md`, `apps/operator-console/src/morning-status-packet.ts`, `scripts/lib/morning-status-packet-v1.mjs`, `scripts/run-morning-status-packet-v1.mjs`, `tests/integration/morning-status-packet-v1.test.ts` |

### `docs/phases/PHASE_59_MORNING_STATUS_PACKET_V1.md`

- Evidence role: Phase 59 morning status packet contract and validation instructions.
- Use when answering: what Phase 59 adds, what it blocks, and why morning summaries remain non-executing and non-live.

### `apps/operator-console/src/morning-status-packet.ts`

- Evidence role: typed frontend-consumable morning packet, sections, evidence requirements, and safety gates.
- Use when answering: how future overnight work summaries appear in the private operator app before overnight execution exists.

### `scripts/lib/morning-status-packet-v1.mjs`

- Evidence role: Phase 59 verification contract and morning packet boundary checks.
- Use when answering: how the morning packet is validated as declarative-only, non-executing, non-live, non-persisting, and non-mutating.

### `scripts/run-morning-status-packet-v1.mjs`

- Evidence role: Phase 59 demo runner.
- Use when answering: how to prove the morning status packet is ready.

### `tests/integration/morning-status-packet-v1.test.ts`

- Evidence role: test proof for morning packet fields, app bindings, generated reports, and blocked unsafe boundaries.
- Use when answering: how Phase 59 blocks overnight execution, live run reports, scheduler actions, worker actions, command execution, shell execution, task execution, runner connectivity, filesystem mutation, persistence, final approval, auto-route, auto-merge, and self-approval.

| Local worker readiness gate | Defines the final declarative readiness gate before any future local worker unlock can be considered in Phase 60. | `docs/phases/PHASE_60_LOCAL_WORKER_READINESS_GATE_V1.md`, `apps/operator-console/src/local-worker-readiness-gate.ts`, `scripts/lib/local-worker-readiness-gate-v1.mjs`, `scripts/run-local-worker-readiness-gate-v1.mjs`, `tests/integration/local-worker-readiness-gate-v1.test.ts` |

### `docs/phases/PHASE_60_LOCAL_WORKER_READINESS_GATE_V1.md`

- Evidence role: Phase 60 local worker readiness gate contract and validation instructions.
- Use when answering: what Phase 60 adds, what it blocks, and why readiness assessment does not unlock execution.

### `apps/operator-console/src/local-worker-readiness-gate.ts`

- Evidence role: typed frontend-consumable readiness gate, prerequisite checks, evidence requirements, and safety gates.
- Use when answering: how the private operator app represents local worker readiness without granting execution authority.

### `scripts/lib/local-worker-readiness-gate-v1.mjs`

- Evidence role: Phase 60 verification contract and readiness gate boundary checks.
- Use when answering: how the readiness gate is validated as declarative-only, non-installing, non-connecting, non-executing, non-persisting, and non-mutating.

### `scripts/run-local-worker-readiness-gate-v1.mjs`

- Evidence role: Phase 60 demo runner.
- Use when answering: how to prove the local worker readiness gate is ready.

### `tests/integration/local-worker-readiness-gate-v1.test.ts`

- Evidence role: test proof for readiness gate fields, app bindings, generated reports, and blocked unsafe boundaries.
- Use when answering: how Phase 60 blocks execution unlock, overnight execution, live run reports, scheduler actions, worker actions, command execution, shell execution, task execution, runner connectivity, filesystem mutation, persistence, final approval, auto-route, auto-merge, and self-approval.

| Local worker unlock proposal packet | Defines the owner-review proposal packet for any future local worker unlock path in Phase 61. | `docs/phases/PHASE_61_LOCAL_WORKER_UNLOCK_PROPOSAL_PACKET_V1.md`, `apps/operator-console/src/local-worker-unlock-proposal-packet.ts`, `scripts/lib/local-worker-unlock-proposal-packet-v1.mjs`, `scripts/run-local-worker-unlock-proposal-packet-v1.mjs`, `tests/integration/local-worker-unlock-proposal-packet-v1.test.ts` |

### `docs/phases/PHASE_61_LOCAL_WORKER_UNLOCK_PROPOSAL_PACKET_V1.md`

- Evidence role: Phase 61 local worker unlock proposal packet contract and validation instructions.
- Use when answering: what Phase 61 adds, what it blocks, and why an unlock proposal does not equal approval or execution.

### `apps/operator-console/src/local-worker-unlock-proposal-packet.ts`

- Evidence role: typed frontend-consumable unlock proposal packet, requirements, evidence requirements, routing, boundaries, and safety gates.
- Use when answering: how the private operator app represents a future unlock proposal while keeping execution blocked.

### `scripts/lib/local-worker-unlock-proposal-packet-v1.mjs`

- Evidence role: Phase 61 verification contract and unlock proposal boundary checks.
- Use when answering: how the unlock proposal is validated as declarative-only, owner-review-only, non-installing, non-connecting, non-executing, non-persisting, and non-mutating.

### `scripts/run-local-worker-unlock-proposal-packet-v1.mjs`

- Evidence role: Phase 61 demo runner.
- Use when answering: how to prove the local worker unlock proposal packet is ready.

### `tests/integration/local-worker-unlock-proposal-packet-v1.test.ts`

- Evidence role: test proof for unlock proposal fields, app bindings, generated reports, and blocked unsafe boundaries.
- Use when answering: how Phase 61 blocks proposal approval, execution unlock, overnight execution, worker install/connection/spawn, scheduler actions, command execution, shell execution, task execution, runner connectivity, filesystem mutation, persistence, final approval, auto-route, auto-merge, and self-approval.

| Local worker install plan | Defines the owner-review installation plan for any future local worker installation path in Phase 62. | `docs/phases/PHASE_62_LOCAL_WORKER_INSTALL_PLAN_V1.md`, `apps/operator-console/src/local-worker-install-plan.ts`, `scripts/lib/local-worker-install-plan-v1.mjs`, `scripts/run-local-worker-install-plan-v1.mjs`, `tests/integration/local-worker-install-plan-v1.test.ts` |

### `docs/phases/PHASE_62_LOCAL_WORKER_INSTALL_PLAN_V1.md`

- Evidence role: Phase 62 local worker install plan contract and validation instructions.
- Use when answering: what Phase 62 adds, what it blocks, and why an install plan does not equal installation or approval.

### `apps/operator-console/src/local-worker-install-plan.ts`

- Evidence role: typed frontend-consumable install plan packet, requirements, evidence requirements, routing, boundaries, and safety gates.
- Use when answering: how the private operator app represents a future worker installation plan while keeping installation blocked.

### `scripts/lib/local-worker-install-plan-v1.mjs`

- Evidence role: Phase 62 verification contract and installation plan boundary checks.
- Use when answering: how the install plan is validated as declarative-only, owner-review-only, non-installing, non-downloading, non-executing, non-persisting, and non-mutating.

### `scripts/run-local-worker-install-plan-v1.mjs`

- Evidence role: Phase 62 demo runner.
- Use when answering: how to prove the local worker install plan is ready.

### `tests/integration/local-worker-install-plan-v1.test.ts`

- Evidence role: test proof for install plan fields, app bindings, generated reports, and blocked unsafe boundaries.
- Use when answering: how Phase 62 blocks install approval, dependency download, installer execution, worker install/connection/spawn, scheduler actions, command execution, shell execution, task execution, runner connectivity, filesystem mutation, persistence, final approval, auto-route, auto-merge, and self-approval.


| Local worker install approval record | Defines the owner-review approval record structure for any future local worker installation path in Phase 63. | `docs/phases/PHASE_63_LOCAL_WORKER_INSTALL_APPROVAL_RECORD_V1.md`, `apps/operator-console/src/local-worker-install-approval-record.ts`, `scripts/lib/local-worker-install-approval-record-v1.mjs`, `scripts/run-local-worker-install-approval-record-v1.mjs`, `tests/integration/local-worker-install-approval-record-v1.test.ts` |

### `docs/phases/PHASE_63_LOCAL_WORKER_INSTALL_APPROVAL_RECORD_V1.md`

- Evidence role: Phase 63 local worker install approval record contract and validation instructions.
- Use when answering: what Phase 63 adds, what it blocks, and why an approval record structure does not equal approval or installation.

### `apps/operator-console/src/local-worker-install-approval-record.ts`

- Evidence role: typed frontend-consumable approval record packet, requirements, evidence requirements, routing, boundaries, and safety gates.
- Use when answering: how the private operator app represents a future worker installation approval record while keeping approval signing and installation blocked.

### `scripts/lib/local-worker-install-approval-record-v1.mjs`

- Evidence role: Phase 63 verification contract and approval record boundary checks.
- Use when answering: how the approval record is validated as declarative-only, owner-review-only, non-signing, non-approving, non-installing, non-downloading, non-executing, non-persisting, and non-mutating.

### `scripts/run-local-worker-install-approval-record-v1.mjs`

- Evidence role: Phase 63 demo runner.
- Use when answering: how to prove the local worker install approval record is ready.

### `tests/integration/local-worker-install-approval-record-v1.test.ts`

- Evidence role: test proof for approval record fields, app bindings, generated reports, and blocked unsafe boundaries.
- Use when answering: how Phase 63 blocks approval signing, install approval, dependency download, installer execution, worker install/connection/spawn, scheduler actions, command execution, shell execution, task execution, runner connectivity, filesystem mutation, persistence, final approval, auto-route, auto-merge, and self-approval.

| Local worker install scope lock | Defines the owner-review scope lock structure for any future local worker installation path in Phase 64. | `docs/phases/PHASE_64_LOCAL_WORKER_INSTALL_SCOPE_LOCK_V1.md`, `apps/operator-console/src/local-worker-install-scope-lock.ts`, `scripts/lib/local-worker-install-scope-lock-v1.mjs`, `scripts/run-local-worker-install-scope-lock-v1.mjs`, `tests/integration/local-worker-install-scope-lock-v1.test.ts` |

### `docs/phases/PHASE_64_LOCAL_WORKER_INSTALL_SCOPE_LOCK_V1.md`

- Evidence role: Phase 64 local worker install scope lock contract and validation instructions.
- Use when answering: what Phase 64 adds, what it blocks, and why a scope lock structure does not equal approval or installation.

### `apps/operator-console/src/local-worker-install-scope-lock.ts`

- Evidence role: typed frontend-consumable scope lock packet, requirements, evidence requirements, routing, boundaries, and safety gates.
- Use when answering: how the private operator app represents a future worker installation scope lock while keeping approval signing, scope locking, and installation blocked.

### `scripts/lib/local-worker-install-scope-lock-v1.mjs`

- Evidence role: Phase 64 verification contract and scope lock boundary checks.
- Use when answering: how the scope lock is validated as declarative-only, owner-review-only, non-signing, non-locking, non-approving, non-installing, non-downloading, non-executing, non-persisting, and non-mutating.

### `scripts/run-local-worker-install-scope-lock-v1.mjs`

- Evidence role: Phase 64 demo runner.
- Use when answering: how to prove the local worker install scope lock is ready.

### `tests/integration/local-worker-install-scope-lock-v1.test.ts`

- Evidence role: test proof for scope lock fields, app bindings, generated reports, and blocked unsafe boundaries.
- Use when answering: how Phase 64 blocks scope signing, scope lock approval, install approval, dependency download, installer execution, worker install/connection/spawn, scheduler actions, command execution, shell execution, task execution, runner connectivity, filesystem mutation, persistence, final approval, auto-route, auto-merge, and self-approval.

| Local worker workspace boundary | Defines the owner-review workspace boundary structure for any future local worker installation path in Phase 65. | `docs/phases/PHASE_65_LOCAL_WORKER_WORKSPACE_BOUNDARY_V1.md`, `apps/operator-console/src/local-worker-workspace-boundary.ts`, `scripts/lib/local-worker-workspace-boundary-v1.mjs`, `scripts/run-local-worker-workspace-boundary-v1.mjs`, `tests/integration/local-worker-workspace-boundary-v1.test.ts` |

### `docs/phases/PHASE_65_LOCAL_WORKER_WORKSPACE_BOUNDARY_V1.md`

- Evidence role: Phase 65 local worker workspace boundary contract and validation instructions.
- Use when answering: what Phase 65 adds, what it blocks, and why a workspace boundary structure does not equal approval, scanning, mutation, or installation.

### `apps/operator-console/src/local-worker-workspace-boundary.ts`

- Evidence role: typed frontend-consumable workspace boundary packet, requirements, evidence requirements, routing, boundaries, and safety gates.
- Use when answering: how the private operator app represents a future worker workspace boundary while keeping approval signing, workspace locking, scanning, and installation blocked.

### `scripts/lib/local-worker-workspace-boundary-v1.mjs`

- Evidence role: Phase 65 verification contract and workspace boundary checks.
- Use when answering: how the workspace boundary is validated as declarative-only, owner-review-only, non-signing, non-locking, non-approving, non-installing, non-scanning, non-persisting, and non-mutating.

### `scripts/run-local-worker-workspace-boundary-v1.mjs`

- Evidence role: Phase 65 demo runner.
- Use when answering: how to prove the local worker workspace boundary is ready.

### `tests/integration/local-worker-workspace-boundary-v1.test.ts`

- Evidence role: test proof for workspace boundary fields, app bindings, generated reports, and blocked unsafe boundaries.
- Use when answering: how Phase 65 blocks workspace signing, install approval, dependency download, installer execution, worker install/connection/spawn, scheduler actions, command execution, shell execution, task execution, runner connectivity, workspace probing, filesystem scanning, filesystem mutation, persistence, final approval, auto-route, auto-merge, and self-approval.

| Local worker rollback plan | Defines the owner-review rollback plan structure for any future local worker installation path in Phase 66. | `docs/phases/PHASE_66_LOCAL_WORKER_ROLLBACK_PLAN_V1.md`, `apps/operator-console/src/local-worker-rollback-plan.ts`, `scripts/lib/local-worker-rollback-plan-v1.mjs`, `scripts/run-local-worker-rollback-plan-v1.mjs`, `tests/integration/local-worker-rollback-plan-v1.test.ts` |

### `docs/phases/PHASE_66_LOCAL_WORKER_ROLLBACK_PLAN_V1.md`

- Evidence role: Phase 66 local worker rollback plan contract and validation instructions.
- Use when answering: what Phase 66 adds, what it blocks, and why a rollback plan structure does not equal approval, rollback execution, restore, backup creation, mutation, or installation.

### `apps/operator-console/src/local-worker-rollback-plan.ts`

- Evidence role: typed frontend-consumable rollback plan packet, requirements, evidence requirements, routing, boundaries, and safety gates.
- Use when answering: how the private operator app represents a future worker rollback plan while keeping approval signing, rollback execution, restore, backup creation, and installation blocked.

### `scripts/lib/local-worker-rollback-plan-v1.mjs`

- Evidence role: Phase 66 verification contract and rollback plan checks.
- Use when answering: how the rollback plan is validated as declarative-only, owner-review-only, non-signing, non-locking, non-approving, non-installing, non-restoring, non-persisting, and non-mutating.

### `scripts/run-local-worker-rollback-plan-v1.mjs`

- Evidence role: Phase 66 demo runner.
- Use when answering: how to prove the local worker rollback plan is ready.

### `tests/integration/local-worker-rollback-plan-v1.test.ts`

- Evidence role: test proof for rollback plan fields, app bindings, generated reports, and blocked unsafe boundaries.
- Use when answering: how Phase 66 blocks rollback signing, rollback execution, state restore, backup creation, install approval, dependency download, installer execution, worker install/connection/spawn, scheduler actions, command execution, shell execution, task execution, runner connectivity, workspace probing, filesystem scanning, filesystem mutation, persistence, final approval, auto-route, auto-merge, and self-approval.

| Local worker dependency allowlist | Defines the owner-review dependency allowlist structure for any future local worker installation path in Phase 67. | `docs/phases/PHASE_67_LOCAL_WORKER_DEPENDENCY_ALLOWLIST_V1.md`, `apps/operator-console/src/local-worker-dependency-allowlist.ts`, `scripts/lib/local-worker-dependency-allowlist-v1.mjs`, `scripts/run-local-worker-dependency-allowlist-v1.mjs`, `tests/integration/local-worker-dependency-allowlist-v1.test.ts` |

### `docs/phases/PHASE_67_LOCAL_WORKER_DEPENDENCY_ALLOWLIST_V1.md`

- Evidence role: Phase 67 local worker dependency allowlist contract and validation instructions.
- Use when answering: what Phase 67 adds, what it blocks, and why a dependency allowlist structure does not equal approval, dependency download, package install, package manager execution, mutation, or installation.

### `apps/operator-console/src/local-worker-dependency-allowlist.ts`

- Evidence role: typed frontend-consumable dependency allowlist packet, requirements, evidence requirements, routing, boundaries, and safety gates.
- Use when answering: owner-review dependency allowlist status, dependency inventory requirements, package manager boundaries, version pinning requirements, provenance evidence, and blocked install/execution/dependency mutation flags.

### `scripts/lib/local-worker-dependency-allowlist-v1.mjs`

- Evidence role: Phase 67 dependency allowlist validator and local report writer.
- Use when answering: how the phase confirms declared files, app bindings, package scripts, required true flags, required false flags, and safety counts.

### `scripts/run-local-worker-dependency-allowlist-v1.mjs`

- Evidence role: CLI entrypoint for generating the local Phase 67 dependency allowlist report.
- Use when answering: how to run the dependency allowlist proof.

### `tests/integration/local-worker-dependency-allowlist-v1.test.ts`

- Evidence role: integration tests proving the dependency allowlist surface is declarative-only, app-bound, artifact-writing, and blocked from unsafe boundaries.
- Use when answering: why Phase 67 remains dependency-allowlist-only and blocks dependency download, package install, package manager execution, manifest mutation, lockfile mutation, install, scheduler, command, filesystem, persistence, routing, and self-approval behavior.

| Local worker install dry-run | Defines the owner-review install dry-run structure for any future local worker installation path in Phase 68. | `docs/phases/PHASE_68_LOCAL_WORKER_INSTALL_DRY_RUN_V1.md`, `apps/operator-console/src/local-worker-install-dry-run.ts`, `scripts/lib/local-worker-install-dry-run-v1.mjs`, `scripts/run-local-worker-install-dry-run-v1.mjs`, `tests/integration/local-worker-install-dry-run-v1.test.ts` |

### `docs/phases/PHASE_68_LOCAL_WORKER_INSTALL_DRY_RUN_V1.md`

- Evidence role: Phase 68 local worker install dry-run contract and validation instructions.
- Use when answering: what Phase 68 adds, what it blocks, and why an install dry-run structure does not equal actual dry-run execution, dependency download, package install, package manager execution, mutation, or installation.

### `apps/operator-console/src/local-worker-install-dry-run.ts`

- Evidence role: typed frontend-consumable install dry-run packet, requirements, evidence requirements, routing, boundaries, and safety gates.
- Use when answering: owner-review install dry-run status, dry-run script requirements, dry-run input requirements, dry-run output evidence requirements, and blocked install/execution/dependency/network/filesystem flags.

### `scripts/lib/local-worker-install-dry-run-v1.mjs`

- Evidence role: Phase 68 install dry-run validator and local report writer.
- Use when answering: how the phase confirms declared files, app bindings, package scripts, required true flags, required false flags, and safety counts.

### `scripts/run-local-worker-install-dry-run-v1.mjs`

- Evidence role: CLI entrypoint for generating the local Phase 68 install dry-run report.
- Use when answering: how to run the install dry-run proof.

### `tests/integration/local-worker-install-dry-run-v1.test.ts`

- Evidence role: integration tests proving the install dry-run surface is declarative-only, app-bound, artifact-writing, and blocked from unsafe boundaries.
- Use when answering: why Phase 68 remains install-dry-run-only and blocks actual dry-run execution, smoke tests, network access, dependency download, package install, package manager execution, manifest mutation, lockfile mutation, install, scheduler, command, filesystem, persistence, routing, and self-approval behavior.

| Local worker install evidence packet | Defines the owner-review install evidence packet structure for any future local worker installation path in Phase 69. | `docs/phases/PHASE_69_LOCAL_WORKER_INSTALL_EVIDENCE_PACKET_V1.md`, `apps/operator-console/src/local-worker-install-evidence-packet.ts`, `scripts/lib/local-worker-install-evidence-packet-v1.mjs`, `scripts/run-local-worker-install-evidence-packet-v1.mjs`, `tests/integration/local-worker-install-evidence-packet-v1.test.ts` |

### `docs/phases/PHASE_69_LOCAL_WORKER_INSTALL_EVIDENCE_PACKET_V1.md`

- Evidence role: Phase 69 local worker install evidence packet contract and validation instructions.
- Use when answering: what Phase 69 adds, what it blocks, and why an install evidence packet structure does not equal actual evidence-packet execution, dependency download, package install, package manager execution, mutation, or installation.

### `apps/operator-console/src/local-worker-install-evidence-packet.ts`

- Evidence role: typed frontend-consumable install evidence packet packet, requirements, evidence requirements, routing, boundaries, and safety gates.
- Use when answering: owner-review install evidence packet status, evidence-packet script requirements, evidence-packet input requirements, evidence-packet output evidence requirements, and blocked install/execution/dependency/network/filesystem flags.

### `scripts/lib/local-worker-install-evidence-packet-v1.mjs`

- Evidence role: Phase 69 install evidence packet validator and local report writer.
- Use when answering: how the phase confirms declared files, app bindings, package scripts, required true flags, required false flags, and safety counts.

### `scripts/run-local-worker-install-evidence-packet-v1.mjs`

- Evidence role: CLI entrypoint for generating the local Phase 69 install evidence packet report.
- Use when answering: how to run the install evidence packet proof.

### `tests/integration/local-worker-install-evidence-packet-v1.test.ts`

- Evidence role: integration tests proving the install evidence packet surface is declarative-only, app-bound, artifact-writing, and blocked from unsafe boundaries.
- Use when answering: why Phase 69 remains install-evidence-packet-only and blocks actual evidence-packet execution, smoke tests, network access, dependency download, package install, package manager execution, manifest mutation, lockfile mutation, install, scheduler, command, filesystem, persistence, routing, and self-approval behavior.

| Local worker manual install gate | Defines the owner-review manual install gate structure for any future local worker installation path in Phase 70. | `docs/phases/PHASE_70_LOCAL_WORKER_MANUAL_INSTALL_GATE_V1.md`, `apps/operator-console/src/local-worker-manual-install-gate.ts`, `scripts/lib/local-worker-manual-install-gate-v1.mjs`, `scripts/run-local-worker-manual-install-gate-v1.mjs`, `tests/integration/local-worker-manual-install-gate-v1.test.ts` |

### `docs/phases/PHASE_70_LOCAL_WORKER_MANUAL_INSTALL_GATE_V1.md`

- Evidence role: Phase 70 local worker manual install gate contract and validation instructions.
- Use when answering: what Phase 70 adds, what it blocks, and why a manual install gate structure does not equal actual installation, dependency download, package install, package manager execution, mutation, or worker connection.

### `apps/operator-console/src/local-worker-manual-install-gate.ts`

- Evidence role: typed frontend-consumable manual install gate packet, requirements, evidence requirements, routing, boundaries, and safety gates.
- Use when answering: owner-review manual install gate status, command plan requirements, final preinstall checklist requirements, and blocked install/execution/dependency/network/filesystem flags.

### `scripts/lib/local-worker-manual-install-gate-v1.mjs`

- Evidence role: Phase 70 manual install gate validator and local report writer.
- Use when answering: how the phase confirms declared files, app bindings, package scripts, required true flags, required false flags, and safety counts.

### `scripts/run-local-worker-manual-install-gate-v1.mjs`

- Evidence role: CLI entrypoint for generating the local Phase 70 manual install gate report.
- Use when answering: how to run the manual install gate proof.

### `tests/integration/local-worker-manual-install-gate-v1.test.ts`

- Evidence role: integration tests proving the manual install gate surface is declarative-only, app-bound, artifact-writing, and blocked from unsafe boundaries.
- Use when answering: why Phase 70 remains manual-install-gate-only and blocks actual installation, installer execution, dependency download, package install, package manager execution, command execution, filesystem mutation, persistence, routing, and self-approval behavior.

| Local worker post-install health record | Defines the owner-review post-install health record structure for any future local worker installation path in Phase 71. | `docs/phases/PHASE_71_LOCAL_WORKER_POST_INSTALL_HEALTH_RECORD_V1.md`, `apps/operator-console/src/local-worker-post-install-health-record.ts`, `scripts/lib/local-worker-post-install-health-record-v1.mjs`, `scripts/run-local-worker-post-install-health-record-v1.mjs`, `tests/integration/local-worker-post-install-health-record-v1.test.ts` |

### `docs/phases/PHASE_71_LOCAL_WORKER_POST_INSTALL_HEALTH_RECORD_V1.md`

- Evidence role: Phase 71 local worker post-install health record contract and validation instructions.
- Use when answering: what Phase 71 adds, what it blocks, and why a post-install health record structure does not equal actual installation, dependency download, package install, package manager execution, mutation, or worker connection.

### `apps/operator-console/src/local-worker-post-install-health-record.ts`

- Evidence role: typed frontend-consumable post-install health record packet, requirements, evidence requirements, routing, boundaries, and safety gates.
- Use when answering: owner-review post-install health record status, command plan requirements, post-install health checklist requirements, and blocked install/execution/dependency/network/filesystem flags.

### `scripts/lib/local-worker-post-install-health-record-v1.mjs`

- Evidence role: Phase 71 post-install health record validator and local report writer.
- Use when answering: how the phase confirms declared files, app bindings, package scripts, required true flags, required false flags, and safety counts.

### `scripts/run-local-worker-post-install-health-record-v1.mjs`

- Evidence role: CLI entrypoint for generating the local Phase 71 post-install health record report.
- Use when answering: how to run the post-install health record proof.

### `tests/integration/local-worker-post-install-health-record-v1.test.ts`

- Evidence role: integration tests proving the post-install health record surface is declarative-only, app-bound, artifact-writing, and blocked from unsafe boundaries.
- Use when answering: why Phase 71 remains post-install-health-record-only and blocks actual installation, installer execution, dependency download, package install, package manager execution, command execution, filesystem mutation, persistence, routing, and self-approval behavior.

| Local worker health polling approval plan | Defines the owner-review health polling approval plan structure for any future local worker installation path in Phase 72. | `docs/phases/PHASE_72_LOCAL_WORKER_HEALTH_POLLING_APPROVAL_PLAN_V1.md`, `apps/operator-console/src/local-worker-health-polling-approval-plan.ts`, `scripts/lib/local-worker-health-polling-approval-plan-v1.mjs`, `scripts/run-local-worker-health-polling-approval-plan-v1.mjs`, `tests/integration/local-worker-health-polling-approval-plan-v1.test.ts` |

### `docs/phases/PHASE_72_LOCAL_WORKER_HEALTH_POLLING_APPROVAL_PLAN_V1.md`

- Evidence role: Phase 72 local worker health polling approval plan contract and validation instructions.
- Use when answering: what Phase 72 adds, what it blocks, and why a health polling approval plan structure does not equal actual installation, dependency download, package install, package manager execution, mutation, or worker connection.

### `apps/operator-console/src/local-worker-health-polling-approval-plan.ts`

- Evidence role: typed frontend-consumable health polling approval plan packet, requirements, evidence requirements, routing, boundaries, and safety gates.
- Use when answering: owner-review health polling approval plan status, command plan requirements, polling cadence boundary requirements, and blocked install/execution/dependency/network/filesystem flags.

### `scripts/lib/local-worker-health-polling-approval-plan-v1.mjs`

- Evidence role: Phase 72 health polling approval plan validator and local report writer.
- Use when answering: how the phase confirms declared files, app bindings, package scripts, required true flags, required false flags, and safety counts.

### `scripts/run-local-worker-health-polling-approval-plan-v1.mjs`

- Evidence role: CLI entrypoint for generating the local Phase 72 health polling approval plan report.
- Use when answering: how to run the health polling approval plan proof.

### `tests/integration/local-worker-health-polling-approval-plan-v1.test.ts`

- Evidence role: integration tests proving the health polling approval plan surface is declarative-only, app-bound, artifact-writing, and blocked from unsafe boundaries.
- Use when answering: why Phase 72 remains health-polling-approval-plan-only and blocks actual installation, installer execution, dependency download, package install, package manager execution, command execution, filesystem mutation, persistence, routing, and self-approval behavior.

| Local worker scheduler approval plan | Defines the owner-review scheduler approval plan structure for any future local worker scheduler access path in Phase 73. | `docs/phases/PHASE_73_LOCAL_WORKER_SCHEDULER_APPROVAL_PLAN_V1.md`, `apps/operator-console/src/local-worker-scheduler-approval-plan.ts`, `scripts/lib/local-worker-scheduler-approval-plan-v1.mjs`, `scripts/run-local-worker-scheduler-approval-plan-v1.mjs`, `tests/integration/local-worker-scheduler-approval-plan-v1.test.ts` |

### `docs/phases/PHASE_73_LOCAL_WORKER_SCHEDULER_APPROVAL_PLAN_V1.md`

- Evidence role: Phase 73 local worker scheduler approval plan contract and validation instructions.
- Use when answering: what Phase 73 adds, what it blocks, and why a scheduler approval plan structure does not equal scheduler creation, query, mutation, deletion, enable/disable, PowerShell execution, schtasks execution, or worker connection.

### `apps/operator-console/src/local-worker-scheduler-approval-plan.ts`

- Evidence role: typed frontend-consumable scheduler approval plan packet, requirements, evidence requirements, routing, boundaries, and safety gates.
- Use when answering: owner-review scheduler approval plan status, scheduler command boundary requirements, scheduler action inventory requirements, and blocked scheduler/command/worker/filesystem flags.

### `scripts/lib/local-worker-scheduler-approval-plan-v1.mjs`

- Evidence role: Phase 73 scheduler approval plan validator and local report writer.
- Use when answering: how the phase confirms declared files, app bindings, package scripts, required true flags, required false flags, and safety counts.

### `scripts/run-local-worker-scheduler-approval-plan-v1.mjs`

- Evidence role: CLI entrypoint for generating the local Phase 73 scheduler approval plan report.
- Use when answering: how to run the scheduler approval plan proof.

### `tests/integration/local-worker-scheduler-approval-plan-v1.test.ts`

- Evidence role: integration tests proving the scheduler approval plan surface is declarative-only, app-bound, artifact-writing, and blocked from unsafe boundaries.
- Use when answering: why Phase 73 remains scheduler-approval-plan-only and blocks scheduler creation, scheduler query, scheduler mutation, scheduler deletion, scheduler enable/disable, PowerShell execution, schtasks execution, command execution, filesystem mutation, persistence, routing, and self-approval behavior.

| Local worker command execution approval plan | Defines the owner-review command execution approval plan structure for any future local worker command execution path in Phase 74. | `docs/phases/PHASE_74_LOCAL_WORKER_COMMAND_EXECUTION_APPROVAL_PLAN_V1.md`, `apps/operator-console/src/local-worker-command-execution-approval-plan.ts`, `scripts/lib/local-worker-command-execution-approval-plan-v1.mjs`, `scripts/run-local-worker-command-execution-approval-plan-v1.mjs`, `tests/integration/local-worker-command-execution-approval-plan-v1.test.ts` |

### `docs/phases/PHASE_74_LOCAL_WORKER_COMMAND_EXECUTION_APPROVAL_PLAN_V1.md`

- Evidence role: Phase 74 local worker command execution approval plan contract and validation instructions.
- Use when answering: what Phase 74 adds, what it blocks, and why a command execution approval plan structure does not equal scheduler creation, query, mutation, deletion, enable/disable, PowerShell execution, schtasks execution, or worker connection.

### `apps/operator-console/src/local-worker-command-execution-approval-plan.ts`

- Evidence role: typed frontend-consumable command execution approval plan packet, requirements, evidence requirements, routing, boundaries, and safety gates.
- Use when answering: owner-review command execution approval plan status, command execution boundary requirements, command execution action inventory requirements, and blocked scheduler/command/worker/filesystem flags.

### `scripts/lib/local-worker-command-execution-approval-plan-v1.mjs`

- Evidence role: Phase 74 command execution approval plan validator and local report writer.
- Use when answering: how the phase confirms declared files, app bindings, package scripts, required true flags, required false flags, and safety counts.

### `scripts/run-local-worker-command-execution-approval-plan-v1.mjs`

- Evidence role: CLI entrypoint for generating the local Phase 74 command execution approval plan report.
- Use when answering: how to run the command execution approval plan proof.

### `tests/integration/local-worker-command-execution-approval-plan-v1.test.ts`

- Evidence role: integration tests proving the command execution approval plan surface is declarative-only, app-bound, artifact-writing, and blocked from unsafe boundaries.
- Use when answering: why Phase 74 remains command-execution-approval-plan-only and blocks PowerShell execution, schtasks execution, shell execution, command execution, PowerShell execution, schtasks execution, command execution, filesystem mutation, persistence, routing, and self-approval behavior.

| Local worker command allowlist draft | Defines the owner-review command allowlist draft structure for any future local worker command execution path in Phase 75. | `docs/phases/PHASE_75_LOCAL_WORKER_COMMAND_ALLOWLIST_DRAFT_V1.md`, `apps/operator-console/src/local-worker-command-allowlist-draft.ts`, `scripts/lib/local-worker-command-allowlist-draft-v1.mjs`, `scripts/run-local-worker-command-allowlist-draft-v1.mjs`, `tests/integration/local-worker-command-allowlist-draft-v1.test.ts` |

### `docs/phases/PHASE_75_LOCAL_WORKER_COMMAND_ALLOWLIST_DRAFT_V1.md`

- Evidence role: Phase 75 local worker command allowlist draft contract and validation instructions.
- Use when answering: what Phase 75 adds, what it blocks, and why a command allowlist draft does not equal command execution.

### `apps/operator-console/src/local-worker-command-allowlist-draft.ts`

- Evidence role: typed frontend-consumable command allowlist draft packet, requirements, evidence requirements, routing, boundaries, and safety gates.
- Use when answering: owner-review command allowlist draft status, command allowlist inventory requirements, command denylist boundary requirements, and blocked scheduler/command/worker/filesystem flags.

### `scripts/lib/local-worker-command-allowlist-draft-v1.mjs`

- Evidence role: Phase 75 command allowlist draft validator and local report writer.
- Use when answering: how the phase confirms declared files, app bindings, package scripts, required true flags, required false flags, and safety counts.

### `scripts/run-local-worker-command-allowlist-draft-v1.mjs`

- Evidence role: CLI entrypoint for generating the local Phase 75 command allowlist draft report.
- Use when answering: how to run the command allowlist draft proof.

### `tests/integration/local-worker-command-allowlist-draft-v1.test.ts`

- Evidence role: integration tests proving the command allowlist draft surface is declarative-only, app-bound, artifact-writing, and blocked from unsafe boundaries.
- Use when answering: why Phase 75 remains command-allowlist-draft-only and blocks PowerShell execution, schtasks execution, shell execution, command execution, scheduler access, filesystem mutation, persistence, routing, and self-approval behavior.

| Local worker command argument boundary draft | Defines the owner-review command argument boundary draft structure for any future local worker command execution path in Phase 76. | `docs/phases/PHASE_76_LOCAL_WORKER_COMMAND_ARGUMENT_BOUNDARY_DRAFT_V1.md`, `apps/operator-console/src/local-worker-command-argument-boundary-draft.ts`, `scripts/lib/local-worker-command-argument-boundary-draft-v1.mjs`, `scripts/run-local-worker-command-argument-boundary-draft-v1.mjs`, `tests/integration/local-worker-command-argument-boundary-draft-v1.test.ts` |

### `docs/phases/PHASE_76_LOCAL_WORKER_COMMAND_ARGUMENT_BOUNDARY_DRAFT_V1.md`

- Evidence role: Phase 76 local worker command argument boundary draft contract and validation instructions.
- Use when answering: what Phase 76 adds, what it blocks, and why argument boundaries do not equal command execution.

### `apps/operator-console/src/local-worker-command-argument-boundary-draft.ts`

- Evidence role: typed frontend-consumable command argument boundary draft packet, requirements, evidence requirements, routing, boundaries, and safety gates.
- Use when answering: owner-review command argument boundary draft status, argument pattern inventory requirements, blocked argument pattern requirements, and blocked scheduler/command/worker/filesystem flags.

### `scripts/lib/local-worker-command-argument-boundary-draft-v1.mjs`

- Evidence role: Phase 76 command argument boundary draft validator and local report writer.
- Use when answering: how the phase confirms declared files, app bindings, package scripts, required true flags, required false flags, and safety counts.

### `scripts/run-local-worker-command-argument-boundary-draft-v1.mjs`

- Evidence role: CLI entrypoint for generating the local Phase 76 command argument boundary draft report.
- Use when answering: how to run the command argument boundary draft proof.

### `tests/integration/local-worker-command-argument-boundary-draft-v1.test.ts`

- Evidence role: integration tests proving the command argument boundary draft surface is declarative-only, app-bound, artifact-writing, and blocked from unsafe boundaries.
- Use when answering: why Phase 76 remains command-argument-boundary-draft-only and blocks PowerShell execution, schtasks execution, shell execution, command execution, scheduler access, filesystem mutation, persistence, routing, and self-approval behavior.

| Local worker command working directory boundary draft | Defines the owner-review command working directory boundary draft structure for any future local worker command execution path in Phase 77. | `docs/phases/PHASE_77_LOCAL_WORKER_COMMAND_WORKING_DIRECTORY_BOUNDARY_DRAFT_V1.md`, `apps/operator-console/src/local-worker-command-working-directory-boundary-draft.ts`, `scripts/lib/local-worker-command-working-directory-boundary-draft-v1.mjs`, `scripts/run-local-worker-command-working-directory-boundary-draft-v1.mjs`, `tests/integration/local-worker-command-working-directory-boundary-draft-v1.test.ts` |

### `docs/phases/PHASE_77_LOCAL_WORKER_COMMAND_WORKING_DIRECTORY_BOUNDARY_DRAFT_V1.md`

- Evidence role: Phase 77 local worker command working directory boundary draft contract and validation instructions.
- Use when answering: what Phase 77 adds, what it blocks, and why working directory boundaries do not equal command execution.

### `apps/operator-console/src/local-worker-command-working-directory-boundary-draft.ts`

- Evidence role: typed frontend-consumable command working directory boundary draft packet, requirements, evidence requirements, routing, boundaries, and safety gates.
- Use when answering: owner-review command working directory boundary draft status, working directory pattern inventory requirements, blocked working directory pattern requirements, and blocked scheduler/command/worker/filesystem flags.

### `scripts/lib/local-worker-command-working-directory-boundary-draft-v1.mjs`

- Evidence role: Phase 77 command working directory boundary draft validator and local report writer.
- Use when answering: how the phase confirms declared files, app bindings, package scripts, required true flags, required false flags, and safety counts.

### `scripts/run-local-worker-command-working-directory-boundary-draft-v1.mjs`

- Evidence role: CLI entrypoint for generating the local Phase 77 command working directory boundary draft report.
- Use when answering: how to run the command working directory boundary draft proof.

### `tests/integration/local-worker-command-working-directory-boundary-draft-v1.test.ts`

- Evidence role: integration tests proving the command working directory boundary draft surface is declarative-only, app-bound, artifact-writing, and blocked from unsafe boundaries.
- Use when answering: why Phase 77 remains command-working-directory-boundary-draft-only and blocks PowerShell execution, schtasks execution, shell execution, command execution, scheduler access, filesystem mutation, persistence, routing, and self-approval behavior.

| Local worker command environment boundary draft | Defines the owner-review command environment boundary draft structure for any future local worker command execution path in Phase 78. | `docs/phases/PHASE_78_LOCAL_WORKER_COMMAND_ENVIRONMENT_BOUNDARY_DRAFT_V1.md`, `apps/operator-console/src/local-worker-command-environment-boundary-draft.ts`, `scripts/lib/local-worker-command-environment-boundary-draft-v1.mjs`, `scripts/run-local-worker-command-environment-boundary-draft-v1.mjs`, `tests/integration/local-worker-command-environment-boundary-draft-v1.test.ts` |

### `docs/phases/PHASE_78_LOCAL_WORKER_COMMAND_ENVIRONMENT_BOUNDARY_DRAFT_V1.md`

- Evidence role: Phase 78 local worker command environment boundary draft contract and validation instructions.
- Use when answering: what Phase 78 adds, what it blocks, and why environment boundaries do not equal command execution.

### `apps/operator-console/src/local-worker-command-environment-boundary-draft.ts`

- Evidence role: typed frontend-consumable command environment boundary draft packet, requirements, evidence requirements, routing, boundaries, and safety gates.
- Use when answering: owner-review command environment boundary draft status, environment variable inventory requirements, blocked environment variable requirements, and blocked scheduler/command/worker/filesystem flags.

### `scripts/lib/local-worker-command-environment-boundary-draft-v1.mjs`

- Evidence role: Phase 78 command environment boundary draft validator and local report writer.
- Use when answering: how the phase confirms declared files, app bindings, package scripts, required true flags, required false flags, and safety counts.

### `scripts/run-local-worker-command-environment-boundary-draft-v1.mjs`

- Evidence role: CLI entrypoint for generating the local Phase 78 command environment boundary draft report.
- Use when answering: how to run the command environment boundary draft proof.

### `tests/integration/local-worker-command-environment-boundary-draft-v1.test.ts`

- Evidence role: integration tests proving the command environment boundary draft surface is declarative-only, app-bound, artifact-writing, and blocked from unsafe boundaries.
- Use when answering: why Phase 78 remains command-environment-boundary-draft-only and blocks PowerShell execution, schtasks execution, shell execution, command execution, scheduler access, filesystem mutation, persistence, routing, and self-approval behavior.

| Local worker command output boundary draft | Defines the owner-review command output boundary draft structure for any future local worker command execution path in Phase 79. | `docs/phases/PHASE_79_LOCAL_WORKER_COMMAND_OUTPUT_BOUNDARY_DRAFT_V1.md`, `apps/operator-console/src/local-worker-command-output-boundary-draft.ts`, `scripts/lib/local-worker-command-output-boundary-draft-v1.mjs`, `scripts/run-local-worker-command-output-boundary-draft-v1.mjs`, `tests/integration/local-worker-command-output-boundary-draft-v1.test.ts` |

### `docs/phases/PHASE_79_LOCAL_WORKER_COMMAND_OUTPUT_BOUNDARY_DRAFT_V1.md`

- Evidence role: Phase 79 local worker command output boundary draft contract and validation instructions.
- Use when answering: what Phase 79 adds, what it blocks, and why output boundaries do not equal command execution or output capture.

### `apps/operator-console/src/local-worker-command-output-boundary-draft.ts`

- Evidence role: typed frontend-consumable command output boundary draft packet, requirements, evidence requirements, routing, boundaries, and safety gates.
- Use when answering: owner-review command output boundary draft status, output capture inventory requirements, blocked output capture requirements, and blocked scheduler/command/worker/filesystem flags.

### `scripts/lib/local-worker-command-output-boundary-draft-v1.mjs`

- Evidence role: Phase 79 command output boundary draft validator and local report writer.
- Use when answering: how the phase confirms declared files, app bindings, package scripts, required true flags, required false flags, and safety counts.

### `scripts/run-local-worker-command-output-boundary-draft-v1.mjs`

- Evidence role: CLI entrypoint for generating the local Phase 79 command output boundary draft report.
- Use when answering: how to run the command output boundary draft proof.

### `tests/integration/local-worker-command-output-boundary-draft-v1.test.ts`

- Evidence role: integration tests proving the command output boundary draft surface is declarative-only, app-bound, artifact-writing, and blocked from unsafe boundaries.
- Use when answering: why Phase 79 remains command-output-boundary-draft-only and blocks PowerShell execution, schtasks execution, shell execution, command execution, scheduler access, filesystem mutation, persistence, routing, and self-approval behavior.

# Package Boundaries

S.E.R.A. stays safe by keeping authority separated. Packages may coordinate through explicit contracts, but no package should silently take on another package's responsibility.

## `@sera/shared` / `packages/shared`

Shared IDs, paths, redaction helpers, and core types.

Boundary rules:

- no tool execution
- no runtime mutation
- no business logic
- no model-provider calls

## `@sera/safety` / `packages/safety`

Workspace boundaries, command allowlists, internet default-off policy, path safety, approval decisions, and redaction policy.

Boundary rules:

- owns permission decisions
- does not execute tools itself
- does not approve lessons or tasks
- does not mutate source files

## `@sera/workspace` / `packages/workspace`

Run directory and isolated workspace creation.

Boundary rules:

- creates controlled local workspaces
- does not decide what work should be done
- does not execute model or tool logic

## `@sera/artifacts` / `packages/artifacts`

JSON, JSONL, and Markdown evidence writing.

Boundary rules:

- writes evidence records
- does not interpret safety decisions
- does not mutate source files except artifact destinations

## `@sera/tools` / `packages/tools`

Controlled adapters such as `FileTool` and `ShellTool`.

Boundary rules:

- tools are the only package layer that acts on the local environment
- every tool action should be safety-gated and auditable
- shell commands must stay allowlisted
- tool adapters must not create hidden autonomy

## `@sera/workers` / `packages/workers`

Bounded worker modules. Through Phase 12, this owns Developer Worker inspect, edit, and patch primitives.

Boundary rules:

- may inspect files inside the project root
- may propose patches without mutation
- may apply bounded patches only through allowed modes
- must capture backups and rollback on failed validation
- must not choose arbitrary goals autonomously

## `@sera/kernel` / `packages/kernel`

Task execution lifecycle and subsystem coordination.

Boundary rules:

- coordinates certified subsystem actions
- stays small and stable
- does not bypass safety gates
- does not allow direct model-to-tool authority

## `@sera/runtime-host` / `packages/runtime-host`

Local Runtime Service lifecycle, identity, health, cancellation, shutdown, and lifecycle evidence.

Boundary rules:

- owns process and service lifecycle only
- does not own attempt terminal decisions
- does not execute arbitrary workloads
- reports degraded or blocked health honestly

## `@sera/runtime-state` / `packages/runtime-state`

SQLite Operational State for commands, attempts, transitions, gates, evidence references, leases, migrations, backups, exports, checkpoints, recovery records, and attempt lineage.

Boundary rules:

- owns durable local operational records
- enforces transactional persistence invariants
- does not replace Unified Control Plane transition authority
- does not silently rebuild or replace corrupt operational truth

## `@sera/runtime-recovery` / `packages/runtime-recovery`

Persistent Runtime Recovery for interrupted attempts, checkpoint classification, safe same-attempt resume, linked retry, review-required blocking, and recovery evidence.

Boundary rules:

- scans and classifies durable nonterminal attempts
- resumes only certified restart-safe checkpoints with Control Plane authorization references
- blocks unknown side effects for review
- does not implement isolated execution or arbitrary workload execution
- does not claim exactly-once execution for arbitrary side effects

## `@sera/execution-engine` / `packages/execution-engine`

Governed local execution chamber for explicitly authorized workloads. It validates Control Plane-scoped authorization, creates temporary workspaces outside the repository by default, materializes approved inputs, launches approved executable adapters with `shell: false`, captures bounded stdout/stderr, enforces timeout and cancellation, harvests declared outputs, cleans up, records SQLite execution rows, and writes `.sera/executions/` evidence. It does not expose arbitrary shell commands, arbitrary executable paths, containers, virtual machines, network listeners, distributed execution, or Evaluation Engine authority.

## `@sera/evaluation-engine` / `packages/evaluation-engine`

Deterministic evaluation layer for immutable execution evidence. It validates approved evaluation specifications, loads only declared execution evidence, verifies boundaries and hashes, runs registered v1 evaluators, records assertion outcomes, aggregates required and optional results, writes `.sera/evaluations/` evidence, and reports named gate evidence to the Unified Control Plane. It does not run arbitrary JavaScript, shell commands, dynamic validators, internet checks, model grading, process reruns, or terminal attempt transitions.

Boundary rules:

- evaluates evidence only
- does not rerun workloads
- does not invoke models
- does not transition Control Plane attempts
- does not replace certification authority

## `@sera/model-runtime` / `packages/model-runtime`

Provider-independent Local Model Runtime boundary. It validates provider descriptors, model catalog entries, invocation authorization, request hashes, policy limits, idempotency, timeout/cancellation, redaction, and candidate-intelligence-only response handling. It records model providers, catalog entries, authorizations, invocations, events, and artifacts in SQLite Operational State migration v5 and writes `.sera/model-runtime/` evidence.

Boundary rules:

- deterministic fixture provider is the certified default
- disabled real-local providers degrade honestly
- public endpoints, cloud providers, downloads, installs, and credentials are not allowed in v1
- model output cannot execute tools, mutate source, approve gates, or become operational truth
- `packages/model-provider` remains provider-adapter compatibility evidence, not Runtime authority

## `@sera/knowledge-runtime` / `packages/knowledge-runtime`

Runtime-owned Knowledge and Universal Intake boundary. It validates explicit intake authorizations, preserves source bytes in content-addressed storage, records intake and knowledge state in SQLite Operational State migration v6, writes `.sera/intake/` and `.sera/knowledge/` evidence, extracts deterministic text from bounded text formats, preserves opaque media and archives without extraction, and exposes deterministic lexical retrieval over candidate knowledge.

Boundary rules:

- default operation is local and offline with no public fetch
- imported content remains candidate knowledge, never canonical truth
- URL references are recorded but not fetched in v1
- archives, media, and unknown binary files are preserved as opaque assets
- retrieval includes provenance and trust/candidate status
- intake cannot execute imported content, render active HTML, invoke models, mutate source, approve gates, or replace Control Plane authority

## `@sera/capability-engine` / `packages/capability-engine`

Capability-layer engine for recursive learning and governed capability version lifecycles. It creates authorized learning sessions, accepts evidence-backed learning signals, assembles immutable candidate bundles, invokes Isolated Execution and Evaluation Engine, compares candidates to baselines, certifies exact digests, promotes only through explicit Control Plane authority, records active versions atomically, and preserves regression and rollback evidence in SQLite Operational State migration v7.

Boundary rules:

- learning improves existing capability contracts; innovation remains a blocked or future-governed candidate path
- model and knowledge outputs are candidate input only
- candidate bundles are content-addressed and immutable
- certification is distinct from promotion
- promotion activates only the exact certified digest
- rollback requires explicit authorization and regression evidence
- no arbitrary code loading, unrestricted shell, source mutation, cloud provider, public network, Git action, Desktop Operator, Studio, distributed capability, or Hive Mode authority is introduced

## `@sera/studio-runtime` / `packages/studio-runtime`

Runtime service for Studio registration, exact Studio version integrity, session lifecycle coordination, stage transitions, artifact lineage, claim/source ledgers, operator review state, immutable final package evidence, and candidate-only learning signal routing.

Boundary rules:

- owns Studio composition and evidence coordination
- does not replace Unified Control Plane authorization or final attempt authority
- does not own model provider, knowledge, evaluation, or capability certification authority
- does not certify reusable lessons, activate prevention rules, or promote innovations
- writes bounded Studio evidence only

## `@sera/integrated-loop-runtime` / `packages/integrated-loop-runtime`

Runtime-owned integrated offline loop for Milestone 13. It binds certified Runtime, Capability, Studio, Desktop, and evidence services into a staged offline loop with required learning preflight before capability or Studio selection.

Boundary rules:

- owns integrated loop session, preflight, service-binding, stage, artifact, and package evidence records
- depends on Runtime State migration v10 and existing certified Runtime services
- does not certify lessons, activate prevention rules, promote innovation, invoke real models, fetch public URLs, install packages, or perform Git actions
- does not replace Studio Runtime, Capability Engine, Evaluation Engine, Knowledge Runtime, Model Runtime, Operator Gateway, or Unified Control Plane authority
- writes bounded generated evidence under `.sera/integrated-loop/`

## `@sera/evidence-studio` / `packages/evidence-studio`

User-facing Studio definition for the certified `source-grounded-professional-brief-v1` workflow.

Boundary rules:

- owns the Evidence Studio contract, profile, limitations, source policy, output structure, and review requirements
- depends on Studio Runtime for session execution
- does not directly mutate SQLite, execute tools, invoke real models, or finalize Control Plane attempts

## `@sera/operator-gateway` / `packages/operator-gateway`

Runtime-layer gateway for the local Desktop Operator. It owns loopback-only HTTP serving, local-owner session validation, CSRF-gated state-changing operations, approval review, request composition, notifications, event polling, safe evidence viewing, and operator audit records in Runtime State migration v8.

Boundary rules:

- binds only to loopback
- stores session token hashes, not raw durable tokens
- does not invoke models, execute shell commands, fetch public URLs, auto-approve, auto-promote, auto-rollback, or bypass Control Plane authority
- active HTML evidence is treated as blocked content, not rendered UI

## `@sera/desktop-operator` / `apps/desktop-operator`

Desktop-layer local graphical surface for operator supervision. It exports static local assets and a visual contract consumed by the Operator Gateway.

Boundary rules:

- assets must be local and integrity checked
- no remote scripts, fonts, analytics, telemetry, or CDN references
- no direct SQLite mutation and no privileged runtime authority from browser code

## `@sera/certs` / `packages/certs`

Certification runner and capability checks.

Boundary rules:

- proves certified behavior with deterministic checks
- should not depend on external model/network access
- should fail honestly when a certified behavior regresses

## `@sera/self-improvement` / `packages/self-improvement`

Bounded self-improvement coordination: inspection, proposal records, validation-gated application, rollback evidence, and refusal of uncertified self-modification.

Boundary rules:

- depends on Developer Worker behavior
- does not choose arbitrary files or goals autonomously
- must require validation for apply mode

## `@sera/memory` / `packages/memory`

Local run memory, failure journal entries, lesson candidate records, review decisions, approved/rejected lessons, activation records, active lesson records, regression rule records, and memory summaries.

Boundary rules:

- stores evidence under `.sera-memory/`
- does not execute tools
- does not mutate source files
- does not activate lessons without explicit review/activation calls
- active lessons are guardrails, not hidden runtime behavior

## `@sera/planner` / `packages/planner`

Local task queue, task lifecycle records, task event records, and task queue summaries.

Boundary rules:

- creates operating rhythm
- does not execute queued tasks automatically
- may record completed/blocked outcomes into memory
- does not mutate source code

## `@sera/knowledge` / `packages/knowledge`

Local file ingestion, document records, chunk records, deterministic lexical search, search history, and knowledge summaries under `.sera-knowledge/`.

Boundary rules:

- retrieval is read-only
- does not execute tasks
- does not mutate source files
- does not activate lessons
- does not call LLM providers

## `@sera/research` / `packages/research`

Local research answer, comparison, and summary packets built from indexed `.sera-knowledge/` evidence.

Boundary rules:

- reads local knowledge records
- writes research evidence under `.sera-research/`
- does not call LLM providers
- does not browse the web
- does not mutate source files
- must report insufficient evidence instead of guessing

## `@sera/model-provider` / `packages/model-provider`

Optional model-provider adapter records, mock provider invocation, redacted request/response evidence, provider events, and provider summaries under `.sera-models/`.

Boundary rules:

- deterministic mock provider remains compatibility evidence only
- unknown and external providers are blocked by default
- model output cannot bypass tools, validation, review, or safety gates
- does not mutate runtime state outside `.sera-models/`

## `@sera/autonomy` / `packages/autonomy`

Bounded Autonomous Dev Loop orchestration.

Boundary rules:

- may coordinate task queue records, local knowledge search, deterministic mock model output, and Developer Worker patching
- proposal mode must not mutate source
- apply mode requires a queued task and validation gate
- failed validation must roll back source changes
- external providers remain blocked by default

## `@sera/operator-console` / `packages/operator-console`

Local operator snapshots, health checks, reports, history, and console summaries under `.sera-console/`.

Boundary rules:

- reads certified subsystem summaries
- writes operator evidence artifacts
- must not apply patches
- must not approve, reject, activate, or deactivate lessons
- must not enable model providers
- must not bypass validation gates

## `apps/cli`

Local command-line interface.

Boundary rules:

- exposes approved package capabilities
- should not contain hidden business logic
- should not become a second kernel
- should show honest blocked/no-op/failure states

## Future boundary candidates

- `@sera/ci` — local/CI certification helpers and generated-artifact guards
- `@sera/source-map` — repo source maps for knowledge grounding
- `@sera/evaluator` — eval suites for learning and skill improvement
- `@sera/tool-registry` — tool manifests, permissions, and plugin gates
- `apps/operator-tui` — richer local terminal interface
- `apps/local-api` — local API only after CLI and safety boundaries remain stable

## Phase 23 SQLite Persistence Scripts

`scripts/lib/sqlite-persistence-v1.mjs` and `scripts/run-sqlite-persistence-v1.mjs` provide a local SQLite persistence layer over S.E.R.A. runtime evidence.

Boundary rules:

- writes only `.sera-sqlite/` runtime artifacts
- keeps database paths inside the project root
- preserves existing JSONL runtime evidence
- does not approve, reject, activate, or deactivate lessons
- does not execute autonomous apply operations
- does not call paid APIs, hosted model providers, SaaS, or cloud-only services

## Phase 24 Tool / Plugin Registry Scripts

`scripts/lib/tool-plugin-registry-v1.mjs` and `scripts/run-tool-plugin-registry-v1.mjs` provide a local registry over S.E.R.A. tools, plugins, scripts, workers, and adapters.

Boundary rules:

- writes only `.sera-tools/` runtime artifacts
- keeps registry paths inside the project root
- records metadata, permissions, risk, and approval requirements
- does not execute tools or plugins
- does not approve, reject, activate, or deactivate lessons
- does not run autonomous apply operations
- does not call paid APIs, hosted model providers, SaaS, or cloud-only services

## Phase 25 capability registry boundary

The Phase 25 capability registry lives in `scripts/lib/capability-registry-skill-graph-v1.mjs` and writes runtime evidence under `.sera-capabilities/`.

Boundary rules:

- records capability metadata only
- records skill graph edges only
- writes local reports only
- does not execute tools
- does not approve tools or plugins
- does not mutate source files
- does not run autonomous apply
- does not call paid APIs, hosted model providers, SaaS, or cloud services

## Phase 25B CI workflow boundary

The Phase 25B CI gate lives in `.github/workflows/verify.yml` and is inspected by `scripts/lib/ci-workflow-gate-v1.mjs`.

Boundary rules:

- validates branches only
- uploads evidence artifacts only
- uses read-only repository contents permission
- does not commit, push, merge, deploy, or mutate source
- does not require repository secrets
- does not call paid APIs or hosted model providers
- remains optional to the local/free-core runtime

## Phase 25C phase artifact packet boundary

The Phase 25C packet standard is implemented by `scripts/lib/phase-artifact-packet-v1.mjs` and reports to `.sera-phase-packets/`.

Boundary rules:

- creates and validates packet manifests only
- writes local evidence artifacts only
- does not execute arbitrary tools
- does not commit, push, merge, delete branches, or mutate source during inspection
- does not require repository secrets
- does not call paid APIs or hosted model providers
- requires owner approval before apply and merge

## Phase 26 evaluation harness boundary

The Phase 26 evaluation harness is implemented by `scripts/lib/evaluation-harness-v1.mjs` and reports to `.sera-evals/`.

Boundary rules:

- creates and runs deterministic local evaluation cases only
- writes local evidence artifacts only
- does not execute arbitrary code or tools
- does not mutate source
- does not commit, push, merge, or delete branches
- does not require repository secrets
- does not call paid APIs or hosted model providers
- does not require cloud services
- requires owner approval before changing regression expectations

## Phase 27 regression baseline registry boundary

The Phase 27 regression baseline registry is implemented by `scripts/lib/regression-baseline-registry-v1.mjs` and reports to `.sera-regression-baselines/`.

Boundary rules:

- creates and checks deterministic local regression baselines only
- writes local evidence artifacts only
- does not execute arbitrary code or tools
- does not mutate source
- does not commit, push, merge, or delete branches
- does not require repository secrets
- does not call paid APIs or hosted model providers
- does not require cloud services
- requires owner approval before baseline changes

## Phase 28 curriculum builder boundary

The Phase 28 curriculum builder is implemented by `scripts/lib/curriculum-builder-v1.mjs` and reports to `.sera-curriculum/`.

Boundary rules:

- creates local curriculum plans only
- ranks capability gaps and maps learning modules to evaluation hooks
- writes local evidence artifacts only
- does not execute arbitrary code or tools
- does not mutate source
- does not commit, push, merge, or delete branches
- does not require repository secrets
- does not call paid APIs or hosted model providers
- does not require cloud services
- requires owner approval before curriculum or learning activation changes

## Phase 29 domain learning packs boundary

The Phase 29 domain learning pack registry is implemented by `scripts/lib/domain-learning-packs-v1.mjs` and reports to `.sera-domain-packs/`.

Boundary rules:

- creates local domain pack registries only
- maps curriculum modules to domain-specific learning packs
- links packs to regression baselines and evaluation hooks
- writes local evidence artifacts only
- does not execute arbitrary code or tools
- does not mutate source
- does not commit, push, merge, or delete branches
- does not require repository secrets
- does not call paid APIs or hosted model providers
- does not require cloud services
- requires owner approval before pack changes or activation

## Phase 30 knowledge refresh and source trust boundary

The Phase 30 source trust registry is implemented by `scripts/lib/knowledge-refresh-source-trust-v1.mjs` and reports to `.sera-source-trust/`.

Boundary rules:

- creates local source trust registries only
- separates source-of-truth, implementation evidence, test evidence, runtime evidence, planning notes, and review-required external references
- writes local evidence artifacts only
- does not fetch from the network
- does not execute arbitrary code or tools
- does not mutate source
- does not commit, push, merge, tag, or delete branches
- does not require repository secrets
- does not call paid APIs or hosted model providers
- does not require cloud services
- requires owner approval before source trust changes or external source trust upgrades
- blocks stale source use without review

## Phase 31 planner and task decomposition boundary

The Phase 31 planner v2 is implemented by `scripts/lib/planner-task-decomposer-v2.mjs` and reports to `.sera-planner-v2/`.

Boundary rules:

- creates local phase plans only
- decomposes objectives into ordered tasks, dependencies, gates, evidence, and approval checkpoints
- writes local evidence artifacts only
- does not execute tasks
- does not execute arbitrary code or tools
- does not mutate source
- does not commit, push, merge, tag, or delete branches
- does not approve its own plan
- does not activate learning packs
- does not refresh network sources
- does not require repository secrets
- does not call paid APIs or hosted model providers
- does not require cloud services
- requires owner approval before execution or closeout

## Phase 32 phase packet generator boundary

The Phase 32 packet generator is implemented by `scripts/lib/phase-packet-generator-v1.mjs` and reports to `.sera-phase-packet-generator/`.

Boundary rules:

- creates local phase packet blueprints only
- declares files, validation commands, evidence requirements, rollback notes, and owner approval gates
- writes local evidence artifacts only
- does not execute generated packets
- does not execute arbitrary code or tools
- does not create branches
- does not apply patches
- does not mutate source
- does not commit, push, merge, tag, or delete branches
- does not approve its own packet
- does not activate packets
- does not refresh network sources
- does not require repository secrets
- does not call paid APIs or hosted model providers
- does not require cloud services
- requires owner approval before packet activation or merge

## Phase 33 branch proposal builder boundary

The Phase 33 branch proposal builder is implemented by `scripts/lib/branch-proposal-builder-v1.mjs` and reports to `.sera-branch-proposals/`.

Boundary rules:

- creates local branch proposals only
- declares branch name, files, validation commands, evidence requirements, risk checks, and owner approval gates
- writes local evidence artifacts only
- does not create branches
- does not switch branches
- does not push branches
- does not open pull requests
- does not execute proposals
- does not execute arbitrary code or tools
- does not apply patches
- does not mutate source
- does not commit, merge, tag, or delete branches
- does not approve its own proposal
- does not activate proposals
- does not refresh network sources
- does not require repository secrets
- does not call paid APIs or hosted model providers
- does not require cloud services
- requires owner approval before branch creation, execution, or merge

## PHASE 34 — BRANCH READINESS INSPECTOR V1

The branch readiness inspector is a local proposal-inspection runtime. It is allowed to read declared branch proposal metadata and write local readiness reports under .sera-branch-readiness/. It is not allowed to mutate source, create branches, switch branches, push branches, open pull requests, apply patches, execute proposals, use secrets, require paid providers, or self-approve.

## PHASE 35 — REMOTE PHASE RUNNER BLUEPRINT V1

The remote phase runner blueprint is a local planning/runtime artifact. It may write blueprint reports under .sera-remote-phase-runner-blueprints/. It is not allowed to execute remote commands, use cloud runners, use secrets, mutate source, create branches, switch branches, push branches, open pull requests, apply patches, merge, tag, delete branches, or self-approve. Remote execution remains explicitly disabled in Phase 35.

## PHASE 36 — OWNER APPROVAL QUEUE V1

The owner approval queue is a local queue/runtime artifact. It may write queue reports under .sera-owner-approval-queue/. It is not allowed to record real owner decisions, execute remote commands, use cloud runners, use secrets, mutate source, create branches, switch branches, push branches, open pull requests, apply patches, merge, tag, delete branches, or self-approve. Approval queue execution remains explicitly disabled in Phase 36.

## PHASE 37 — SELF-HOSTED RUNNER ADAPTER V1

The self-hosted runner adapter is a local disabled adapter contract/runtime artifact. It may write adapter reports under .sera-self-hosted-runner-adapter/. It is not allowed to connect to runners, execute commands, use cloud runners, use self-hosted runners, use secrets, mutate source, create branches, switch branches, push branches, open pull requests, apply patches, merge, tag, delete branches, record owner decisions, or self-approve. Runner activation remains explicitly disabled in Phase 37.

## PHASE 38 — COMMAND ALLOWLIST GATE V1

The command allowlist gate is a local exact-match allowlist contract/runtime artifact. It may write allowlist reports under .sera-command-allowlist-gate/. It is not allowed to execute commands, allow arbitrary shell commands, allow shell chaining, allow shell expansion, connect to runners, use cloud runners, use self-hosted runners, use secrets, mutate source, create branches, switch branches, push branches, open pull requests, apply patches, merge, tag, delete branches, record owner decisions, or self-approve.

## PHASE 39 — EVIDENCE CAPTURE BUNDLE V1

The evidence capture bundle is a local proof-bundle contract/runtime artifact. It may write evidence reports under .sera-evidence-capture-bundle/. It is not allowed to execute commands, connect to runners, use cloud runners, use self-hosted runners, use secrets, mutate source, create branches, switch branches, push branches, open pull requests, apply patches, merge, tag, delete branches, record owner decisions, accept evidence as owner approved, or self-approve.

## PHASE 40 — OVERNIGHT BRANCH WORKER V1

The overnight branch worker is a local worker contract/runtime artifact. It may write reports under .sera-overnight-branch-worker/. It is not allowed to activate overnight execution, execute commands, connect to runners, use cloud runners, use self-hosted runners, use secrets, mutate source, create branches, switch branches, push branches, open pull requests, apply patches, merge, tag, delete branches, record owner decisions, accept evidence as owner approved, or self-approve.

## PHASE 41 — OWNER DECISION RECORDER V1

The owner decision recorder is a local recorder-only runtime artifact. It may write reports under .sera-owner-decision-recorder/. It may record structured owner decisions, but those records cannot authorize execution, command execution, remote execution, runner connectivity, source mutation, branch actions, pull requests, patches, merges, tags, deletion, secrets, evidence self-acceptance, or self-approval.

## Phase 42 package boundary

The approval-gated action plan is local-only and planning-only. It may write reports under `.sera-approval-gated-action-plan/` but must not execute commands, connect to runners, mutate source, create branches, apply patches, merge, tag, delete, use secrets, or self-approve.

## Phase 43 package boundary

The session lock guard is local-only and planning-only. It may write reports under `.sera-session-lock-guard/` but must not acquire live execution locks, release live execution locks, execute commands, connect to runners, mutate source, create branches, apply patches, merge, tag, delete, use secrets, record owner decisions, or self-approve.

## Phase 44 package boundary

The emergency stop guard is local-only and planning-only. It may write reports under `.sera-emergency-stop-guard/` but must not activate live stops, release live stops, execute commands, connect to runners, mutate source, create branches, apply patches, merge, tag, delete, use secrets, record owner decisions, or self-approve.

## Phase 45 package boundary

The free-core covenant checkpoint is local-only and planning-only. It may write reports under `.sera-free-core-covenant-checkpoint/` but must not require paid providers, cloud services, secrets, runner connectivity, command execution, remote execution, source mutation, branch operations, patches, merges, tags, deletion, owner-decision recording, commercial activation, or self-approval.

## Phase 46 App Boundary — `apps/operator-console/`

`apps/operator-console/` owns the private operator web app shell. In Phase 46 it is frontend-only and may contain sample data, local UI state, navigation, cards, forms, and preview panels.

It must not own backend execution, command running, runner connectivity, authentication, branch mutation, source mutation, auto-merge, secrets, or cloud-only behavior. Those capabilities require later certified phases and explicit safety gates.

## Milestone 14 Learning Governance Boundary

`@sera/learning-governance-runtime` is a Runtime-layer package below Operator Gateway and Desktop Operator. It does not depend on `@sera/operator-gateway`.

Allowed direction:

- `@sera/operator-gateway -> @sera/learning-governance-runtime`
- `@sera/integrated-loop-runtime -> @sera/learning-governance-runtime`

Forbidden direction:

- `@sera/learning-governance-runtime -> @sera/operator-gateway`
- `@sera/learning-governance-runtime -> @sera/integrated-loop-runtime`

Operator Gateway may expose authenticated read routes and governed review-request routes. Integrated Loop Runtime may consume the read-only durable preflight API. Neither package may bypass Control Plane authorization.

## Milestone 15 Restart Persistence Proof Boundary

`@sera/restart-persistence-proof` is certification/proof infrastructure, not an authority-owning Runtime service.

Boundary rules:

- may orchestrate existing certified Runtime components inside isolated proof roots
- may create proof evidence only through `sera restart-persistence prove`
- may inspect existing proof evidence without mutation
- must not certify or activate lessons by itself
- must not own Runtime Host lifecycle outside the proof harness
- must not own Learning Governance policy or recurrence-prevention decisions
- must not become a Control Plane, provider, Studio, model runtime, installer, updater, or portable release package
- must remain offline, model-free, Git-independent, and bounded to Milestone 15 proof evidence

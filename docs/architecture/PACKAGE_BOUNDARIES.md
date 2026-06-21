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

- deterministic mock provider is the only certified provider through Phase 12
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

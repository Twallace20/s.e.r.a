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

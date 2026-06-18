# Package Boundaries

## `packages/shared`

Shared types and utility functions. No business logic.

## `packages/safety`

Permission checks, redaction, internet policy, command allowlist, approval decisions.

## `packages/workspace`

Run directory and isolated workspace creation.

## `packages/artifacts`

JSON, JSONL, Markdown artifact writing.

## `packages/tools`

Controlled adapters such as FileTool and ShellTool. Tools are audited and safety-gated.

## `packages/workers`

Bounded worker modules. Through Phase 3, this owns Developer Worker inspect, edit, and patch primitives.

## `packages/kernel`

Task execution lifecycle. Depends on safety, workspace, artifacts, tools, and workers.

## `packages/certs`

Certification runner and capability checks.

## Future packages

- `packages/evaluator`
- `packages/knowledge`
- `apps/local-api`
- `apps/console`


## `@sera/self-improvement`

Owns bounded self-improvement coordination: inspection, proposal records, validation-gated application, rollback evidence, and refusal of uncertified self-modification. It depends on Developer Worker behavior but does not choose arbitrary files or goals autonomously.

## @sera/memory

Owns local run memory, failure journal entries, lesson candidate records, and memory summaries. It must not execute tools, mutate source files, or activate lessons. It stores reviewable runtime data under `.sera-memory/`.


Lesson Review + Approval v1 extends `@sera/memory`; it does not add an execution package. This keeps learning governance close to the memory evidence trail and prevents reviewed lessons from becoming runtime behavior automatically.


Active Lessons + Regression Rules v1 extends `@sera/memory` with activation records, active lesson records, regression rule records, and activation decisions. It intentionally does not add a behavior-changing runtime engine; active lessons are certified guardrails, not autonomous policy changes.

## `@sera/planner`

Owns the local task queue, task lifecycle records, task event records, and task queue summaries. It can record completed or blocked task outcomes into memory, but it does not execute tasks autonomously and does not mutate source code.


## `@sera/knowledge`

Owns local file ingestion, document records, chunk records, deterministic lexical search, search history, and knowledge summaries under `.sera-knowledge/`. It must not execute tasks, mutate source files, activate lessons, or call LLM providers.

## @sera/model-provider

Owns optional model-provider adapter records, mock provider invocation, redacted request/response evidence, and provider summaries. It must not execute tools or mutate runtime state outside `.sera-models`.

## @sera/autonomy

Owns the bounded Autonomous Dev Loop. It may coordinate task queue records, local knowledge search, deterministic mock model output, and Developer Worker patching. It must not bypass validation gates, must not use external providers, and must not apply source mutations unless a queued task and validation gate are present.

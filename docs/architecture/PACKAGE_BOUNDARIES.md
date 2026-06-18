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

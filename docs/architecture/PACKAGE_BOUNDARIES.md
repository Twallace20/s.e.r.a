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
- `packages/memory`
- `packages/knowledge`
- `apps/local-api`
- `apps/console`

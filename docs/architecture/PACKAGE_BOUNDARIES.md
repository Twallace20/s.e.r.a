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

Controlled adapters such as FileTool and ShellTool.

## `packages/kernel`

Task execution lifecycle. Depends on safety, workspace, artifacts, and tools.

## `packages/certs`

Certification runner and capability checks.

## Future packages

- `packages/evaluator`
- `packages/memory`
- `packages/knowledge`
- `packages/workers`
- `apps/local-api`
- `apps/console`

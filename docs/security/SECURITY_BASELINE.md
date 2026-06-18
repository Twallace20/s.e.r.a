# Security Baseline

The first secure base protects against the highest-risk legacy failure modes.

## Defaults

- Local-first.
- No model provider required.
- No internet by default.
- Workspace-only writes.
- Allowlisted commands only.
- Shell commands must run inside an approved working directory.
- Destructive commands require approval.
- Secrets are redacted before logs/artifacts.
- Every tool call is audited.
- Every blocked action is recorded.
- Developer patches capture backups before mutation and roll back on failed validation.

## Not yet included

- Full authentication.
- Multi-user authorization.
- Encrypted secrets vault.
- Cloud audit logs.
- Container isolation.
- Plugin marketplace controls.

Those belong to later phases.


## Self-improvement safety

Self-improvement apply mode requires a validation gate. Unvalidated self-modification is blocked. Proposal mode may create artifacts but must not mutate source files.

## Phase 5 memory safety

The memory layer records evidence only. It does not approve lessons, alter prompts, modify source code, or change future behavior. Lesson candidates remain inactive until a future human-reviewed learning phase turns them into tests or rules.

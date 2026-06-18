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


## Phase 6 lesson review safety

Lesson review requires explicit human rationale. Approved lessons are stored with `active: false` and `activation: manual-activation-required`. S.E.R.A. can preserve reviewed knowledge, but it still cannot alter future behavior from memory on its own.


## Phase 7 active lesson safety

Active lesson activation requires an approved lesson and an explicit rationale. Pending, rejected, missing, or already active lessons cannot be activated. Activation writes audit records and regression-rule evidence only; it does not silently change prompts, tools, code, or runtime behavior. Deactivation is also rationale-gated and marks the linked regression rule inactive.

## Phase 8 planner safety

The task queue creates operating rhythm without autonomous execution. Tasks must move through strict lifecycle transitions. Invalid transitions are blocked. Completed and blocked task outcomes can be recorded into memory, but the planner does not activate lessons, run tools by itself, or modify source code.

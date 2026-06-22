# Phase 42 — Approval-Gated Action Plan v1

## Purpose

Phase 42 adds the local approval-gated action plan layer. It maps recorded owner decisions from Phase 41 into a structured action plan for future runner work while keeping every executable capability disabled.

This phase is intentionally not an executor. It does not run commands, connect to a runner, mutate source, create branches, apply patches, merge, tag, push, delete, or self-approve. It only builds the local plan that says which future actions are planned, which remain blocked, and which evidence bindings must be reviewed first.

## What this phase adds

- Local approval-gated action plan runtime
- Action plan item model
- Owner decision recorder binding requirement
- Approval queue binding requirement
- Evidence bundle binding requirement
- Command allowlist binding requirement
- Branch readiness binding requirement
- Non-approved decision blocking rule
- JSON and Markdown action plan reports
- History log under `.sera-approval-gated-action-plan/`

## Safety boundary

Phase 42 may map owner decisions to action plan status, but it cannot use those decisions as execution authority.

It must not:

- Record new owner decisions
- Accept evidence as owner-approved by itself
- Execute commands
- Execute remote commands
- Activate overnight workers
- Activate self-hosted runners
- Connect to runners
- Use secrets
- Mutate source
- Create branches
- Switch branches
- Push branches
- Open pull requests
- Apply patches
- Merge branches
- Tag releases
- Delete branches
- Self-approve

## Validation

Required validation commands:

- `npm run phase42:demo`
- `npm run phase42:verify`
- `npm run hygiene`
- `npm run build`
- `npm test`
- `npm run certify`
- `npm run verify`

## Expected result

The default approval-gated action plan should report:

- `approvalGatedActionPlanStatus: ready`
- `mapsOwnerDecisionsToActionPlan: true`
- `actionCanAuthorizeExecution: false`
- `executionAllowedAfterApproval: false`
- `commandExecutionAllowed: false`
- `remoteExecutionAllowed: false`
- `runnerConnectivityAllowed: false`
- `requiresSecrets: false`
- `mutatesSource: false`
- `recordsOwnerDecision: false`
- `decisionRecordingAllowed: false`
- `acceptsEvidenceAsOwnerApproved: false`
- `selfApprovesPlan: false`
- `selfApprovalAllowed: false`

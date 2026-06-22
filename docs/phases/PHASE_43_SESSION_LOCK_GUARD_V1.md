# Phase 43 — Session Lock Guard v1

## Purpose

Phase 43 adds the local session lock guard contract. It defines how future overnight or runner-style work must prove that only one session is active, stale locks are blocked, overlapping sessions are rejected, heartbeats are planned, and release requires owner review.

This phase is intentionally not an executor. It does not acquire a live lock for execution, release a live lock, run commands, connect to a runner, mutate source, create branches, apply patches, merge, tag, push, delete, record owner decisions, or self-approve.

## What this phase adds

- Local session lock guard runtime
- Lock step model
- Overlapping-session blocking requirement
- Stale-lock blocking requirement
- Heartbeat plan requirement
- Owner-release requirement
- Owner decision recorder binding requirement
- Approval-gated action plan binding requirement
- JSON and Markdown session lock reports
- History log under `.sera-session-lock-guard/`

## Safety boundary

Phase 43 may validate the session lock guard contract, but it cannot use a lock as execution authority.

It must not:

- Acquire a live execution lock
- Release a live execution lock
- Use a lock to authorize execution
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
- Record owner decisions
- Accept evidence as owner-approved
- Self-approve

## Validation

Required validation commands:

- `npm run phase43:demo`
- `npm run phase43:verify`
- `npm run hygiene`
- `npm run build`
- `npm test`
- `npm run certify`
- `npm run verify`

## Expected result

The default session lock guard should report:

- `sessionLockGuardStatus: ready`
- `sessionLockRequired: true`
- `overlappingSessionMustBlock: true`
- `staleLockMustBlock: true`
- `ownerReleaseRequired: true`
- `sessionLockCanAuthorizeExecution: false`
- `sessionLockAcquisitionAllowed: false`
- `sessionLockReleaseAllowed: false`
- `executionAllowedAfterApproval: false`
- `commandExecutionAllowed: false`
- `remoteExecutionAllowed: false`
- `runnerConnectivityAllowed: false`
- `requiresSecrets: false`
- `mutatesSource: false`
- `recordsOwnerDecision: false`
- `selfApprovesPlan: false`
- `selfApprovalAllowed: false`

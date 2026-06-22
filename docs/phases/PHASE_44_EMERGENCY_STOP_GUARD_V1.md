# Phase 44 — Emergency Stop Guard v1

## Purpose

Phase 44 adds the local emergency stop guard contract. It defines how future overnight or runner-style work must prove that an emergency stop state blocks action, remains latched until owner review, requires a restart preflight plan, and cannot be used as execution authority.

This phase is intentionally not an executor. It does not activate a live stop switch, release a live stop switch, run commands, connect to a runner, mutate source, create branches, apply patches, merge, tag, push, delete, record owner decisions, or self-approve.

## What this phase adds

- Local emergency stop guard runtime
- Stop step model
- Stop signal detection requirement
- Stop state latch requirement
- Blocked action handoff requirement
- Restart preflight requirement
- Owner release requirement
- Session lock guard binding requirement
- JSON and Markdown emergency stop reports
- History log under `.sera-emergency-stop-guard/`

## Safety boundary

Phase 44 may validate the emergency stop guard contract, but it cannot use an emergency stop state as execution authority.

It must not:

- Activate a live execution stop switch
- Release a live execution stop switch
- Use an emergency stop state to authorize execution
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

- `npm run phase44:demo`
- `npm run phase44:verify`
- `npm run hygiene`
- `npm run build`
- `npm test`
- `npm run certify`
- `npm run verify`

## Expected result

The default emergency stop guard should report:

- `emergencyStopGuardStatus: ready`
- `emergencyStopRequired: true`
- `emergencyStopMustBlock: true`
- `emergencyStopReleaseRequiresOwner: true`
- `sessionLockGuardBindingRequired: true`
- `emergencyStopCanAuthorizeExecution: false`
- `emergencyStopActivationAllowed: false`
- `emergencyStopReleaseAllowed: false`
- `executionAllowedAfterApproval: false`
- `commandExecutionAllowed: false`
- `remoteExecutionAllowed: false`
- `runnerConnectivityAllowed: false`
- `requiresSecrets: false`
- `mutatesSource: false`
- `recordsOwnerDecision: false`
- `selfApprovesPlan: false`
- `selfApprovalAllowed: false`

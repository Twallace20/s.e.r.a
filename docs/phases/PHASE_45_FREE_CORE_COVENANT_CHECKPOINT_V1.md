# Phase 45 — Free Core Covenant Checkpoint v1

## Purpose

Phase 45 adds the local free-core covenant checkpoint. It confirms that the free/local boundary remains intact through Phase 45 before S.E.R.A. moves closer to any future runner or execution-enabling work.

This phase is intentionally not an executor. It does not run commands beyond validation scripts, connect to a runner, require paid providers, require cloud services, use secrets, mutate source, create branches, apply patches, merge, tag, push, delete, record owner decisions, activate commercial features, or self-approve.

## What this phase adds

- Local free-core covenant checkpoint runtime
- Covenant item model
- Phase 45 free-core boundary declaration
- Paid provider prohibition checks
- Cloud runner prohibition checks
- Secret use prohibition checks
- Local runtime requirement checks
- Commercial activation deferral checks
- Session lock guard and emergency stop guard bindings
- JSON and Markdown free-core covenant reports
- History log under `.sera-free-core-covenant-checkpoint/`

## Safety boundary

Phase 45 may validate and report the free-core covenant checkpoint, but it cannot use the checkpoint as execution authority.

It must not:

- Require paid providers
- Require cloud services
- Require secrets
- Activate paid features
- Activate commercial paths
- Execute commands outside validation
- Execute remote commands
- Activate overnight workers
- Activate self-hosted runners
- Connect to runners
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

- `npm run phase45:demo`
- `npm run phase45:verify`
- `npm run hygiene`
- `npm run build`
- `npm test`
- `npm run certify`
- `npm run verify`

## Expected result

The default free-core covenant checkpoint should report:

- `freeCoreCovenantCheckpointStatus: ready`
- `freeCoreThroughPhase: 45`
- `freeCoreThroughPhase45: true`
- `paidProviderProhibited: true`
- `cloudRunnerProhibited: true`
- `secretUseProhibited: true`
- `localRuntimeOnly: true`
- `commercialActivationDeferred: true`
- `paidProviderRequired: false`
- `cloudRequired: false`
- `requiresSecrets: false`
- `commandExecutionAllowed: false`
- `remoteExecutionAllowed: false`
- `runnerConnectivityAllowed: false`
- `mutatesSource: false`
- `commercialActivationAllowed: false`
- `selfApprovesPlan: false`
- `selfApprovalAllowed: false`

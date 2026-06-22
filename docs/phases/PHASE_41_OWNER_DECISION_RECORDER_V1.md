# Phase 41 — Owner Decision Recorder v1

## Purpose

Phase 41 adds the local owner decision recorder. It lets S.E.R.A. record structured owner decisions for gated future actions while keeping execution disabled after approval.

This phase closes the gap intentionally left by the owner approval queue. Phase 36 modeled pending approvals. Phase 41 records owner decisions in an auditable local report, but those records do not activate overnight execution, runner connectivity, command execution, source mutation, branch actions, patches, merges, tags, deletion, or self-approval.

## What this phase adds

- Local owner decision recorder runtime
- Owner decision entry model
- Owner identity requirement
- Explicit owner decision phrase requirement
- Decision reason requirement
- Approval queue binding requirement
- Evidence bundle binding requirement
- Redaction review requirement
- Immutable audit trail requirement
- JSON and Markdown decision recorder reports
- History log under `.sera-owner-decision-recorder/`

## Safety boundary

Phase 41 may record owner decisions, but it cannot use those decisions as execution authority.

It must not:

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
- Accept evidence as owner-approved by itself
- Self-approve

## Validation

Required validation commands:

- `npm run phase41:demo`
- `npm run phase41:verify`
- `npm run hygiene`
- `npm run build`
- `npm test`
- `npm run certify`
- `npm run verify`

## Expected result

The default owner decision recorder should report:

- `ownerDecisionRecorderStatus: ready`
- `recordsOwnerDecision: true`
- `decisionRecordingAllowed: true`
- `decisionCanAuthorizeExecution: false`
- `executionAllowedAfterApproval: false`
- `commandExecutionAllowed: false`
- `remoteExecutionAllowed: false`
- `runnerConnectivityAllowed: false`
- `requiresSecrets: false`
- `mutatesSource: false`
- `acceptsEvidenceAsOwnerApproved: false`
- `selfApprovesPlan: false`
- `selfApprovalAllowed: false`

# Phase 61 — Local Worker Unlock Proposal Packet v1

## Purpose

Phase 61 creates the first owner-review proposal packet for any future local worker unlock path. It turns the Phase 60 readiness gate into a structured proposal surface without approving, installing, connecting, scheduling, or executing anything.

## What This Adds

- A typed local worker unlock proposal packet for the private operator app.
- Six unlock proposal requirements that must be reviewed before any future unlock can be considered.
- Six evidence requirements for owner approval, command allowlist compatibility, emergency stop compatibility, rollback policy, and auditability.
- A validation runner that proves the unlock proposal remains proposal-only.
- An integration test that blocks unsafe unlock, install, scheduling, execution, persistence, mutation, routing, and self-approval boundaries.

## Safe State

Phase 61 is proposal-only, owner-review-only, declarative-only, read-only, frontend-only, and local-only.

The phase intentionally keeps these values false:

- `localWorkerReadyForUnlock`
- `unlockProposalApproved`
- `executionUnlockApproved`
- `overnightWorkAuthorized`
- `workerInstallApproved`
- `workerInstalled`
- `workerConnected`
- `windowsSchedulerConfigured`
- `scheduledExecutionAllowed`
- `executionUnlockAllowed`
- `workerInstallAllowed`
- `workerConnectionAllowed`
- `workerSpawnAllowed`
- `taskExecutionAllowed`
- `commandExecutionAllowed`
- `shellExecutionAllowed`
- `runnerConnectivityAllowed`
- `autoRouteAllowed`
- `selfApprovalAllowed`

## Why This Matters

Phase 60 proved the local worker readiness surfaces are represented, but it deliberately kept readiness locked. Phase 61 creates the next safe layer: a proposal packet that explains what would be required before the system can move toward any future local worker unlock.

That keeps S.E.R.A. honest. She can describe the path forward, list required evidence, and prepare an owner review surface, but she cannot grant herself execution authority.

## Validation

Run:

```powershell
npm run phase61:demo
npm run phase61:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected proof includes:

- `localWorkerUnlockProposalPacketStatus: ready`
- `validationFailedCount: 0`
- `declaredFileCount: 5`
- `unlockProposalRequirementCount: 6`
- `unlockProposalFieldCount: 8`
- `unlockProposalEvidenceCount: 6`
- `unlockProposalSignalCount: 8`
- `safetyGateCount: 74`
- `appBindingCount: 5`
- `localWorkerReadyForUnlock: false`
- `unlockProposalApproved: false`
- `executionUnlockApproved: false`
- `commandExecutionAllowed: false`
- `shellExecutionAllowed: false`
- `workerInstallAllowed: false`
- `workerSpawnAllowed: false`
- `taskExecutionAllowed: false`
- `runnerConnectivityAllowed: false`
- `selfApprovalAllowed: false`

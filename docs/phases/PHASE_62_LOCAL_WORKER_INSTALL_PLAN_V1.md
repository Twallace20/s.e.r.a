# Phase 62 — Local Worker Install Plan v1

## Purpose

Phase 62 creates the owner-review installation plan for a future local desktop worker. It translates the Phase 61 unlock proposal into a structured install plan surface without approving, installing, downloading, connecting, scheduling, or executing anything.

## What This Adds

- A typed local worker install plan packet for the private operator app.
- Six installation plan requirements that must be reviewed before a future install phase can be considered.
- Six evidence requirements for owner approval, rollback, install evidence, worker health checks, workspace boundaries, and no-secret leakage proof.
- A validation runner that proves the install plan remains plan-only.
- An integration test that blocks unsafe install, dependency download, installer execution, worker connection, scheduling, command execution, shell execution, persistence, mutation, routing, and self-approval boundaries.

## Safe State

Phase 62 is install-plan-only, owner-review-only, declarative-only, read-only, frontend-only, and local-only.

The phase intentionally keeps these values false:

- `localWorkerReadyForInstall`
- `installPlanApproved`
- `executionUnlockApproved`
- `overnightWorkAuthorized`
- `workerInstallApproved`
- `workerInstalled`
- `workerConnected`
- `windowsSchedulerConfigured`
- `scheduledExecutionAllowed`
- `dependencyDownloadAllowed`
- `installerExecutionAllowed`
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

Phase 61 created the unlock proposal packet, but a proposal is not an install plan and it is not approval. Phase 62 adds the next safe layer: an install plan that names the required evidence, rollback expectations, workspace boundary, and future health-check requirements before any real installation can be attempted.

That keeps S.E.R.A. honest. She can prepare the plan and evidence requirements, but she cannot install herself, approve the install, run an installer, download dependencies, connect to a worker, or execute commands.

## Validation

Run:

```powershell
npm run phase62:demo
npm run phase62:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected proof includes:

- `localWorkerInstallPlanStatus: ready`
- `validationFailedCount: 0`
- `declaredFileCount: 5`
- `installPlanRequirementCount: 6`
- `installPlanFieldCount: 8`
- `installPlanEvidenceCount: 6`
- `installPlanSignalCount: 8`
- `safetyGateCount: 82`
- `appBindingCount: 5`
- `phase61UnlockProposalReady: true`
- `ownerApprovalRequired: true`
- `localWorkerReadyForInstall: false`
- `installPlanApproved: false`
- `workerInstallApproved: false`
- `workerInstalled: false`
- `dependencyDownloadAllowed: false`
- `installerExecutionAllowed: false`
- `workerInstallAllowed: false`
- `commandExecutionAllowed: false`
- `shellExecutionAllowed: false`
- `runnerConnectivityAllowed: false`
- `selfApprovalAllowed: false`

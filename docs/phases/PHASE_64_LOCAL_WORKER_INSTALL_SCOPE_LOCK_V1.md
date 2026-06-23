# Phase 64 — Local Worker Install Scope Lock v1

## Purpose

Phase 64 creates the local worker install scope lock surface. It defines the exact owner-review structure needed before any future local worker installation can become eligible.

This phase does not lock scope as approved, sign approval, approve installation, install a worker, download dependencies, execute installers, connect to a worker, query or mutate Windows Task Scheduler, execute commands, persist scope records, mutate files, mutate source, route work, auto-process work, or self-approve.

## What This Adds

- A typed private operator app install scope lock packet.
- A declarative scope lock verification runner.
- An integration test proving safe status, blocked execution, blocked install, blocked signing, blocked persistence, and app bindings.
- Knowledge source-map coverage for Phase 64 files.
- Runtime reports under `.sera-local-worker-install-scope-lock/`, ignored by Git.

## Required Proof

Run:

```powershell
npm run knowledge:verify
npm run phase64:demo
npm run phase64:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected Phase 64 proof includes:

```text
S.E.R.A. phase64 local worker install scope lock v1: PASS
localWorkerInstallScopeLockStatus: scope-lock-ready
validationFailedCount: 0
declaredFileCount: 5
installScopeLockRequirementCount: 6
installScopeLockFieldCount: 8
installScopeLockEvidenceCount: 6
installScopeLockSignalCount: 8
safetyGateCount: 98
appBindingCount: 5
phase63ApprovalRecordReady: true
phase62InstallPlanReady: true
ownerApprovalRequired: true
explicitScopeLockRequired: true
signedScopeRequired: true
workspaceBoundaryRequired: true
dependencyScopeRequired: true
rollbackTargetRequired: true
installEvidenceTargetRequired: true
localWorkerReadyForInstall: false
installScopeLocked: false
installApprovalRecordApproved: false
installPlanApproved: false
workerInstallApproved: false
workerInstalled: false
workerConnected: false
scopeLockSigningAllowed: false
dependencyDownloadAllowed: false
installerExecutionAllowed: false
workerInstallAllowed: false
commandExecutionAllowed: false
shellExecutionAllowed: false
runnerConnectivityAllowed: false
selfApprovalAllowed: false
```

## Closeout Criteria

Phase 64 can close only after:

- `phase64:verify` passes.
- Hygiene, build, test, certify, and verify pass.
- Main is pushed.
- Tag `phase-64-local-worker-install-scope-lock-v1` is pushed.
- Remote/local phase branches are deleted.
- Working tree is clean on main.

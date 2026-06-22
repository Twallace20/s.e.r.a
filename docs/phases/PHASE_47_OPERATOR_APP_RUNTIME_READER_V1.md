# Phase 47 — Operator App Runtime Reader v1

## Purpose

Phase 47 connects the private operator app shell to a repo-owned, frontend-consumable S.E.R.A. runtime status packet.

This phase makes the dashboard feel less like static sample data while preserving the safety boundary that the app is still read-only, local/private, and non-executing.

## What this phase adds

- A typed runtime status packet at `apps/operator-console/src/runtime-status.ts`
- A Phase 47 runtime-reader verification library at `scripts/lib/operator-app-runtime-reader-v1.mjs`
- A Phase 47 demo runner at `scripts/run-operator-app-runtime-reader-v1.mjs`
- A Phase 47 integration test at `tests/integration/operator-app-runtime-reader-v1.test.ts`
- App wiring so the dashboard reads the Phase 47 status packet instead of only hard-coded Phase 46 sample labels
- Documentation and source-map entries for the new runtime-reader surface

## What this phase does not add

Phase 47 does **not** add:

- backend server logic
- authentication
- database persistence
- command execution
- shell execution from the app
- runner connectivity
- branch mutation
- source mutation
- auto-merge
- self-approval
- cloud hosting
- secrets

## Runtime reader contract

The runtime reader is allowed to expose:

- current phase label
- certification level
- free-core checkpoint status
- source-map status
- local runtime readiness
- GitHub bridge readiness as a planned/read-only status
- visible safety gates
- next recommended action

The runtime reader is not allowed to execute commands, run validation, approve work, create branches, merge code, or mutate source files.

## Validation commands

Run Phase 47 validation:

```bash
npm run knowledge:verify
npm run phase47:demo
npm run phase47:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected Phase 47 demo proof:

```text
S.E.R.A. phase47 operator app runtime reader v1: PASS
operatorAppRuntimeReaderStatus: ready
validationFailedCount: 0
declaredFileCount: 5
runtimeSignalCount: 5
safetyGateCount: 9
appStatusBindingCount: 4
localOnly: true
privateAppOnly: true
readOnly: true
frontendConsumableStatus: true
noBackendLogic: true
noAuthentication: true
commandExecutionAllowed: false
runnerConnectivityAllowed: false
mutatesSource: false
autoMergeAllowed: false
selfApprovalAllowed: false
```

## App preview

Restart the app server after applying this phase because the app source and status packet changed:

```bash
npm run operator:dev
```

Open:

```text
http://127.0.0.1:5173/
```

## Closeout

After validation passes, merge, tag, and clean up the branch:

```bash
git add .
git commit -m "feat: add Operator App Runtime Reader v1"
git push -u origin phase-47-operator-app-runtime-reader-v1

git switch main
git pull origin main
git merge --no-ff origin/phase-47-operator-app-runtime-reader-v1 -m "merge: add Operator App Runtime Reader v1"

npm run phase47:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify

git push origin main

git tag phase-47-operator-app-runtime-reader-v1
git push origin refs/tags/phase-47-operator-app-runtime-reader-v1:refs/tags/phase-47-operator-app-runtime-reader-v1

git push origin :refs/heads/phase-47-operator-app-runtime-reader-v1
git branch --delete phase-47-operator-app-runtime-reader-v1

git status
git branch -r
git tag --list
```

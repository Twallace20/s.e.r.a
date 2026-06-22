# Phase 48 — Request Intake v1

## Purpose

Phase 48 gives the private S.E.R.A. operator app its first request-intake surface.

The goal is to let the owner-operator capture a request draft inside the app, classify the request, display the suggested review path, and preserve the safety contract before any routing, execution, branch work, file intake, or automation is allowed.

## What Phase 48 Adds

- A typed frontend request-intake packet at `apps/operator-console/src/request-intake.ts`.
- A capture-only request panel inside the private operator app.
- A request intake review card that displays owner review, suggested queue, and execution lock status.
- A Phase 48 verification runner and integration test.
- Knowledge source-map coverage for all new Phase 48 source files.

## What Phase 48 Does Not Add

Phase 48 does not add:

- backend request processing
- authentication
- command execution
- runner connectivity
- autonomous submission
- automatic routing
- branch mutation
- source mutation
- auto-merge
- self-approval

## Safety Contract

Phase 48 must remain:

- local-only
- private-app-only
- capture-only
- read-only
- frontend-only
- owner-review-gated
- free-core compatible

The request intake packet may describe a future action, but it must not execute the action.

## Validation

Run:

```bash
npm run knowledge:verify
npm run phase48:demo
npm run phase48:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected Phase 48 proof:

```text
S.E.R.A. phase48 request intake v1: PASS
requestIntakeStatus: ready
validationFailedCount: 0
localOnly: true
privateAppOnly: true
captureOnly: true
readOnly: true
frontendOnly: true
noBackendLogic: true
noAuthentication: true
commandExecutionAllowed: false
runnerConnectivityAllowed: false
mutatesSource: false
autoSubmitAllowed: false
autoRouteAllowed: false
autoMergeAllowed: false
selfApprovalAllowed: false
```

## Closeout Criteria

Phase 48 is complete when:

1. The private operator app renders request-intake draft data from `request-intake.ts`.
2. The Phase 48 demo runner passes.
3. Knowledge source map verification includes the Phase 48 files.
4. Full build, test, certify, and verify pass.
5. Generated `.sera-request-intake/` artifacts are ignored and not committed.
6. The phase branch is merged to `main` and tagged as `phase-48-request-intake-v1`.

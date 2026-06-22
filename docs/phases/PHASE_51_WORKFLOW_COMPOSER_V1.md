# Phase 51 — Workflow Composer v1

## Purpose

Phase 51 adds a private operator workflow composer preview to the S.E.R.A. app. It is the bridge between Phase 48 request intake, Phase 49 file intake, and Phase 50 workflow library.

This phase composes a captured request signal, metadata-only file signal, and catalog workflow signal into a structured plan preview for Tyler review.

It does not create tasks, route work, process files, execute commands, connect to a runner, mutate source, or approve itself.

## What this phase adds

- `apps/operator-console/src/workflow-composer.ts`
  - Typed frontend-consumable workflow composer packet.
  - Request + file + workflow signal model.
  - Composed plan preview with steps, evidence requirements, suggested queue, owner gate, and safety boundaries.

- `scripts/lib/workflow-composer-v1.mjs`
  - Validation contract for the workflow composer surface.
  - Checks declared files, composition fields, app bindings, safety gates, package scripts, and blocked authority boundaries.

- `scripts/run-workflow-composer-v1.mjs`
  - Phase 51 demo/verification runner.
  - Writes generated evidence into `.sera-workflow-composer/`.

- `tests/integration/workflow-composer-v1.test.ts`
  - Integration tests proving the composer is present, app-bound, reportable, and safe.

## Safety contract

Phase 51 is:

- local-only
- private-app-only
- composition-only
- plan-preview-only
- read-only
- frontend-only
- no backend logic
- no authentication changes
- no command execution
- no runner connectivity
- no source mutation
- no file mutation
- no auto-processing
- no auto-routing
- no auto-merge
- no self-approval

## Validation

Run:

```powershell
npm run phase51:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected Phase 51 proof:

```text
S.E.R.A. phase51 workflow composer v1: PASS
workflowComposerStatus: ready
validationFailedCount: 0
declaredFileCount: 5
compositionFieldCount: 8
compositionSignalCount: 8
planStepCount: 4
evidenceRequirementCount: 5
safetyGateCount: 15
appBindingCount: 4
localOnly: true
privateAppOnly: true
compositionOnly: true
planPreviewOnly: true
readOnly: true
frontendOnly: true
noBackendLogic: true
noAuthentication: true
commandExecutionAllowed: false
runnerConnectivityAllowed: false
mutatesSource: false
fileMutationAllowed: false
autoProcessingAllowed: false
autoRouteAllowed: false
autoMergeAllowed: false
selfApprovalAllowed: false
```

## Operator meaning

Phase 51 makes the app feel more connected: request + file + workflow can now become a plan preview.

It is still not a task runner. It is the safe composition layer that future phases will use before anything becomes executable work.

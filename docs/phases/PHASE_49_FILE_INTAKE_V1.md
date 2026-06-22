# Phase 49 — File Intake v1

## Purpose

Phase 49 gives the private S.E.R.A. operator app its first file-intake surface.

The goal is to let the owner-operator see how local files will enter S.E.R.A. safely, capture file metadata, classify review readiness, and preserve strict boundaries before any parsing, indexing, processing, routing, execution, or automation is allowed.

## What Phase 49 Adds

- A typed frontend file-intake packet at `apps/operator-console/src/file-intake.ts`.
- A file intake review card inside the private operator app.
- A metadata-only file intake contract for file name, extension, category, source, classification, size label, and review state.
- A Phase 49 verification runner and integration test.
- Knowledge source-map coverage for all new Phase 49 source files.

## What Phase 49 Does Not Add

Phase 49 does not add:

- real file upload processing
- backend file parsing
- arbitrary file access
- file execution
- file mutation
- source mutation
- runner connectivity
- autonomous processing
- automatic routing
- branch mutation
- auto-merge
- self-approval

## Safety Contract

Phase 49 must remain:

- local-only
- private-app-only
- metadata-capture-only
- read-only
- frontend-only
- owner-review-gated
- free-core compatible

The file intake packet may describe a future local file review flow, but it must not read arbitrary files, execute files, mutate files, route files, or process file contents.

## Validation

Run:

```bash
npm run knowledge:verify
npm run phase49:demo
npm run phase49:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected Phase 49 proof:

```text
S.E.R.A. phase49 file intake v1: PASS
fileIntakeStatus: ready
validationFailedCount: 0
localOnly: true
privateAppOnly: true
metadataCaptureOnly: true
readOnly: true
frontendOnly: true
noBackendLogic: true
noAuthentication: true
arbitraryFileAccessAllowed: false
fileExecutionAllowed: false
fileMutationAllowed: false
runnerConnectivityAllowed: false
mutatesSource: false
autoProcessingAllowed: false
autoRouteAllowed: false
autoMergeAllowed: false
selfApprovalAllowed: false
```

## Closeout Criteria

Phase 49 is complete when:

1. The private operator app renders file-intake metadata from `file-intake.ts`.
2. The Phase 49 demo runner passes.
3. Knowledge source map verification includes the Phase 49 files.
4. Full build, test, certify, and verify pass.
5. Generated `.sera-file-intake/` artifacts are ignored and not committed.
6. The phase branch is merged to `main` and tagged as `phase-49-file-intake-v1`.

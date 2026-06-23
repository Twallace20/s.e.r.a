# Phase 66 — Local Worker Rollback Plan v1

## Purpose

Phase 66 adds a declarative owner-review rollback plan for any future local worker installation path.

This phase exists so a future install path cannot proceed without a defined rollback target, rollback trigger, state restore boundary, rollback evidence target, and owner rollback approval requirement.

## Safety Position

Phase 66 is not an installation phase. It does not approve installation, sign approval, execute rollback, restore state, create backups, install a worker, download dependencies, execute installers, connect to a worker, run commands, persist rollback records, mutate files, mutate source, or self-approve.

## Required Proof

Run:

```powershell
npm run knowledge:verify
npm run phase66:demo
npm run phase66:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected counts:

- declared files: 5
- rollback plan requirements: 6
- rollback plan fields: 8
- rollback plan evidence requirements: 6
- rollback plan signals: 8
- safety gates: 118
- app bindings: 5

## Boundaries

The phase must keep these blocked:

- install approval
- install execution
- rollback execution
- state restore
- backup creation
- dependency download
- installer execution
- worker connection
- scheduler mutation/query/execution
- command execution
- shell execution
- PowerShell execution
- filesystem scanning/probing
- path creation/deletion
- source/file mutation
- persistence of rollback records
- auto-routing, auto-processing, auto-merging, final approval, and self-approval

## Closeout Rule

Phase 66 can close only after the full validation gate passes and the branch is merged, tagged, pushed, and cleaned up.

# Phase 67 — Local Worker Dependency Allowlist v1

## Purpose

Phase 67 adds a declarative owner-review dependency allowlist for any future local worker installation path.

This phase exists so a future install path cannot proceed without a defined dependency inventory, package manager boundary, version pinning requirement, provenance evidence requirement, and owner dependency approval requirement.

## Safety Position

Phase 67 is not an installation phase. It does not approve installation, sign approval, download dependencies, install packages, run package managers, mutate dependency manifests, create lockfiles, execute installers, connect to a worker, run commands, persist dependency allowlist records, mutate files, mutate source, or self-approve.

## Required Proof

Run:

```powershell
npm run knowledge:verify
npm run phase67:demo
npm run phase67:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected counts:

- declared files: 5
- dependency allowlist requirements: 6
- dependency allowlist fields: 8
- dependency allowlist evidence requirements: 6
- dependency allowlist signals: 8
- safety gates: 145
- app bindings: 5

## Boundaries

The phase must keep these blocked:

- install approval
- install execution
- dependency download
- package installation
- package manager execution
- dependency manifest mutation
- lockfile mutation
- installer execution
- worker connection
- scheduler mutation/query/execution
- command execution
- shell execution
- PowerShell execution
- filesystem scanning/probing
- path creation/deletion
- source/file mutation
- persistence of dependency allowlist records
- auto-routing, auto-processing, auto-merging, final approval, and self-approval

## Closeout Rule

Phase 67 can close only after the full validation gate passes and the branch is merged, tagged, pushed, and cleaned up.

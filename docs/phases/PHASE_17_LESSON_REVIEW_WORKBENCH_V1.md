# Phase 17 — Lesson Review Workbench v1

## Status

Planned for implementation on branch:

```text
phase-17-lesson-review-workbench-v1
```

## Purpose

Phase 17 turns S.E.R.A.'s lesson memory into an operator-reviewable workbench. Earlier phases created the core learning records: failure journal entries, lesson candidates, approvals, rejections, inactive approved lessons, active lesson records, activation decisions, and regression rules. Phase 17 does not create a new learning authority. It creates a human review surface so those records can be inspected, triaged, and governed from a single packet.

## What Phase 17 Adds

Phase 17 adds:

- a lesson review workbench report in the memory layer
- a kernel surface for reading and writing the workbench
- CLI commands for operator access
- a repeatable local demo script
- integration tests proving the workbench is review-only
- source-map and validation documentation for the new review surface

## What Phase 17 Proves

Phase 17 proves this loop:

```text
failure evidence → lesson candidate → workbench packet → human review queue → explicit approve/reject/activation remains manual
```

The workbench must show:

- pending lesson candidates
- evidence connected to each pending candidate
- approved-but-inactive lessons
- active lesson regression rules
- recent review decisions
- activation decisions
- guardrails and recommended next human actions
- JSON and Markdown report paths when written

## Safety Boundary

Phase 17 is a governance/readability layer. It must not:

- automatically approve a candidate
- automatically reject a candidate
- automatically activate an approved lesson
- automatically deactivate an active lesson
- mutate runtime behavior based on lesson content
- bypass the existing manual approval and activation model

Approved lessons remain inactive until an explicit human activation command is run. Active lessons remain auditable regression-rule records, not hidden behavior changes.

## Validation Contract

Required local validation:

```bash
npm run knowledge:verify
npm run phase17:demo
npm run phase17:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected test target after Phase 17:

```text
15 test files passed
66 tests passed
```

Expected certification level remains:

```text
S.E.R.A. certify: PASS level=operator-console-v1
```

## Definition of Done

Phase 17 is complete only when:

- workbench CLI commands are present
- the demo script passes
- the workbench writes Markdown and JSON reports under `.sera-memory/`
- tests prove the workbench does not approve, reject, activate, or deactivate lessons automatically
- source-map verification includes the new Phase 17 sources
- hygiene, build, tests, certify, and verify pass
- the phase branch is merged into `main`
- the phase is tagged cleanly
- local and remote phase branches are deleted
- `main` is clean and up to date with `origin/main`

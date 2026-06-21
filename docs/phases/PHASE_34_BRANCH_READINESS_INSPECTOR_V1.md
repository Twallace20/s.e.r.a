# Phase 34 — Branch Readiness Inspector v1

## Purpose

Phase 34 verifies that a branch proposal is complete, bounded, and safe enough for owner review before any branch is created, switched, pushed, patched, executed, or merged.

Phase 33 created safe branch proposals from phase packets. Phase 34 inspects those proposals and returns one of three outcomes:

- `ready` — the proposal has the required structure, evidence, validation commands, risk checks, and owner gates.
- `attention` — the proposal is mostly complete but has non-blocking warnings.
- `blocked` — the proposal is missing required safety boundaries or readiness evidence.

## What this phase adds

- Local branch readiness inspection runtime.
- Proposal readiness report.
- Risk and owner-gate validation.
- Required validation command checks.
- Evidence requirement checks.
- Safety boundary checks.
- Runtime reports under `.sera-branch-readiness/`.

## Safety boundaries

Phase 34 does **not**:

- create branches
- switch branches
- push branches
- open pull requests
- apply patches
- mutate source
- execute branch proposals
- approve branch proposals
- use secrets
- call paid providers
- require cloud services

## Required validation commands

- `npm run phase34:demo`
- `npm run phase34:verify`
- `npm run hygiene`
- `npm run build`
- `npm test`
- `npm run certify`
- `npm run verify`

## Certification meaning

Passing Phase 34 means S.E.R.A. can inspect a branch proposal and determine whether it is ready for owner approval without granting itself execution or mutation authority.

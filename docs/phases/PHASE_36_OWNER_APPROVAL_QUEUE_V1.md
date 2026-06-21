# Phase 36 — Owner Approval Queue v1

## Purpose

Phase 36 adds a local owner approval queue for future remote-safe work.

Phase 33 creates branch proposals. Phase 34 inspects branch readiness. Phase 35 defines the remote phase runner blueprint. Phase 36 adds the approval queue layer those future runs must pass through before any dangerous action can occur.

This is a queue phase only. It can model pending approval requests and evidence requirements. It does not record real owner decisions, execute remote work, create branches, apply patches, open pull requests, merge, tag, delete branches, or approve itself.

## What this phase adds

- Local owner approval queue runtime.
- Approval request model.
- Approval stage model.
- Pending owner approval report.
- Required owner gates for remote run activation, branch creation, patch application, validation evidence acceptance, merge, cleanup, and tagging.
- Runtime reports under `.sera-owner-approval-queue/`.

## Safety boundaries

Phase 36 does **not**:

- approve its own requests
- record real owner decisions
- execute remote commands
- use cloud runners
- use self-hosted runners
- use secrets
- create branches
- switch branches
- push branches
- open pull requests
- apply patches
- mutate source
- merge branches
- tag releases
- delete branches
- activate remote execution

## Required validation commands

- `npm run phase36:demo`
- `npm run phase36:verify`
- `npm run hygiene`
- `npm run build`
- `npm test`
- `npm run certify`
- `npm run verify`

## Certification meaning

Passing Phase 36 means S.E.R.A. can produce and validate a local owner approval queue for future remote-safe work while keeping all execution disabled and owner decisions mandatory.

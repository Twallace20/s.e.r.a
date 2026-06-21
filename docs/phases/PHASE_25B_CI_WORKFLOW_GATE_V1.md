# Phase 25B — CI Workflow Gate v1

## Purpose

Phase 25B adds a read-only GitHub Actions validation gate so S.E.R.A. branches can be checked remotely without giving the workflow source mutation, merge, deployment, secret, or billing authority.

This phase exists to reduce manual terminal friction while preserving the free/local core. Local validation remains the source of truth; GitHub Actions becomes an optional remote proof layer.

## What this phase adds

- `.github/workflows/verify.yml`
- `scripts/lib/ci-workflow-gate-v1.mjs`
- `scripts/run-ci-workflow-gate-v1.mjs`
- `tests/integration/ci-workflow-gate-v1.test.ts`
- local reports under `.sera-ci-gate/`

## Boundary

Phase 25B does not:

- mutate source files
- create commits
- push branches
- merge pull requests
- access repository secrets
- deploy anything
- require paid APIs
- become required for local/free-core certification

## Why this matters

Future S.E.R.A. development can use a safer workflow:

1. S.E.R.A. or Sage prepares a branch/overlay.
2. The branch is pushed.
3. GitHub Actions runs verification remotely.
4. Artifacts preserve evidence.
5. Tyler approves merge/tag/closeout.

This is the first step toward remote owner operations and eventually overnight branch preparation.

## Validation

Run:

    npm run phase25b:demo
    npm run phase25b:verify
    npm run hygiene
    npm run build
    npm test
    npm run certify
    npm run verify

Expected:

    S.E.R.A. phase25B CI workflow gate v1: PASS
    S.E.R.A. knowledge source map: PASS mapped=59
    Test Files 24 passed
    Tests 101 passed
    S.E.R.A. certify: PASS level=operator-console-v1

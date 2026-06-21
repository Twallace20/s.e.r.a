# Phase 27 — Regression Baseline Registry v1

## Purpose

Phase 27 adds a local regression baseline registry for S.E.R.A.

Phase 26 gave S.E.R.A. evaluation scorecards. Phase 27 preserves known-good evaluation expectations so future branches, packets, and overnight work can be checked for drift before trust increases.

## What this phase adds

- Local regression baseline registry
- Locked default baseline records
- Category-level baseline expectations
- Required signal checks
- Evaluation-summary comparison
- Regression blocker detection
- Local evidence reports
- Baseline history
- Owner approval boundary for baseline changes

## Baseline categories

The default registry covers:

- coding
- retrieval
- tool governance
- phase execution
- safety

## Safety boundary

Phase 27 does not:

- execute arbitrary code
- mutate source files
- commit, push, merge, or delete branches
- require secrets
- require paid APIs
- require hosted model providers
- require cloud services
- approve its own baseline changes

Baseline changes require owner approval.

## Runtime artifacts

Runtime files are written under:

    .sera-regression-baselines/

Expected reports:

    .sera-regression-baselines/reports/regression-baseline-summary.json
    .sera-regression-baselines/reports/regression-baseline-summary.md
    .sera-regression-baselines/reports/regression-baseline-history.jsonl

## Validation commands

    npm run phase27:demo
    npm run phase27:verify
    npm run hygiene
    npm run build
    npm test
    npm run certify
    npm run verify

## Completion criteria

Phase 27 is complete when:

- default baselines are generated locally
- all default baselines are locked
- category coverage is present
- known-good evaluation summaries pass
- intentionally broken summaries produce blockers
- reports are written locally
- free-core covenant remains green through Phase 45
- source map verification passes
- full test/certify/verify suite passes

## Role in the larger roadmap

Phase 27 is the protection layer after Phase 26. It helps S.E.R.A. know when a future change is worse than the known-good baseline.

This matters before remote acceleration because overnight work needs a way to stop itself when quality drops.

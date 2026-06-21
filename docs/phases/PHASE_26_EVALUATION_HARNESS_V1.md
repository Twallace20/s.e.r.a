# Phase 26 — Evaluation Harness v1

## Purpose

Phase 26 gives S.E.R.A. her first formal local evaluation harness.

The goal is to move from “this seems better” to “this passed a measurable scorecard.” Future improvements, workers, tools, memory behavior, retrieval behavior, planning behavior, and safety behavior need repeatable evaluation before they become part of a recursive agent.

## What this phase adds

- `scripts/lib/evaluation-harness-v1.mjs`
- `scripts/run-evaluation-harness-v1.mjs`
- `tests/integration/evaluation-harness-v1.test.ts`
- local runtime reports under `.sera-evals/`

## Evaluation model

The Phase 26 harness creates a deterministic local evaluation suite with cases for:

- coding and validation-gated source changes
- local knowledge and citation behavior
- tool governance boundaries
- phase packet handoffs
- remote and overnight safety boundaries

Each case includes:

- case id
- category
- capability id
- prompt/input description
- expected content requirements
- forbidden content requirements
- required safety flags
- candidate output/flags
- assertion score

## Boundary

Phase 26 does not:

- execute arbitrary code
- call paid APIs
- call hosted model providers
- require cloud services
- require repository secrets
- mutate source
- commit changes
- push branches
- merge pull requests
- replace owner approval

## Why this matters

Phase 25 gave S.E.R.A. a capability map. Phase 25B gave S.E.R.A. a remote validation proof gate. Phase 25C gave S.E.R.A. a standard phase packet format.

Phase 26 gives S.E.R.A. scorecards.

That matters because future self-improvement must be evaluated before it is trusted. A recursive agent needs evidence that a change improved behavior, preserved boundaries, and did not regress core safety requirements.

## Validation

Run:

    npm run phase26:demo
    npm run phase26:verify
    npm run hygiene
    npm run build
    npm test
    npm run certify
    npm run verify

Expected:

    S.E.R.A. phase26 evaluation harness v1: PASS
    S.E.R.A. knowledge source map: PASS mapped=67
    Test Files 26 passed
    Tests 111 passed
    S.E.R.A. certify: PASS level=operator-console-v1

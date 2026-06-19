# Phase 19 — Recursive Learning v1

## Purpose

Phase 19 gives S.E.R.A. a local, subscription-free recursive learning cycle that can synthesize existing evidence into a governed next-action report.

This phase does not create a new autonomous authority level. It reads local memory, lesson candidates, approved lessons, active lessons, regression rules, and review history, then records a recursive learning cycle that tells the operator what should be reviewed next.

## Certification boundary

Phase 19 must pass without paid APIs, paid subscriptions, hosted databases, hosted model providers, or required cloud services.

The certified path is local files only:

- `.sera-memory/run-history.jsonl`
- `.sera-memory/failure-journal.jsonl`
- `.sera-memory/lesson-candidates.jsonl`
- `.sera-memory/approved-lessons.jsonl`
- `.sera-memory/rejected-lessons.jsonl`
- `.sera-memory/active-lessons.jsonl`
- `.sera-memory/regression-rules.jsonl`
- `.sera-memory/recursive-learning-cycles.jsonl`
- `.sera-memory/recursive-learning-summary.json`

## What this phase adds

- a recursive learning cycle record
- local synthesis of failure and lesson evidence
- recommendations for human review
- recommendations for manual activation consideration
- explicit guardrails against auto-approval and auto-activation
- CLI access for running and listing recursive learning cycles
- a local demo script
- integration tests proving the cycle is report-only

## What this phase does not add

- no paid API dependency
- no required LLM
- no automatic approval
- no automatic rejection
- no automatic activation
- no automatic source mutation
- no automatic task execution
- no cloud-only storage
- no hosted model requirement

## Local commands

```bash
npm run phase19:demo
npm run phase19:verify
npm run sera -- lessons recursive
npm run sera -- lessons recursive-history
```

## Expected proof

```text
S.E.R.A. free core covenant: PASS through_phase=45
S.E.R.A. knowledge source map: PASS mapped=30
S.E.R.A. phase19 recursive learning: PASS
Test Files 17 passed (17)
Tests 72 passed (72)
S.E.R.A. certify: PASS level=operator-console-v1
```

## Definition of done

Phase 19 is done when:

1. The recursive learning cycle runs locally.
2. It writes cycle history under `.sera-memory/`.
3. It produces recommendations without making review decisions.
4. It preserves pending lesson candidates as pending.
5. It preserves approved lessons as inactive unless an operator manually activates them.
6. It passes the free-core covenant gate.
7. It passes build, tests, certification, and verify.
8. The certified runtime remains `operator-console-v1`.

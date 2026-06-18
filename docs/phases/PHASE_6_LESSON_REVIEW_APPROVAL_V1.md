# Phase 6 — Lesson Review + Approval v1

## Purpose

Phase 6 adds a governed review gate for lesson candidates created by Task Memory. S.E.R.A. can now list and inspect candidates, approve valid candidates, reject invalid candidates, and preserve every review decision as evidence.

## Capability Contract

S.E.R.A. may:

- list lesson candidates
- inspect one lesson candidate by ID
- approve a pending candidate with a rationale
- reject a pending candidate with a rationale
- write approved lesson records
- write rejected lesson records
- write decision records
- update candidate status from `candidate` to `approved` or `rejected`

S.E.R.A. must not:

- activate approved lessons automatically
- change behavior based on approved lessons yet
- approve or reject a candidate without a rationale
- review a missing candidate
- approve or reject the same candidate twice
- mutate source code during lesson review

## Runtime Data

Lesson review uses `.sera-memory/` and remains ignored by Git:

- `lesson-candidates.jsonl`
- `approved-lessons.jsonl`
- `rejected-lessons.jsonl`
- `lesson-decisions.jsonl`
- `summary.json`

## CLI

```bash
npm run sera -- lessons candidates
npm run sera -- lessons inspect <candidate-id>
npm run sera -- lessons approve <candidate-id> "Reviewed and valid."
npm run sera -- lessons reject <candidate-id> "Not reusable."
npm run sera -- lessons approved
npm run sera -- lessons rejected
npm run sera -- lessons decisions
```

## Certification

Phase 6 is certified when:

- existing secure base checks still pass
- Developer Worker checks still pass
- Self-Improvement checks still pass
- Task Memory checks still pass
- lesson candidate inspection works
- approval writes an inactive approved lesson
- duplicate review decisions are blocked
- rejection writes a rejected lesson record
- summary counts reviewed lessons correctly

Certified level: `lesson-review-v1`.

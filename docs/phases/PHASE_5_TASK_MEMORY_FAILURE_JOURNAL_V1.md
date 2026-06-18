# Phase 5 — Task Memory + Failure Journal v1

Phase 5 gives S.E.R.A. an evidence-based memory layer without allowing automatic learning or autonomous self-modification.

## Purpose

S.E.R.A. must be able to remember what happened before it can safely improve from experience. This phase adds local run history, a failure journal, and lesson candidate records that require human review before they can become rules, tests, or active behavior.

## Added capability

- `@sera/memory` package
- `.sera-memory/` runtime directory ignored by Git
- run history records for every finalized kernel run
- failure journal records for `blocked` and `failed` runs
- lesson candidate records created from failures
- manual approval requirement for lesson candidates
- memory summary API
- CLI memory commands
- cert checks for run memory, failure memory, and inactive lesson candidates

## Non-negotiables

- Memory does not modify source code.
- Lesson candidates are not active lessons.
- No failed run becomes a rule automatically.
- Every memory record is JSONL and reviewable.
- Runtime memory is not committed to the source repository.

## Certified behaviors

- completed runs are recorded in run history
- blocked runs are recorded in the failure journal
- failed validation runs are recorded as failures
- lesson candidates remain inactive and manual-approval-gated
- summary counts runs, failures, and lesson candidates

## Why this matters

This is the responsible first step toward recursive learning. S.E.R.A. can now observe its own outcomes and preserve evidence, but it still cannot rewrite itself or alter future behavior from memory without a later approval and regression-test phase.

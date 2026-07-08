# Phase 192 — Autopilot Reliability Regression Hardening v1

## Status

This overlay adds Phase192 reliability regression hardening for the S.E.R.A. AutoOps flow.

## Why Phase192 exists

Phase191 proved the full autopilot closeout path can complete from command JSON through exact overlay ZIP, direct closeout, verifier, QA, pasteback, merge, tag, push, cleanup, and watcher return.

It also exposed several reliability failures that should never become tribal knowledge:

- PowerShell verifier parser errors caused by unsafe interpolated strings.
- QA failures caused by checksum manifest path separator mismatch.
- Dirty worktrees blocked `git switch main`.
- ZIP repair flows needed an explicit hash-change assertion.
- Duplicate or stale same-phase command JSONs could reprocess after a successful closeout.
- Queue pause state could allow older stale commands to block newer work.
- Fresh current-phase verifier and QA handoffs must remain mandatory.
- Pasteback must complete with `PASTEBACK_POSTED_TEXT_MATCH` before merge/tag/push/cleanup.
- Watcher return after `CLOSED_CLEANLY` or `BLOCKED` must be visible evidence.

## What Phase192 adds

Phase192 adds a reusable regression checker:

`scripts/sera-autopilot-reliability-regression-hardening-v1.ps1`

The checker is intentionally local, deterministic, and read-only in assert mode. It validates the current repo and AutoOps state for the regression surfaces that Phase191 exposed.

## Required markers

The Phase192 verifier and QA scripts require these markers to remain present in the new hardening script:

- `PHASE192_AUTOPILOT_RELIABILITY_REGRESSION_HARDENING`
- `PHASE192_DIRTY_WORKTREE_PREFLIGHT`
- `PHASE192_SCRIPT_PARSE_PRECHECK`
- `PHASE192_CHECKSUM_PATH_NORMALIZATION`
- `PHASE192_ZIP_HASH_CHANGE_ASSERTION`
- `PHASE192_DUPLICATE_COMMAND_AFTER_SUCCESS_GUARD`
- `PHASE192_FRESH_HANDOFF_GATES`
- `PHASE192_PASTEBACK_BEFORE_MERGE_GUARD`
- `PHASE192_WATCHER_RETURN_PROOF`

## Closeout invariants

Phase192 keeps the same closeout invariants established in Phase190 and proven in Phase191:

- No random recent chat fallback.
- No new chat fallback.
- No QA unless verifier passes.
- No pasteback unless verifier and QA pass.
- No merge/tag/push/cleanup unless pasteback proves `PASTEBACK_POSTED_TEXT_MATCH`.
- No copied stale `CLOSED_CLEANLY` handoff.
- Current-phase metadata must synthesize the final handoff.
- Watcher must return to watching after success or block.

## Expected proof

A successful Phase192 closeout should prove:

- `NEW_COMMAND_JSON_DETECTED`
- `COMMAND_JSON_FOUND phase=192`
- `ZIP_READY`
- `RUN_DIRECT_ZIP_CLOSEOUT phase=192`
- `VERIFY_PASS`
- `PASS_GUARANTEED`
- `FINAL_HANDOFF_IDENTITY_VALIDATED`
- `PASTEBACK_POSTED_TEXT_MATCH`
- `DIRECT_CLOSEOUT_EXIT code=0`
- `CLOSED_CLEANLY`
- `WATCHER_RETURN_TO_WATCH_AFTER_RUN`

## Scope boundary

Phase192 does not touch credentials, tokens, paid services, GitHub security settings, or external provider configuration.

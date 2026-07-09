# Phase 197 — Full Autopilot JSON to Remote Truth Closeout Proof v1

## Purpose

Phase197 proves true full autopilot from a fresh command JSON to `CLOSED_CLEANLY` with no manual rescue.

The proof path is:

`fresh command JSON -> watcher -> saved ChatGPT target -> prompt submit -> exact ZIP download -> SHA verification -> verifier -> QA -> merge -> push main -> push tag -> remote main verification -> remote tag verification -> final CLOSED_CLEANLY`.

## Phase196 trusted baseline

Phase196 trusted baseline commit: `7a060e9eb81af79b37b581ca9147b36869866e17`.

Phase196 trusted baseline tag: `phase-196-closeout-integrity-remote-truth-gate-v1`.

Phase197 verifier checks that `origin/main` remains at the Phase196 trusted baseline before Phase197 closeout and that current `HEAD` descends from that baseline.

## What Phase197 adds

- Phase-specific verifier: `scripts/verify-phase197-full-autopilot-json-to-remote-truth-closeout-proof-v1.ps1`.
- Phase-specific QA: `scripts/qa-phase197-full-autopilot-json-to-remote-truth-closeout-proof-v1.ps1`.
- Full-autopilot remote truth gate: `scripts/sera-full-autopilot-json-to-remote-truth-closeout-proof-v1.ps1`.
- Fixture proof runner: `scripts/phase197-full-autopilot-json-to-remote-truth-closeout-proof-fixtures-v1.ps1`.
- Fixture cases proving all gates are required before `CLOSED_CLEANLY`.
- Overlay manifest and `.sera-proof` evidence.

## Required final handoff identity

The final handoff must include local HEAD, remote main, local tag commit, remote tag commit, verifier handoff, QA handoff, exact ZIP SHA256, expected ZIP filename, and `ManualRescueUsed: false`.

## Markers

- `PHASE197_FULL_AUTOPILOT_REMOTE_TRUTH_CLOSEOUT_PROOF`
- `PHASE197_NO_MANUAL_RESCUE_CLOSED_CLEANLY`
- `PHASE197_PHASE196_TRUSTED_BASELINE_VERIFIED`
- `PHASE197_FINAL_HANDOFF_IDENTITY_VERIFIED`

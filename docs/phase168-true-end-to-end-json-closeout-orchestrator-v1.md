# Phase168 - True End-to-End JSON-to-CLOSED_CLEANLY Orchestrator v1

## Purpose

Phase168 turns the successful Phase167 helper-runner proof into a production-ready orchestration pattern. It is designed to test and document the complete path from one command JSON through `REQUEST_READY`, exact ZIP detection, apply queueing, QA Guarantee, safe merge approval, clean closeout, and final clipboard handoff capture.

## Phase Identity

- Phase: 168
- Phase slug: `phase168_true_end_to_end_json_closeout_orchestrator_v1`
- Phase name: `s.e.r.a_phase168_true_end_to_end_json_closeout_orchestrator_v1_overlay`
- Work branch: `work/phase168-true-end-to-end-json-closeout-orchestrator-v1`
- Tag: `phase-168-true-end-to-end-json-closeout-orchestrator-v1`
- Expected ZIP: `s.e.r.a_phase168_true_end_to_end_json_closeout_orchestrator_v1_overlay.zip`

## What This Overlay Adds

- A reusable orchestrator script: `scripts/sera-json-to-closed-cleanly-orchestrator-v1.ps1`.
- A Phase168 verifier.
- A Phase168 QA Guarantee script.
- A read-only status script.
- A machine-readable proof contract.
- Overlay documentation and manifest files.

## Required End-to-End Behavior

The orchestrator is expected to perform or guard the following sequence:

1. Confirm the repo is clean on `main`.
2. Confirm the active artifact request is for the expected phase and exact ZIP.
3. Confirm the exact ZIP exists in `13_chatgpt_downloads`.
4. Queue only that exact ZIP into `01_apply_approved`.
5. Start the AutoOps runner.
6. Wait for a fresh same-phase apply packet.
7. Treat `PASS` as useful but not merge eligible.
8. Run or confirm QA Guarantee.
9. Move merge approval only after `PASS_GUARANTEED`.
10. Start closeout.
11. Ignore `PASS` and `PASS_GUARANTEED` while waiting for `CLOSED_CLEANLY`.
12. Copy the final handoff or a diagnostic report to clipboard.

## Hard Stops

- `PASS` is not merge eligible.
- `PASS_GUARANTEED` is merge eligible.
- `CLOSED_CLEANLY` is phase complete.
- Stale handoffs from prior phases must not satisfy same-phase gates.
- Merge approval must never move before `PASS_GUARANTEED`.
- Exact ZIP targeting must reject random recent downloads.
- This phase avoids credentials, tokens, paid services, dependency installs, security-setting changes, and startup persistence.

## Operator Notes

Phase168 is the bridge from a successful controlled helper proof to a repeatable production-level loop. The immediate test should still be watched, but the expected outcome is a much smaller owner role: create the JSON, save the ZIP, run the orchestrator, and paste the copied final output.

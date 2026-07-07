# Phase 191 — Full Autopilot From Beginning Proof

Phase slug: `phase191_full_autopilot_from_beginning_proof_v1`

Expected ZIP: `s.e.r.a_phase191_full_autopilot_from_beginning_proof_v1_overlay.zip`

## Purpose

This overlay is a safe proof packet for confirming S.E.R.A. can run the complete autopilot sequence after Phase190. It intentionally avoids new dependencies, credential changes, paid services, scheduled task changes, and random/new ChatGPT fallback.

## Required Flow

1. Command JSON is detected by the watcher.
2. Exact Phase191 ZIP is downloaded or found.
3. Saved ChatGPT target is captured/verified.
4. Direct closeout applies this overlay.
5. Verifier writes fresh `VERIFY_PASS`.
6. QA writes fresh `PASS_GUARANTEED`.
7. Final handoff identity is validated before merge.
8. Pasteback proves `PASTEBACK_POSTED_TEXT_MATCH`.
9. Merge/tag/push/cleanup occur only after pasteback proof.
10. Phase191 writes `CLOSED_CLEANLY`.
11. Watcher returns to watching.

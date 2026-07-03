# Phase167 - Full Autopilot Loop Proof v1

## Purpose

Phase167 proves that the merged Phase166 unified phone JSON-to-closeout path can run from one fresh command JSON through request generation, exact ZIP wait, overlay apply, QA Guarantee, merge approval gating, and clean closeout without stale handoff contamination.

## Phase Identity

- Phase: 167
- Phase slug: `phase167_full_autopilot_loop_proof_v1`
- Phase name: `s.e.r.a_phase167_full_autopilot_loop_proof_v1_overlay`
- Work branch: `work/phase167-full-autopilot-loop-proof-v1`
- Tag: `phase-167-full-autopilot-loop-proof-v1`
- Expected ZIP: `s.e.r.a_phase167_full_autopilot_loop_proof_v1_overlay.zip`

## What This Overlay Adds

- A Phase167 verifier.
- A Phase167 QA Guarantee script.
- A read-only Phase167 status script.
- A machine-readable proof contract.
- Overlay documentation and manifest files.

## Success Criteria

Phase167 is successful when the following are all true:

1. Phase166 has a `CLOSED_CLEANLY` handoff on `main`.
2. Phase167 command JSON produces a `REQUEST_READY` artifact.
3. The artifact request points to the exact expected ZIP filename.
4. The generated prompt includes Phase 167 and the exact expected ZIP filename.
5. The overlay applies on a Phase167 work branch.
6. The verifier passes.
7. The QA Guarantee script writes a `PASS_GUARANTEED` packet and a `MERGE_PENDING` approval file.
8. Merge approval remains owner-gated.
9. Closeout only proceeds after `PASS_GUARANTEED`.
10. The next phase only begins after `CLOSED_CLEANLY`.

## Hard Stops

- `PASS` is not merge eligible.
- `PASS_GUARANTEED` is merge eligible.
- `CLOSED_CLEANLY` is phase complete.
- A stale handoff from another phase must not satisfy a Phase167 gate.
- Missing, malformed, or mismatched request artifacts must block QA Guarantee.
- This phase does not add credentials, tokens, paid services, dependency installs, security-setting changes, or startup persistence.

## Operator Notes

This phase is intentionally proof-focused. It strengthens observability and state tracking rather than expanding capability scope. The goal is to prove the full loop with minimal owner work while preserving approval gates.

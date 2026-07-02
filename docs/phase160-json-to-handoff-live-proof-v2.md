# Phase 160 — JSON to Handoff Live Proof v2

## Purpose

Phase 160 proves the owner-facing S.E.R.A. AutoOps runtime path after R159: a JSON command becomes a fresh canonical ChatGPT artifact request, the saved ChatGPT target is used, the exact overlay ZIP is downloaded to `13_chatgpt_downloads`, the ZIP is routed to `01_apply_approved`, and the system produces a PASS, BLOCKED, or CLOSED_CLEANLY handoff suitable for ChatGPT review.

This phase exists because Phase 158 and the first Phase 160 attempt proved that failures must become shareable handoffs. The current proof must validate both success and failure behavior without relying on stale Phase143 requests, stale browser evidence, or old ZIP candidates.

## Expected ZIP

`s.e.r.a_phase160_json_to_handoff_live_proof_v2_overlay.zip`

## Runtime Acceptance Path

1. A JSON command is present in `00_control_center\command_inbox`.
2. The command creates a fresh canonical prompt in `15_bridge_outbox`.
3. The command creates `00_control_center\artifact-watch-request.json` for the current expected ZIP.
4. The request freshness guard confirms the active request and prompt file both contain `s.e.r.a_phase160_json_to_handoff_live_proof_v2_overlay.zip`.
5. The bridge uses only the saved ChatGPT target.
6. The exact ZIP lands in `13_chatgpt_downloads`.
7. The exact ZIP routes into `01_apply_approved`.
8. AutoOps produces PASS, BLOCKED, or CLOSED_CLEANLY.
9. The handoff is copied or surfaced for ChatGPT continuation, hotfix, or merge approval.

## BLOCKED Rules

Phase 160 must produce a BLOCKED handoff and stop when any of these occur:

- `artifact-watch-request.json` is missing.
- The active artifact request references a stale phase or wrong expected ZIP.
- The prompt file references a stale phase or wrong expected ZIP.
- Browser evidence is stale or does not match the current expected ZIP.
- The exact ZIP does not land in `13_chatgpt_downloads`.
- The ZIP in `13_chatgpt_downloads` does not exactly match `s.e.r.a_phase160_json_to_handoff_live_proof_v2_overlay.zip`.
- The AutoOps runner would start before the exact ZIP exists.
- Owner judgment is required.

## Safety Guardrails

- Saved ChatGPT target only.
- No random recent-chat fallback.
- No new-chat fallback.
- No credentials, tokens, paid services, GitHub security/settings changes, owner-control boundary changes, self-merge, or production deployment.
- Do not continue after BLOCKED.
- Require CLOSED_CLEANLY before continuation.

## Operator Notes

This phase is a runtime proof. Standalone `npm test` is not required for acceptance. The proof should focus on live evidence: request freshness, exact ZIP acquisition, routing, and handoff production.

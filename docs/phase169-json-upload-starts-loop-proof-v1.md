# Phase169 - JSON Upload Starts Loop Proof v1

## Purpose

Phase169 proves the loop can begin from a user-provided JSON file placed into `command_inbox`, generate `REQUEST_READY`, target the exact overlay ZIP, continue through apply, run verifier and QA Guarantee, move merge approval only after `PASS_GUARANTEED`, close cleanly, and copy the final handoff or diagnostics to clipboard.

## Phase Identity

- Phase: 169
- Phase slug: `phase169_json_upload_starts_loop_proof_v1`
- Phase name: `s.e.r.a_phase169_json_upload_starts_loop_proof_v1_overlay`
- Work branch: `work/phase169-json-upload-starts-loop-proof-v1`
- Tag: `phase-169-json-upload-starts-loop-proof-v1`
- Expected ZIP: `s.e.r.a_phase169_json_upload_starts_loop_proof_v1_overlay.zip`
- Expected command JSON: `autopilot-command-phase169_json_upload_starts_loop_proof_v1.json`

## Proven Sequence

This phase covers the following end-to-end markers:

1. `command_inbox` receives a user-provided JSON file.
2. The JSON contract includes `savedChatGptTargetOnly: true`, `allowRandomRecentChatFallback: false`, and `allowNewChatFallback: false`.
3. The merged unified loop reads the JSON and creates `REQUEST_READY`.
4. The generated prompt targets the exact ZIP: `s.e.r.a_phase169_json_upload_starts_loop_proof_v1_overlay.zip`.
5. The loop emits `WAITING_FOR_ZIP` when the artifact is not present.
6. The exact ZIP is placed in `13_chatgpt_downloads`.
7. `ZIP_READY_FOR_APPLY` queues the exact ZIP into `01_apply_approved`.
8. The overlay is applied on the correct work branch.
9. `PASS` is treated as useful but not merge eligible.
10. The verifier passes.
11. QA Guarantee creates `PASS_GUARANTEED`.
12. Safe merge approval moves only after `PASS_GUARANTEED`.
13. Closeout waits only for `CLOSED_CLEANLY` and ignores `PASS` or `PASS_GUARANTEED` while waiting.
14. The final handoff or diagnostics are copied to `CURRENT_CHATGPT_HANDOFF.md` and the clipboard.

## Observed Runner Gap

The first Phase169 watch confirmed the JSON file was present and valid, then started the VBS production runner. The VBS runner did not produce `REQUEST_READY`. A direct merged unified `RunOnce` from the uploaded JSON did produce `REQUEST_READY` and `WAITING_FOR_ZIP`.

That means Phase169 proves the JSON input contract and unified-loop request path. The remaining production hardening target is the scheduled/VBS runner pickup path:

`uploaded JSON in command_inbox -> VBS runner -> unified RunOnce -> REQUEST_READY`

## Acceptance Criteria

- Phase168 is already `CLOSED_CLEANLY`.
- A user-provided JSON starts the Phase169 request path.
- The exact ZIP name is preserved from JSON to request artifact.
- The generated prompt is copied for owner paste.
- The exact ZIP is the only accepted artifact.
- Apply succeeds and produces a same-phase handoff.
- `PASS_GUARANTEED` is required before merge approval.
- `CLOSED_CLEANLY` is required before the phase is complete.

## Safety Boundaries

This phase avoids credentials, tokens, paid services, dependency installs, security setting changes, startup persistence, and uncontrolled browser automation.

## Next Hardening Candidate

Phase170 should focus specifically on the VBS/scheduled production runner pickup gap discovered here, because the unified loop path works when invoked directly.

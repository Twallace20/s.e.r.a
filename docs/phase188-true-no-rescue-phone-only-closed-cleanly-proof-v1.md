# Phase188 — True No-Rescue Phone-Only Closed Cleanly Proof v1

## Purpose

Phase188 turns the post-Phase187 full loop into a stricter autopilot queue path. The intended operator workflow is now:

```text
upload/save autopilot-command JSON
-> 13_chatgpt_downloads router or command_inbox pickup
-> watcher processes one phase at a time
-> REQUEST_READY
-> ChatGPT browser bridge submits the prompt
-> exact overlay ZIP download
-> direct ZIP closeout
-> verifier
-> QA PASS_GUARANTEED
-> pasteback
-> safe merge/tag/push/cleanup
-> CLOSED_CLEANLY or BLOCKED handoff
```

## What this phase adds

- Sequential queue state under `00_control_center/state/autopilot-sequential-phase-queue-v1.json`.
- Queue event log under `00_control_center/state/autopilot-sequential-phase-queue-events-v1.jsonl`.
- Single-run lock under `00_control_center/state/autopilot-sequential-phase-run-lock-v1.json`.
- Blocked pause state under `00_control_center/state/autopilot-sequence-paused-after-block-v1.json`.
- A status command: `SERA_AUTOPILOT_QUEUE_STATUS.ps1`.
- Watcher-side final handoff classification for `CLOSED_CLEANLY` and `BLOCKED`.
- A generated `BLOCKED` handoff if the loop fails before direct closeout writes one.
- A downstream halt when a phase blocks, so later unrelated phase JSONs do not run ahead of the current branch.

## Safety boundaries

This phase does not add scheduled tasks, services, login startup changes, credentials, tokens, paid services, dependency installs, security setting changes, or uncontrolled browser fallback.

The watcher remains launched by the existing approved watcher runner. This phase only hardens the foreground watcher logic that the runner calls.

## Required markers

- `COMMAND_JSON_ROUTED_FROM_DOWNLOADS13`
- `NEW_COMMAND_JSON_DETECTED`
- `REQUEST_READY`
- `ZIP_READY`
- `RUN_DIRECT_ZIP_CLOSEOUT`
- `AUTOPILOT_RUN_LOCK_ACQUIRED`
- `AUTOPILOT_SEQUENCE_HALTED_ON_BLOCKED`
- `PHASE188_BLOCKED_HANDOFF_WRITTEN`
- `PASTEBACK_POSTED_TEXT_MATCH`
- `CLOSED_CLEANLY`
- `BLOCKED`

## Operator note

If a phase blocks, upload a repair/unblock JSON for that same phase or a command with `unblockPhaseSlug`, `allowWhileBlocked: true`, or a `commandId` containing `hotfix`, `repair`, or `unblock`. The watcher will keep unrelated downstream phases paused until the blocked phase is repaired.


## Phase188 compatibility correction

This overlay also includes PhaseToken alias scripts for direct-closeout legacy helper compatibility:

- `scripts/verify-true-no-rescue-phone-only-closed-cleanly-proof-v1.ps1` wraps the phase-prefixed verifier.
- `scripts/true-no-rescue-phone-only-closed-cleanly-proof-v1.ps1` wraps the phase-prefixed QA script.

This prevents a blocked direct closeout when a legacy helper derives verifier/QA paths from the phase token without the `phase188-` prefix.

# Phase 143 — Phone Batch Autopilot Smoke Test v1

## Purpose

Phase 143 proves the first controlled phone-to-AutoOps batch workflow after the Phase 141 and Phase 142 recovery work. It is a guarded smoke test, not a full unattended-autopilot release.

The test exists because prior phases showed that the system can recover from BLOCKED packets and close them cleanly, but true phone batching still needs explicit proof around one-active-command locking, stop-on-blocked behavior, and continuation handling.

## Scope

Phase 143 covers:

1. Phone-submitted command intake.
2. One active command at a time.
3. Batch JSON shape for one or more phases.
4. Stop-on-BLOCKED behavior.
5. CLOSED_CLEANLY required before the next phase can continue.
6. BLOCKED handoff as the required continuation input.
7. No random recent-chat fallback.
8. No new-chat fallback.
9. Saved ChatGPT target only.
10. Evidence capture for download/routing/manual-route state.

## Guardrails

The smoke test is valid only when all of these stay true:

- `allowRandomRecentChatFallback` is false.
- `allowNewChatFallback` is false.
- Only the saved ChatGPT target is allowed.
- No credentials, tokens, paid services, external account changes, GitHub security/settings changes, owner-control boundary changes, self-merge, or production deployment.
- Only one active command may run.
- If a phase blocks, the queue pauses.
- The next phase cannot start until the current phase is CLOSED_CLEANLY.
- Unexpected browser behavior pauses the workflow for owner judgment.

## Recommended Phase 143 Batch Shape

```json
{
  "schemaVersion": 1,
  "commandId": "phase143-phone-batch-autopilot-smoke-test-001",
  "commandStatus": "new",
  "status": "new",
  "enabled": true,
  "mode": "phase_batch",
  "phases": [143],
  "phaseStart": 143,
  "phaseEnd": 143,
  "maxPhases": 1,
  "stopOnBlocked": true,
  "requireClosedCleanlyBeforeNext": true,
  "oneActiveCommandOnly": true,
  "allowRandomRecentChatFallback": false,
  "allowNewChatFallback": false,
  "savedChatGptTargetOnly": true,
  "expectedZipFilename": "s.e.r.a_phase143_phone_batch_autopilot_smoke_test_v1_overlay.zip"
}
```

## PASS Criteria

Phase 143 passes when evidence shows:

- The phone-submitted command was accepted.
- No second command was allowed to run concurrently.
- The phase either produced a normal PASS/CLOSED_CLEANLY path or produced a BLOCKED packet that paused the queue.
- If BLOCKED, the queue did not continue.
- If CLOSED_CLEANLY, continuation is allowed only after closeout.
- No fallback to random recent chat or new chat occurred.
- Download/routing state was captured.
- A handoff packet was produced.

## BLOCKED Criteria

Phase 143 must block if:

- More than one active command exists.
- A stale handoff is used to complete a fresh command.
- A phase tries to continue after BLOCKED.
- Browser generation duplicates/resubmits.
- Download completion cannot be proven.
- Expected ZIP filename does not match.
- The repo is dirty before a branch action.
- Extraction/manifest lookup fails.
- Owner judgment is required.

## Operator Notes

This phase should be run in the smallest possible batch first: one phase only. After a clean proof, later phases can expand to 2–3 phase batches with the same stop-on-blocked and closed-cleanly-before-next rules.

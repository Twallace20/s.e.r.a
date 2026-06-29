# Phase 132 — Phone Autopilot Real-Life Proof Harness v1

## Purpose

Phase 132 repairs the real-life phone autopilot path discovered during the Phase 132 phone test:

- The phone command reached `running`.
- The watcher tried to invoke the phone job.
- Windows path handling produced a malformed `C:\C:\...` path.
- The command stayed `running` without a handoff.

## Changes

- Replaces URL pathname based script path resolution with `fileURLToPath(import.meta.url)` for Windows-safe repo root detection.
- Keeps the phone watcher on the two-minute cadence.
- Ensures invalid JSON files in `command_inbox` are quarantined individually instead of blocking the whole queue.
- Converts phone job launch exceptions into normal blocked command outcomes, so the JSON does not remain stuck at `running`.
- Keeps command files moving through the lifecycle: `new`, `accepted`, `running`, `complete`, `blocked`, `ignored`.

## Real-life acceptance test

The required proof is not only that code runs. The proof is that an owner-created phone command is saved to OneDrive and the laptop watcher moves it forward:

1. Save a new `autopilot-command*.json` file from the phone.
2. Confirm the file starts as `commandStatus: "new"`.
3. Let the scheduled watcher pick it up.
4. Confirm the file moves to `accepted` and then `running`.
5. Confirm a real handoff decides the final status.
6. Confirm the JSON becomes `complete` only for `CLOSED_CLEANLY`, or `blocked` for a blocked/missing handoff.

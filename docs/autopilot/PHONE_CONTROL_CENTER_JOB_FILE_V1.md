# Phone Control Center Job File v1

Phase 128 replaces phone-unfriendly run flag creation with a single permanent JSON command file.

## Owner file

The live file lives in OneDrive:

```text
SERA-AutoOps/00_control_center/autopilot-command.json
```

The repo includes a template at:

```text
00_control_center_templates/autopilot-command.example.json
```

## Phone workflow

From the phone, edit `autopilot-command.json`:

```json
{
  "enabled": true,
  "action": "run_range",
  "phaseStart": 129,
  "phaseEnd": 130,
  "maxPhases": 2,
  "guide": "Continue guarded autopilot hardening. Use exact Download Phase X overlay ZIP link text. Preserve saved ChatGPT target only. Stop on blocked, unclear, risky, or owner-decision work.",
  "pauseAfterCurrentPhase": false,
  "emergencyStop": false
}
```

Then the laptop runs:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-phone-control-job.ps1 -Run
```

## Safety rules

- Phone ranges are capped at five phases.
- The saved ChatGPT target remains required.
- New-chat and random-recent-chat fallback remain disabled.
- Stop and pause controls are represented in the same JSON file.
- A processed command signature is recorded to reduce accidental repeat runs.
- Status is written to `AUTOPILOT_STATUS.md` for phone review.

## Long-term scheduled plan

Phase 129 should install a lightweight scheduled phone-control watcher. That watcher should wake every few minutes, read `autopilot-command.json`, and call `sera-phone-control-job.ps1 -Run` only when there is a valid, enabled, unprocessed command.

Phase 130 should add browser visibility checks and a single-runner lock so covered windows, minimized browser sessions, and log-file contention do not create false failures.

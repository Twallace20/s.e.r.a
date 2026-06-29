# Phone Autopilot End-to-End Orchestrator v1

Phase 131 upgrades phone control from command detection into an end-to-end guarded workflow.

## What changed

- The phone watcher checks command files every two minutes when installed with the default schedule.
- The watcher scans both `00_control_center/autopilot-command.json` and `00_control_center/command_inbox/autopilot-command*.json`.
- Only commands with `enabled: true` and `commandStatus: "new"` are eligible to run.
- The same JSON file is updated automatically as it is used.
- Commands now move through the lifecycle: `new → accepted → running → complete` or `blocked`.
- Stale accepted/running commands are detected and marked blocked with `blockedReason` instead of silently sitting forever.
- `00_control_center/AUTOPILOT_STATUS.md` surfaces command ID, command file, runner result, latest handoff, and evidence path.

## End-to-end completion rule

A phone command is complete only when the delegated runner produces a `CLOSED_CLEANLY` handoff for the requested phase range and exits successfully.

A command is blocked when the runner fails, the latest handoff is `BLOCKED`, a final handoff is missing, or the command stays accepted/running beyond the safe timeout.

## Two-minute schedule

After this overlay is applied, refresh the local scheduled task with:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-phone-control-scheduled-watcher.ps1 -Install -EveryMinutes 2 -RunOnce
```

## Real-life test requirement

The feature is considered proven only when the owner saves a command JSON from the phone, S.E.R.A. moves it beyond `accepted` into `running`, and then records either `complete` or `blocked` based on actual handoff output.

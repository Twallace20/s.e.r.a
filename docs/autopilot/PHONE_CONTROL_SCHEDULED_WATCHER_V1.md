# Phone Control Scheduled Watcher v1

This document describes the long-term phone-to-laptop control loop for S.E.R.A.

## Intended owner flow

From the phone, edit:

```text
OneDrive/SERA-AutoOps/00_control_center/autopilot-command.json
```

Set `enabled` to `true`, set `action` to `run_range`, then choose a bounded phase range. The scheduled laptop watcher checks the file every few minutes and starts the bounded run automatically.

## Scheduled task

Task name:

```text
SERA Phone Control Watcher
```

Install command:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-phone-control-scheduled-watcher.ps1 -Install -EveryMinutes 5 -RunOnce
```

Status command:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-phone-control-scheduled-watcher.ps1 -Status
```

Uninstall command:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-phone-control-scheduled-watcher.ps1 -Uninstall
```

## Guardrails

- The watcher uses a lock file to prevent duplicate instances.
- The scheduled task uses `MultipleInstances IgnoreNew`.
- The watcher delegates actual bounded work to the Phase 128 phone-control job script.
- The watcher writes phone-readable status to `AUTOPILOT_STATUS.md`.
- The watcher respects `pauseAfterCurrentPhase`, `emergencyStop`, and `action: stop`.
- The watcher preserves saved ChatGPT target only and does not add fallback behavior.

## Status file

Read this from the phone:

```text
OneDrive/SERA-AutoOps/00_control_center/AUTOPILOT_STATUS.md
```

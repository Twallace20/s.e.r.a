# Phase 129 — Phone Control Scheduled Watcher v1

Phase 129 adds a scheduled laptop checker for the permanent phone-editable `00_control_center/autopilot-command.json` command file introduced in Phase 128.

The watcher is intentionally small: it reads the command file, uses a lock to avoid duplicate execution, and delegates bounded runs to the existing Phase 128 phone-control job script.

## Completion Criteria

- `scripts/sera-phone-control-scheduled-watcher.mjs` exists.
- `scripts/sera-phone-control-scheduled-watcher.ps1` can install, uninstall, run once, and report status.
- The watcher writes `00_control_center/AUTOPILOT_STATUS.md`.
- The watcher respects pause, stop, and emergency stop fields.
- The watcher does not create any new ChatGPT target fallback behavior.

## First install command after merge

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-phone-control-scheduled-watcher.ps1 -Install -EveryMinutes 5 -RunOnce
```

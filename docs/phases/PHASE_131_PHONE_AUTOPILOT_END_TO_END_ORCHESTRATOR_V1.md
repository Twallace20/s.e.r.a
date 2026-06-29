# Phase 131 — Phone Autopilot End-to-End Orchestrator v1

## Purpose

Turn phone-saved JSON commands into a complete guarded autopilot workflow, not just a detected command.

## Success criteria

- `autopilot-command.json` remains supported.
- `command_inbox/autopilot-command*.json` remains supported.
- Watcher default schedule is two minutes.
- New commands are accepted and immediately moved to running when the runner starts.
- Final command state is based on handoff evidence.
- Missing handoff blocks the command.
- Latest handoff path appears in `AUTOPILOT_STATUS.md`.
- Stale accepted/running commands are reconciled or blocked.
- A simulated e2e proof verifies lifecycle progression without relying on brittle browser state during unit verification.

## Safety

The delegated autopilot still uses existing S.E.R.A. gates. It preserves the saved ChatGPT target and does not enable random or new-chat fallback.

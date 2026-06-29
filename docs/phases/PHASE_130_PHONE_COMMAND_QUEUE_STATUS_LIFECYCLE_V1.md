# Phase 130 — Phone Command Queue + Status Lifecycle v1

## Purpose

Create a phone-friendly command queue so owner commands can be submitted as JSON files, consumed exactly once, and updated automatically with a visible lifecycle.

## Adds

- `00_control_center/command_inbox` workflow support.
- Support for `autopilot-command*.json` files.
- `commandId` and `commandStatus` lifecycle fields.
- Command lifecycle: `new`, `accepted`, `running`, `complete`, `blocked`, `ignored`.
- Automatic status update on the same JSON file after S.E.R.A. uses it.
- Single-runner lock to reduce overlapping runner/log-file conflict risk.
- Phone-readable status output in `AUTOPILOT_STATUS.md`.

## Acceptance

A command file with `enabled: true` and `commandStatus: "new"` is selected by the watcher, passed to the phone-control job, updated through its lifecycle, and finally marked `complete` or `blocked`.

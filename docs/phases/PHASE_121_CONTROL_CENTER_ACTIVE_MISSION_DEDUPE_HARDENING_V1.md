# Phase 121 — Control Center Active Mission + Dedupe Hardening v1

## Purpose

Make scheduled artifact watching safe for full guarded autopilot by requiring an active control-center artifact request and preventing stale completed phase prompts from being reprocessed.

## Scope

- Harden JSON reading against BOM/UTF-16 control files.
- Update autopilot PowerShell state writes to UTF-8 without BOM.
- Require `00_control_center/artifact-watch-request.json` for scheduled watcher operation.
- Stop watcher fallback to arbitrary newest outbox prompt.
- Detect `CLOSED_CLEANLY` handoffs before routing duplicate artifacts.
- Have the autopilot loop write the active artifact request when it creates a phase prompt.

## Expected Outcome

The scheduled watcher can stay installed without reprocessing old Phase 119/120 prompts. It waits for the control center to declare the active expected artifact, then routes only that artifact.

# Control Center Active Mission + Dedupe Hardening

Phase 121 tightens the relationship between the ChatGPT Artifact Watcher and the `00_control_center`.

## Problem Closed

The Phase 120 watcher was functional, but when installed as a scheduled task it could choose the newest prompt in `15_bridge_outbox`. That made stale prompts eligible for reprocessing after a phase had already closed.

## New Rule

The scheduled watcher does not act on the newest prompt by default. It only acts when the control center has an active artifact request:

`00_control_center/artifact-watch-request.json`

If there is no active request, the watcher exits cleanly with `idle_no_active_artifact_request`.

## Dedupe Rules

The watcher now checks for an existing `CLOSED_CLEANLY` handoff for the expected ZIP/phase before routing or redownloading. If the phase is already closed, it records `already_closed_cleanly` and does not route the artifact again.

## JSON Hardening

The loop and watcher read JSON through a decoder that tolerates UTF-8 BOM and UTF-16/PowerShell-written files. The PowerShell autopilot wrapper writes `autopilot-state.json` as UTF-8 without BOM.

## Owner Safety

Stop, pause, owner-control, and saved-target-only rules remain intact. The watcher still fails closed when routing is unclear or owner judgment is required.

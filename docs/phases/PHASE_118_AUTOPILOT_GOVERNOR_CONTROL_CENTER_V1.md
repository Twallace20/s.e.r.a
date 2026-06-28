# Phase 118 — Autopilot Governor + 00 Control Center v1

Phase 118 establishes the owner-controlled governance layer for S.E.R.A.'s guarded autopilot.

## Purpose

The previous phases proved the bridge can submit to the saved ChatGPT thread, identify the artifact download control, download the ZIP into AutoOps, route the package, validate it, and close cleanly after owner-approved merge. Phase 118 turns those pieces into an explicit control plane.

## Adds

- `00_control_center` runtime contract.
- Dynamic ChatGPT target file support through `00_control_center/chatgpt-target.json`.
- Stop and pause files for immediate owner control.
- Phase mission and phase range files.
- Service registry describing bridge, router, runner, and merge approver responsibilities.
- A local governor status command that fails closed when stop, pause, or needs-attention conditions exist.
- Bridge fallback from the new control-center target file to the legacy browser helper target file.

## Safety behavior

The governor is guarded by default. It initializes control files and reports status; it does not self-approve risky work. It requires the saved ChatGPT target URL and preserves the no-random-chat and no-new-chat-fallback rules.

## Suggested use

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-control-center-init.ps1
node scripts/sera-autopilot-governor.mjs --init
```

The owner may enable controlled continuation by editing `00_control_center/autopilot-state.json` after verifying the current target URL and phase range.

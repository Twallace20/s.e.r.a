# S.E.R.A. 00 Control Center Contract

The control center lives in the AutoOps root at `00_control_center` and acts as the owner-facing control plane for guarded autopilot.

## Required files

- `autopilot-state.json` — guarded autopilot mode, enabled flag, phase range, limits, and safety defaults.
- `chatgpt-target.json` — saved ChatGPT thread URL and CDP endpoint. This supersedes the legacy `12_browser_helper_state/chatgpt-bridge-target.json` when present.
- `phase-mission.json` — current mission and allowed phase range.
- `directives.md` — owner-readable operating rules.
- `service-registry.json` — bridge, router, runner, and merge approver roles.

## Stop and pause

- `stop.flag` stops autopilot immediately.
- `pause.flag` pauses bridge submission/download and continuation.
- Legacy pause path `pause/PAUSE_AUTOPILOT.txt` remains supported.

## Guardrails

S.E.R.A. must use the saved ChatGPT target only. It must not select random recent chats, use a new-chat fallback, or proceed through unclear risk. Needs-attention files pause continuation when `stopOnNeedsAttention` is true.

## Safe auto-merge

Safe auto-merge may run only through the existing owner-approval-file path. It does not remove owner approval for risky work.

# Control Center Handoff Reconciler + Next Phase Resolver

Phase 122 makes the control center the source of truth for continuation decisions.

## Contract

- Scan `06_handoff` for the latest `CLOSED_CLEANLY` phase.
- Update `00_control_center/phase-mission.json` with `currentPhase` and `nextPhase`.
- Archive stale `artifact-watch-request.json` entries for phases already closed cleanly.
- Preserve owner stop, pause, and needs-attention behavior.
- Copy the legacy saved ChatGPT target into `00_control_center/chatgpt-target.json` if the control-center target is missing.
- Prevent the watcher from reprocessing completed phases when old prompts or ZIPs remain in AutoOps folders.

## Decision model

`CLOSED_CLEANLY` advances to the next phase. `BLOCKED` stops for diagnosis or repair. Existing old artifacts are ignored when their phase number is already at or behind the latest closed phase.

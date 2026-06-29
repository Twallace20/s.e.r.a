# Closed Phase Reprocessing Guard v1

Phase 127 prevents a phase that already has a trusted `CLOSED_CLEANLY` handoff from being processed again.

## Contract

- Before creating a new prompt, the autopilot loop checks for an exact closed handoff for that phase.
- Before routing an artifact, the watcher checks whether the target phase is already closed.
- Duplicate artifacts for already closed phases are archived instead of being routed or applied.
- The repair loop sanitizes owner-control boilerplate before classifying a blocked evidence packet.
- The guard writes JSON evidence into `00_control_center/evidence`.

## Operator result

A duplicate artifact for a closed phase should produce `already_closed_cleanly` or an archive record, not a new work branch or a post-close blocked packet.

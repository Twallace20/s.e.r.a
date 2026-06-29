# Phase 126 — Artifact Download Routing Idempotency v1

Status: overlay-ready

This phase hardens S.E.R.A. autopilot around artifact download and routing repeatability. It adds idempotent behavior to the ChatGPT bridge, routes normal overlays consistently, and makes the autopilot loop prefer the artifact watcher instead of submitting the same request in parallel.

## Acceptance criteria

- ZIP root is `repo/`.
- Bridge skips prompt submission when the matching artifact link is already visible.
- Normal overlays route to `01_apply_approved`.
- Hotfix overlays require a work branch before routing to `02_hotfix_approved`.
- Autopilot preserves saved-target-only behavior.
- Safety gates remain in force.

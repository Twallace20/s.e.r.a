# Phase 122 — Control Center Handoff Reconciler + Next Phase Resolver v1

## Purpose

Make S.E.R.A. advance dynamically from handoffs instead of reusing stale active requests, old prompts, or old artifacts.

## Adds

- `scripts/sera-control-center-reconcile.mjs`
- `scripts/sera-control-center-reconcile.ps1`
- hardened `sera-autopilot-loop.mjs`
- hardened `sera-chatgpt-artifact-watcher.mjs`
- updated `sera-autopilot-continue.ps1`

## Safety

This phase does not install dependencies, change secrets, mutate paid services, or change GitHub security settings. It preserves saved-thread-only behavior and fail-closed behavior.

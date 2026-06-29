# Phase 124 — Autopilot Directive Control Center v1

## Purpose

Add a direct owner control layer for S.E.R.A. guarded autopilot so the owner can start, stop, pause, resume, guide, and run bounded phase ranges from a phone or laptop.

## Included

- `scripts/sera-autopilot-directive.mjs`
- `scripts/sera-autopilot-directive.ps1`
- Updated `scripts/sera-autopilot-loop.mjs` with directive/range/status support.
- Updated `scripts/sera-autopilot-continue.ps1` with optional range/directive arguments.
- Phone-friendly status and directive file format documentation.

## Safety

The phase preserves the existing saved-target-only ChatGPT policy and fail-closed behavior. Pause and stop controls are honored before starting another phase. Owner judgment remains required for risky, unclear, or blocked work.

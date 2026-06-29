# Phase 125 — Blocked Phase Hotfix Overlay Protocol v1

## Purpose

Create a standard, guarded repair loop for blocked phases using hotfix overlay ZIPs as the default mechanism.

## Adds

- A phase-aware hotfix request generator.
- A latest-blocked repair helper for manual or automated use.
- Hotfix request state written to `00_control_center`.
- Hotfix prompts written to `15_bridge_outbox`.
- Integration points for the autopilot loop to use the generated hotfix prompt.
- Retry-after-hotfix behavior for the original blocked phase.
- Clear owner-required stop conditions.

## Safety

The protocol preserves saved-target-only ChatGPT operation, does not add random/new-chat fallback, and does not approve risky repairs. When the blocked evidence is unclear or points to owner-only areas, it writes needs-attention and stops.

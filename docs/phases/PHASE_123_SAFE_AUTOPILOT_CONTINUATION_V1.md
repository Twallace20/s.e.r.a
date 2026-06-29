# Phase 123 — Safe Autopilot Continuation v1

## Status

Overlay package for guarded autopilot continuation.

## Purpose

Allow the Phase 123 autopilot proof to continue when ChatGPT normalizes the visible URL for the same saved S.E.R.A. conversation.

## Acceptance Criteria

- ZIP root is `repo/`.
- `.overlay` manifest is included.
- `.sera-proof` verification file is included.
- JavaScript files pass `node --check`.
- The bridge preserves the saved target only and refuses fallback behavior.
- The bridge can match a saved ChatGPT target by conversation id when the URL slug differs.

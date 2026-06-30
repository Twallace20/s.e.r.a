# Phase 138 Safe Autopilot Continuation v1 — Hotfix Attempt 1

## Status

Hotfix overlay for a recoverable Phase 138 blocked state.

## Blocked Evidence

`CHATGPT_ARTIFACT_WATCHER_NEEDS_ATTENTION-20260630_150656Z.md`

Reason:

`Max watcher attempts reached for s.e.r.a_phase138_phase_138_safe_autopilot_continuation_v1_overlay.zip`

## Purpose

This hotfix adds a smallest-safe recovery helper and verifier for the Phase 138 artifact watcher max-attempt condition.

The hotfix preserves the existing S.E.R.A. safety boundaries:

- saved ChatGPT target only
- no random recent chat fallback
- no new-chat fallback
- no credentials or tokens
- no paid services
- no external account changes
- no GitHub settings changes
- no owner-control boundary changes

## Intended Routing

Route the ZIP to:

`SERA-AutoOps/02_hotfix_approved`

## Recovery Model

The included helper script is intentionally conservative. It does not submit prompts, refresh ChatGPT, change browser targets, change external accounts, or alter GitHub settings. It prepares a recoverable retry state by:

1. validating the saved ChatGPT target config exists and has a real `targetUrl`
2. validating random/new chat fallback remain disabled
3. writing a Phase 138 generation lease marker so a watcher can wait instead of escalating too early
4. recording the exact blocked expected ZIP filename
5. optionally archiving the stale needs-attention packet as recoverable evidence

The helper can be run in dry-run mode first.

## Verification

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase138-blocked-phase-hotfix-attempt1.ps1 -RepoRoot "C:\Users\18123\Documents\SERA-Core\s.e.r.a"
```

## Notes for Phase 138 Main Fix

The main Phase 138 overlay should harden the actual artifact watcher and AutoOps runner so this rescue path becomes unnecessary:

- generation lease / quiet window
- exact expected ZIP filename fallback
- stale missing prompt references ignored/archived
- no refresh/resubmit during active lease
- expected overlay payload files allowed through safe apply flow

# Phase 137 — Safe Autopilot Continuation v1

## Purpose

Phase 137 adds a small, guarded proof helper for the phone-controlled autopilot path. It does not loosen any S.E.R.A. safety gate and does not introduce random/new-chat fallback behavior.

The proof path is intended to verify that a phone-saved command can move through:

1. `new`
2. `accepted`
3. `running`
4. ChatGPT request submission
5. artifact retrieval
6. routing
7. apply
8. validation
9. handoff detection
10. `complete` or `blocked`

## Safety Rules

- Use only the saved ChatGPT target in `00_control_center/chatgpt-target.json`.
- Require `targetUrl` to be present and non-empty.
- Require `allowNewChatFallback=false`.
- Require `allowRandomRecentChatFallback=false`.
- Stop if owner judgment is required.
- Stop on browser, artifact, validation, stale routing, missing handoff, or duplicate phase processing issues.
- Do not touch external accounts, paid services, GitHub/security settings, tokens, credentials, or project settings.

## Added Files

- `scripts/phase137-safe-autopilot-continuation-v1.ps1`
- `scripts/verify-phase137-safe-autopilot-continuation-v1.ps1`
- `.overlay/phase137_phase_137_safe_autopilot_continuation_v1.json`
- `.sera-proof/phase137_phase_137_safe_autopilot_continuation_v1.json`

## Verification

Run from repo root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-phase137-safe-autopilot-continuation-v1.ps1
```

Expected result:

```json
{ "ok": true }
```

## Operational Notes

This overlay is intentionally additive. It is safe to apply without modifying existing runner logic. The helper script records receipts and validates the saved ChatGPT target contract so later runner phases can use the receipts as proof without bypassing the existing apply, validation, and handoff gates.

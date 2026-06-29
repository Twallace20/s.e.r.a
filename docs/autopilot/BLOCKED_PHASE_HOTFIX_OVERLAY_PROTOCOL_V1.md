# Blocked Phase Hotfix Overlay Protocol v1

Phase 125 standardizes how S.E.R.A. continues development when a phase blocks.

## Default repair path

Normal development remains overlay-based:

```text
phase overlay ZIP → 01_apply_approved → validate → merge/tag/clean → CLOSED_CLEANLY
```

Blocked development now uses the same artifact discipline:

```text
BLOCKED handoff or needs-attention packet
→ hotfix request prompt
→ hotfix overlay ZIP
→ 02_hotfix_approved
→ validate hotfix
→ retry the same blocked phase
→ CLOSED_CLEANLY or stop for owner
```

## Why ZIP hotfixes are the default

Hotfix ZIP overlays keep repairs repeatable, hashable, routed, logged, and validated. They also preserve the same safety gates used by normal phases.

Generated scripts remain a last-resort bootstrap path, used only when ZIP routing, the bridge, or the runner itself is broken and cannot safely consume an overlay.

## Owner boundaries

The hotfix protocol stops instead of attempting automatic repair when evidence suggests owner judgment is required, including sensitive values, external service changes, GitHub/security settings, dependency/tool changes, destructive actions, or unclear repeated failures.

## Main control files

- `00_control_center/active-hotfix-request.json`
- `00_control_center/hotfix-repair-last-result.json`
- `15_bridge_outbox/hotfix-phase<phase>-attempt<attempt>-<timestamp>.md`
- `17_needs_attention/HOTFIX_PROTOCOL_NEEDS_ATTENTION-*.md`

## Laptop command

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-hotfix-overlay-protocol.ps1 `
  -LatestBlocked
```

Or explicitly:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-hotfix-overlay-protocol.ps1 `
  -Phase 125 `
  -ReasonFile "C:\path\to\blocked.md" `
  -Attempt 1
```

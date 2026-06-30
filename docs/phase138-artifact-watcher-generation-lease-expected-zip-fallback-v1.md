# Phase 138 — Artifact Watcher Generation Lease + Expected ZIP Fallback v1

## Purpose

This phase hardens the browser-side S.E.R.A. autopilot loop after Phase 138 proved that the current watcher can refresh and resubmit prompts while ChatGPT is still generating an overlay ZIP.

The goal is to keep the one-minute schedule, but make it safe. The watcher may observe local state, but it must not refresh, resubmit, or escalate while an expected ZIP is still being generated.

## What This Adds

- A generation lease / quiet window.
- Exact expected ZIP filename detection before broad fallback patterns.
- Fallback detection for phase-specific ZIPs and valid repo-root overlay ZIPs.
- Stale prompt/reference archival instead of backward-loop hotfix noise.
- A runtime guard that can wrap the hidden Phone Control and ChatGPT Artifact Watcher VBS launchers.
- Evidence files for every skip/delegate decision.

## Safety Boundaries

This phase preserves:

- Saved ChatGPT target only.
- No random recent chat fallback.
- No new-chat fallback.
- No credentials or token changes.
- No external account changes.
- No paid service activation.
- No GitHub/security setting mutation.
- No owner-control boundary changes.

## Important Install Sequence

Apply this overlay manually through `01_apply_approved` with browser watchers disabled. After it is validated, merged, and tagged, install the local runtime guard:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\phase138-artifact-watcher-generation-lease-expected-zip-fallback-v1.ps1 -InstallRuntimeGuard -Apply
```

This writes a local wrapper under:

```text
OneDrive\SERA-AutoOps\00_control_center\runtime_guards\phase138-artifact-watcher-generation-lease-expected-zip-fallback-v1
```

It backs up and wraps only these hidden launchers:

```text
SERA_Phone_Control_Watcher-action1.vbs
SERA_ChatGPT_Artifact_Watcher-action1.vbs
```

## Runtime Behavior

When a recent phase prompt/command signal exists and the expected ZIP is not present, the wrapper creates or respects an active generation lease. While the lease is active, it exits without launching the original browser watcher. This prevents premature refresh/resubmit behavior.

When the exact expected ZIP appears, the wrapper allows the original hidden watcher to run so the existing download/routing/apply flow can continue.

## Rollback

To restore the original hidden launchers:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\phase138-artifact-watcher-generation-lease-expected-zip-fallback-v1.ps1 -UninstallRuntimeGuard -Apply
```

## Validation

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase138-artifact-watcher-generation-lease-expected-zip-fallback-v1.ps1 -RepoRoot "C:\Users\18123\Documents\SERA-Core\s.e.r.a"
npm run build
npm test
```

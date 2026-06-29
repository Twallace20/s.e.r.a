# Phase 120 — ChatGPT Artifact Watcher Scheduler v1

## Purpose

Phase 120 makes the ChatGPT artifact downloader automatic and repeatable. It closes the gap discovered during Phase 119: the overall process worked, but the ZIP was initially routed as a hotfix and needed manual correction.

This phase adds an artifact watcher that can run once, run in bounded watch mode, or be installed as a Windows Scheduled Task.

## What this phase adds

- `scripts/sera-chatgpt-artifact-watcher.mjs`
- `scripts/sera-chatgpt-artifact-watch.ps1`
- `scripts/sera-chatgpt-artifact-watcher-schedule.ps1`
- `scripts/phase120-verify.mjs`
- `docs/autopilot/CHATGPT_ARTIFACT_WATCHER_SCHEDULER_CONTRACT.md`
- `.overlay/phase120-manifest.json`
- `.sera-proof/phase120/phase120-verify.json`

## Behavior

The watcher:

1. Reads the newest prompt from `15_bridge_outbox` or an explicit `-PromptFile`.
2. Extracts the expected ZIP name from the prompt or an explicit `-ExpectedZipName`.
3. Checks whether that ZIP already exists in the AutoOps queues.
4. Refreshes the saved ChatGPT browser tab when the watcher determines it is stale.
5. Runs the existing guarded bridge downloader with `SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE=true`.
6. Finds the downloaded ZIP.
7. Routes normal overlays into `01_apply_approved`.
8. Routes hotfix overlays into `02_hotfix_approved` only when a phase work branch is checked out.
9. Starts the AutoOps runner when `-StartRunner` is supplied.
10. Writes evidence and a ledger entry for every attempt.

## Primary commands

Run a single watcher pass:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-chatgpt-artifact-watch.ps1 -Once -StartRunner
```

Run against a specific prompt and ZIP:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-chatgpt-artifact-watch.ps1 -Once -PromptFile "$env:USERPROFILE\OneDrive\SERA-AutoOps\15_bridge_outbox\phase121.md" -ExpectedZipName "s.e.r.a_phase121_safe_autopilot_proof_v1_overlay.zip" -StartRunner
```

Install scheduled watcher:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-chatgpt-artifact-watcher-schedule.ps1 -Install -EveryMinutes 5
```

## Success criteria

- `node scripts/phase120-verify.mjs` passes.
- `npm run sera:gate` passes.
- The watcher refuses to run without the saved ChatGPT target.
- The watcher writes evidence records.
- The watcher routes normal overlays to `01_apply_approved`.
- The watcher refuses hotfix routing on `main`.
- The watcher scheduler can be installed and removed by the owner.

## Full guarded autopilot readiness

After Phase 120 closes cleanly, the remaining proof steps are:

1. Run one `sera-autopilot-continue.ps1 -Once` continuation proof.
2. Run one intentional safe blocked repair proof.
3. Run one bounded batch proof with `-MaxPhases 3`.

When those pass, S.E.R.A. has the operational proof needed for full guarded autopilot.

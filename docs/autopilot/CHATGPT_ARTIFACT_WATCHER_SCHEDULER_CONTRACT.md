# S.E.R.A. ChatGPT Artifact Watcher Scheduler Contract

Phase 120 adds the automatic artifact watcher that removes the last manual downloader step from the guarded autopilot flow.

## Purpose

The watcher watches the S.E.R.A. bridge outbox, uses the saved ChatGPT target only, refreshes the saved browser tab when stale, runs the existing ChatGPT bridge downloader for the expected ZIP, and routes the downloaded ZIP into the correct AutoOps queue.

It is designed to make the pattern repeatable:

1. A phase prompt appears in `15_bridge_outbox`.
2. The watcher detects the newest prompt and expected ZIP name.
3. The watcher refreshes the saved ChatGPT tab when needed.
4. The watcher runs the existing guarded bridge submit/download flow.
5. The watcher verifies the expected ZIP landed locally.
6. The watcher routes normal overlays to `01_apply_approved`.
7. The watcher routes hotfix overlays only when a phase work branch is checked out.
8. The watcher starts the AutoOps runner when requested.
9. The watcher writes evidence and stops safely on ambiguity.

## Inputs

The watcher reads:

- `00_control_center/autopilot-state.json`
- `00_control_center/chatgpt-target.json`
- `00_control_center/phase-mission.json`
- `15_bridge_outbox/*.md`
- `13_chatgpt_downloads/*.zip`

It also respects:

- `00_control_center/stop.flag`
- `00_control_center/STOP_AUTOPILOT.flag`
- `00_control_center/stop/STOP_AUTOPILOT.txt`
- `00_control_center/pause.flag`
- `00_control_center/PAUSE_AUTOPILOT.flag`
- `00_control_center/pause/PAUSE_AUTOPILOT.txt`

## Outputs

The watcher writes:

- Evidence records to `00_control_center/evidence`
- A ledger at `00_control_center/evidence/artifact-watcher-ledger.json`
- Needs-attention records to `17_needs_attention` when it cannot continue safely

## Routing rules

Normal phase overlay ZIPs are copied to:

`01_apply_approved`

Hotfix / repair ZIPs are copied to:

`02_hotfix_approved`

Only when all of these are true:

- the ZIP name indicates a hotfix or repair artifact,
- the repo is currently on a `work/phase...` branch,
- the branch is not `main`,
- the watcher was not asked to force normal routing.

If a hotfix-shaped artifact appears while the repo is on `main`, the watcher writes a needs-attention packet instead of repeating the Phase 119 routing mistake.

## Scheduler

The scheduler is owner-installed. Phase 120 provides the script but does not silently register a scheduled task while the overlay is being applied.

Install the watcher task:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-chatgpt-artifact-watcher-schedule.ps1 -Install -EveryMinutes 5
```

Run one watcher pass manually:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-chatgpt-artifact-watch.ps1 -Once -StartRunner
```

Remove the watcher task:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-chatgpt-artifact-watcher-schedule.ps1 -Remove
```

## Safety boundaries

The watcher does not create a new ChatGPT conversation. It does not pick a random recent chat. It does not bypass the existing bridge safety filter. It does not merge code. It only downloads, verifies, routes, and starts the already-established AutoOps tasks when configured.

Full guarded autopilot still means bounded work, evidence, owner stop/pause controls, and fail-closed behavior.

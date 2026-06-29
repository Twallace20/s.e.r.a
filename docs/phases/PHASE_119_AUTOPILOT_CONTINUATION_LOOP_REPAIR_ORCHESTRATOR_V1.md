# Phase 119 — Autopilot Continuation Loop + Repair Orchestrator v1

## Purpose

Phase 119 turns the proven ChatGPT bridge/download/router/runner sequence into a repeatable guarded autopilot loop.

Phase 118 created the owner-controlled `00_control_center`. Phase 119 adds the loop runner that reads that control center, submits the next approved phase request to the saved ChatGPT thread, waits for the returned artifact, routes and applies the overlay, observes PASS/BLOCKED/CLOSED_CLEANLY handoffs, and stops safely when owner judgment is required.

## What this phase enables

- One-command continuation through the saved ChatGPT target.
- Bounded batch mode with a configurable maximum phase count.
- Automatic prompt generation from `00_control_center/phase-mission.json` or explicit CLI inputs.
- Download/router/runner task orchestration.
- Safe merge task orchestration through the existing merge-approval path.
- Repair prompt generation for recoverable blocked states.
- Hard stop for risky or unclear conditions.
- Evidence records under `00_control_center/evidence`.

## Full safe autopilot definition

Full safe autopilot means S.E.R.A. can continue work without the owner manually copying prompts or clicking artifact downloads, while still stopping before actions that require owner judgment.

It does **not** mean unbounded self-approval. It does **not** mean changing security settings, enabling paid services, handling sensitive values, installing tools, or taking destructive actions without explicit owner approval.

## Primary commands

Run one continuation:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-autopilot-continue.ps1 -Once
```

Run a bounded batch:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-autopilot-continue.ps1 -MaxPhases 3
```

Run an explicit next phase:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-autopilot-continue.ps1 -Phase 120 -Title "Blocked Flow Repair Automation v1" -ExpectedZipName "s.e.r.a_phase120_blocked_flow_repair_automation_v1_overlay.zip"
```

Dry run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-autopilot-continue.ps1 -Once -DryRun
```

## Success criteria

- `node scripts/phase119-verify.mjs` passes.
- `npm run sera:gate` passes.
- The loop refuses to run without the saved ChatGPT target.
- The loop writes evidence for every attempt.
- The loop respects stop and pause files.
- The loop stops on new needs-attention entries unless the issue is classified recoverable and repair attempts remain.
- The loop never bypasses existing safety gates.

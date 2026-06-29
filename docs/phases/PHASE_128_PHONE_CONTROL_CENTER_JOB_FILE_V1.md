# Phase 128 — Phone Control Center Job File v1

This phase adds a phone-editable job file system for bounded S.E.R.A. autopilot runs.

## Adds

- `scripts/sera-phone-control-job.mjs`
- `scripts/sera-phone-control-job.ps1`
- `00_control_center_templates/autopilot-command.example.json`
- `docs/autopilot/PHONE_CONTROL_CENTER_JOB_FILE_V1.md`
- `scripts/phase128-verify.mjs`

## Operator command

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-phone-control-job.ps1 -Run
```

The script reads `SERA-AutoOps/00_control_center/autopilot-command.json`, validates the requested bounded range, updates control-center state, then calls the existing guarded autopilot continuation script.

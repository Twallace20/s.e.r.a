# Autopilot Directive Control Center v1

Phase 124 adds owner-friendly controls for guarded S.E.R.A. autopilot. The control surface lives in `SERA-AutoOps/00_control_center` so it can be used from a phone through OneDrive or from a laptop through PowerShell.

## Phone controls

Open OneDrive → `SERA-AutoOps/00_control_center`.

- Run a range by creating a file named like `RUN_124_TO_130.flag`.
- Pause after the current safe checkpoint by creating `PAUSE_AUTOPILOT.flag`.
- Stop before starting another phase by creating `STOP_AUTOPILOT.flag`.
- Guide the next request by editing `GUIDE_AUTOPILOT.md`.
- Read `AUTOPILOT_STATUS.md` for a plain-language status packet.

The loop still preserves the existing safety rules: blocked states stop, saved ChatGPT target only, no random thread fallback, no new-chat fallback, and owner judgment remains required for risky or unclear work.

## Laptop controls

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-autopilot-directive.ps1 -RunRange 124-130
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-autopilot-directive.ps1 -Pause
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-autopilot-directive.ps1 -Resume
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-autopilot-directive.ps1 -Stop
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-autopilot-directive.ps1 -Status
```

## Running a bounded batch

Set the directive first, then run autopilot with a bounded maximum.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-autopilot-directive.ps1 -RunRange 124-130

powershell -ExecutionPolicy Bypass -File .\scripts\sera-autopilot-continue.ps1 `
  -MaxPhases 7 `
  -EnableAutopilotForThisRun
```

The directive caps the phase range. If the requested end phase is reached, the loop writes status and stops.

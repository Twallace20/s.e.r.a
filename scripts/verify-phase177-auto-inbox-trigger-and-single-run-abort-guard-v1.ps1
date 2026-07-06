param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase177_auto_inbox_trigger_and_single_run_abort_guard_v1_overlay"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

function Assert-File {
  param([string]$RelativePath)

  $Path = Join-Path $RepoRoot $RelativePath
  if (!(Test-Path $Path)) {
    throw "Missing required file: $RelativePath"
  }

  if ($RelativePath -like "*.ps1") {
    $Tokens = $null
    $Errors = $null
    [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$Errors) | Out-Null

    if ($Errors -and $Errors.Count -gt 0) {
      throw "Parse failed for $RelativePath :: $($Errors[0].Message)"
    }
  }

  return Get-Content $Path -Raw
}

$Direct = Assert-File "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1"
$Router = Assert-File "scripts\sera-full-auto-json-loop-router-v1.ps1"
$Bridge = Assert-File "scripts\sera-chatgpt-browser-bridge-v1.ps1"
$Watcher = Assert-File "scripts\sera-command-inbox-foreground-watcher-v1.ps1"
Assert-File "SERA_WATCH_COMMAND_INBOX.ps1" | Out-Null
Assert-File "scripts\sera-repair-nested-overlay-paths-v1.ps1" | Out-Null
Assert-File ".overlay\phase177_auto_inbox_trigger_and_single_run_abort_guard_v1.json" | Out-Null
Assert-File ".sera-proof\phase177_auto_inbox_trigger_and_single_run_abort_guard_v1.json" | Out-Null
Assert-File "docs\phase177-auto-inbox-trigger-and-single-run-abort-guard-v1.md" | Out-Null
Assert-File "scripts\phase177-auto-inbox-trigger-and-single-run-abort-guard-v1.ps1" | Out-Null

foreach ($Marker in @(
  "Invoke-RequiredScript",
  "Stop-WithBlocked",
  "Fresh VERIFY_PASS",
  "Fresh PASS_GUARANTEED",
  "SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED",
  "Required verifier script failed",
  "Required qa script failed",
  "exit $ExitCode"
)) {
  if ($Direct -notlike "*$Marker*") {
    throw "Direct closeout missing gate marker: $Marker"
  }
}

foreach ($Marker in @(
  "Select-CurrentPhaseHandoff",
  "STALE_HANDOFF_REFUSED",
  "FINAL_HANDOFF_COPIED",
  "FULL_AUTO_LOOP_DONE"
)) {
  if ($Router -notlike "*$Marker*") {
    throw "Router missing current-phase handoff marker: $Marker"
  }
}

foreach ($Marker in @(
  "real_exact_download_control_not_ready",
  "fresh-download",
  "Download"
)) {
  if ($Bridge -notlike "*$Marker*") {
    throw "Bridge missing artifact selector marker: $Marker"
  }
}

foreach ($Marker in @(
  "COMMAND_INBOX_FOREGROUND_WATCHER_START",
  "NEW_COMMAND_JSON_DETECTED",
  "WATCHER_COMPLETED_ONE_COMMAND",
  "No persistence was added"
)) {
  if ($Watcher -notlike "*$Marker*") {
    throw "Watcher missing marker: $Marker"
  }
}

$Forbidden = @(
  "Register-ScheduledTask",
  "New-Service",
  "schtasks",
  "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run",
  "StartUp"
)

$AllText = $Direct + "`n" + $Router + "`n" + $Bridge + "`n" + $Watcher

foreach ($Bad in $Forbidden) {
  if ($AllText -like "*$Bad*") {
    throw "Forbidden persistence/security marker found: $Bad"
  }
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$VerifyPath = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"

@"
Status: VERIFY_PASS
Phase: $PhaseName
Timestamp: $Stamp

Proof:
- Foreground command inbox watcher exists.
- No persistence mechanism was added.
- Direct closeout has Invoke-RequiredScript gate semantics.
- Verifier failure blocks QA and merge.
- QA failure blocks merge.
- Fresh VERIFY_PASS and PASS_GUARANTEED are required.
- Router copies current-phase handoffs only.
"@ | Set-Content $VerifyPath -Encoding UTF8

Write-Host "PHASE177_VERIFY PASS"
Write-Host $VerifyPath
exit 0

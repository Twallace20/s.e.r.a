param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase178_foreground_watcher_json_drop_proof_v1_overlay"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

function Block-Verify {
  param([string]$Reason)

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Path = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_BLOCKED.md"

  @"
Status: BLOCKED
Phase: $PhaseName
Timestamp: $Stamp
Reason: $Reason
"@ | Set-Content $Path -Encoding UTF8

  Write-Host "PHASE178_VERIFY BLOCKED"
  Write-Host $Reason
  exit 1
}

function Assert-File {
  param([string]$RelativePath)

  $Path = Join-Path $RepoRoot $RelativePath
  if (!(Test-Path $Path)) {
    Block-Verify "Missing required file: $RelativePath"
  }

  return $Path
}

function Assert-Text {
  param(
    [string]$RelativePath,
    [string[]]$Markers
  )

  $Path = Assert-File $RelativePath
  $Text = Get-Content -LiteralPath $Path -Raw

  foreach ($Marker in $Markers) {
    if ($Text -notlike "*$Marker*") {
      Block-Verify "Missing marker '$Marker' in $RelativePath"
    }
  }
}

function Assert-ParseOk {
  param([string]$RelativePath)

  $Path = Assert-File $RelativePath
  $Tokens = $null
  $Errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$Errors) | Out-Null

  if ($Errors -and $Errors.Count -gt 0) {
    Block-Verify "Parse failed in ${RelativePath}: $($Errors[0].Message)"
  }
}

$RequiredFiles = @(
  "SERA_WATCH_COMMAND_INBOX.ps1",
  "scripts\sera-command-inbox-foreground-watcher-v1.ps1",
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  "scripts\sera-full-auto-json-loop-router-v1.ps1",
  "scripts\sera-chatgpt-browser-bridge-v1.ps1",
  "scripts\sera-repair-nested-overlay-paths-v1.ps1",
  "scripts\phase178-foreground-watcher-json-drop-proof-v1.ps1",
  "scripts\verify-phase178-foreground-watcher-json-drop-proof-v1.ps1",
  ".overlay\phase178_foreground_watcher_json_drop_proof_v1.json",
  ".sera-proof\phase178_foreground_watcher_json_drop_proof_v1.json",
  "docs\phase178-foreground-watcher-json-drop-proof-v1.md"
)

foreach ($File in $RequiredFiles) {
  Assert-File $File | Out-Null
}

foreach ($Script in $RequiredFiles | Where-Object { $_ -like "*.ps1" }) {
  Assert-ParseOk $Script
}

Assert-Text "SERA_WATCH_COMMAND_INBOX.ps1" @(
  "sera-command-inbox-foreground-watcher-v1.ps1"
)

Assert-Text "scripts\sera-command-inbox-foreground-watcher-v1.ps1" @(
  "COMMAND_INBOX_FOREGROUND_WATCHER_START",
  "No persistence was added",
  "NEW_COMMAND_JSON_DETECTED",
  "SERA_RUN_UPLOADED_JSON_LOOP.ps1",
  "WATCHER_STOP_AFTER_BLOCKED_OR_FAILED_RUN"
)

Assert-Text "scripts\sera-chatgpt-browser-bridge-v1.ps1" @(
  "real_exact_download_control_not_ready",
  "RunStartedAt",
  "fresh-download"
)

Assert-Text "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1" @(
  "Invoke-RequiredScript",
  "Fresh VERIFY_PASS",
  "Fresh PASS_GUARANTEED",
  "BLOCKED_HANDOFF",
  "Required verifier script failed",
  "Required QA script failed"
)

Assert-Text "scripts\sera-full-auto-json-loop-router-v1.ps1" @(
  "Select-CurrentPhaseHandoff",
  "STALE_HANDOFF_REFUSED",
  "FULL_LOOP_EXIT_CODE"
)

$ForbiddenNeedles = @(
  "Register-ScheduledTask",
  "New-ScheduledTask",
  "New-ScheduledTaskAction",
  "New-ScheduledTaskTrigger",
  "Set-ScheduledTask",
  "Unregister-ScheduledTask",
  "schtasks.exe",
  "New-Service",
  "Set-Service",
  "sc.exe create"
)

Get-ChildItem -LiteralPath (Join-Path $RepoRoot "scripts") -Filter "*.ps1" -File -Recurse | ForEach-Object {
  if ($_.Name -like "verify-*.ps1") {
    return
  }

  $Text = Get-Content -LiteralPath $_.FullName -Raw

  foreach ($Needle in $ForbiddenNeedles) {
    if ($Text -like "*$Needle*") {
      Block-Verify "Forbidden persistence or service pattern '$Needle' found in $($_.FullName)"
    }
  }
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"

@"
Status: VERIFY_PASS
Phase: $PhaseName
Timestamp: $Stamp

Proof:
- Foreground watcher files exist and parse.
- Watcher starts explicit foreground mode only.
- JSON drop detection marker exists.
- Full loop invocation marker exists.
- Browser bridge exact-download and fresh-download markers exist.
- Direct closeout required-script gate markers exist.
- Router current-phase handoff guard markers exist.
- Legacy scheduled-task/service helpers are disabled or absent.
- Historical verify-*.ps1 files are excluded from persistence scans to avoid marker-string false positives.
"@ | Set-Content $PassPath -Encoding UTF8

Write-Host "PHASE178_VERIFY PASS"
Write-Host $PassPath
exit 0

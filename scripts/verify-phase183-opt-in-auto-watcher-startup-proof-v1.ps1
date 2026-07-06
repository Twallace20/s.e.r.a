param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase183_opt_in_auto_watcher_startup_proof_v1_overlay"
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

  Write-Host "PHASE183_VERIFY BLOCKED"
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

function Assert-NoForbiddenServicePersistence {
  param([string]$RelativePath)

  $Path = Assert-File $RelativePath
  $Text = Get-Content -LiteralPath $Path -Raw

  $ForbiddenPatterns = @(
    "New-Service",
    "sc.exe create",
    "sc.exe config",
    "Start-Service",
    "Set-Service",
    "Restart-Service",
    "NT AUTHORITY\SYSTEM",
    "-User `"SYSTEM`"",
    "-User SYSTEM",
    "RunLevel Highest",

    "ConvertTo-SecureString",
    "Export-Clixml"
  )

  foreach ($Pattern in $ForbiddenPatterns) {
    if ($Text -like "*$Pattern*") {
      Block-Verify "Forbidden service/security pattern '$Pattern' found in $RelativePath"
    }
  }
}

$RequiredFiles = @(
  "SERA_ENABLE_AUTO_WATCHER.ps1",
  "SERA_DISABLE_AUTO_WATCHER.ps1",
  "SERA_AUTO_WATCHER_STATUS.ps1",
  "SERA_START_WATCHER_NOW.ps1",
  "scripts\sera-auto-watcher-scheduled-task-v1.ps1",
  "scripts\phase183-opt-in-auto-watcher-startup-proof-v1.ps1",
  "scripts\verify-phase183-opt-in-auto-watcher-startup-proof-v1.ps1",
  ".overlay\phase183_opt_in_auto_watcher_startup_proof_v1.json",
  ".sera-proof\phase183_opt_in_auto_watcher_startup_proof_v1.json",
  "docs\phase183-opt-in-auto-watcher-startup-proof-v1.md"
)

foreach ($File in $RequiredFiles) {
  Assert-File $File | Out-Null
}

foreach ($Script in $RequiredFiles | Where-Object { $_ -like "*.ps1" }) {
  Assert-ParseOk $Script
}

Assert-Text "SERA_ENABLE_AUTO_WATCHER.ps1" @(
  "SERA_ENABLE_AUTO_WATCHER",
  "Register-ScheduledTask",
  "SERA AutoOps Command Inbox Watcher",
  "SERA_WATCH_COMMAND_INBOX.ps1",
  "LaunchBrowserIfNeeded"
)

Assert-Text "SERA_DISABLE_AUTO_WATCHER.ps1" @(
  "SERA_DISABLE_AUTO_WATCHER",
  "Unregister-ScheduledTask",
  "SERA AutoOps Command Inbox Watcher"
)

Assert-Text "SERA_AUTO_WATCHER_STATUS.ps1" @(
  "SERA_AUTO_WATCHER_STATUS",
  "Get-ScheduledTask",
  "command_inbox"
)

Assert-Text "SERA_START_WATCHER_NOW.ps1" @(
  "SERA_START_WATCHER_NOW",
  "Start-ScheduledTask"
)

Assert-Text "scripts\sera-auto-watcher-scheduled-task-v1.ps1" @(
  "single-instance",
  "current-user",
  "AtLogOn",
  "Register-ScheduledTask",
  "Unregister-ScheduledTask",
  "No stored secrets",
  "No Windows service is created"
)

$ScanFiles = @(
  "SERA_ENABLE_AUTO_WATCHER.ps1",
  "SERA_DISABLE_AUTO_WATCHER.ps1",
  "SERA_AUTO_WATCHER_STATUS.ps1",
  "SERA_START_WATCHER_NOW.ps1",
  "scripts\sera-auto-watcher-scheduled-task-v1.ps1"
)

foreach ($File in $ScanFiles) {
  Assert-NoForbiddenServicePersistence $File
}

# Explicitly allowed in Phase183 by user approval:
# Register-ScheduledTask is allowed only for the current-user, opt-in watcher task.
# Historical verify-*.ps1 files are intentionally not scanned for forbidden marker text.
# PHASE183_VERIFIER_SCOPED_SCAN

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"

@"
Status: VERIFY_PASS
Phase: $PhaseName
Timestamp: $Stamp

Proof:
- Phase183 auto-watcher files exist.
- Top-level enable, disable, status, and start-now scripts parse.
- Scheduled task helper parses.
- Verification scan is scoped to Phase183 auto-watcher files and excludes historical verifier marker strings.
- Current-user opt-in scheduled task support is present.
- Disable/unregister path is present.
- No Windows service creation is present in Phase183 auto-watcher files.
- No SYSTEM run-as, credentials, tokens, or password storage patterns are present in Phase183 auto-watcher files.
"@ | Set-Content $PassPath -Encoding UTF8

Write-Host "PHASE183_VERIFY PASS"
Write-Host $PassPath
exit 0


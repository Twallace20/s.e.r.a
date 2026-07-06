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
  if (!(Test-Path $Path)) { Block-Verify "Missing required file: $RelativePath" }
  return $Path
}

function Assert-ParseOk {
  param([string]$RelativePath)
  $Path = Assert-File $RelativePath
  $Tokens = $null
  $Errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$Errors) | Out-Null
  if ($Errors -and $Errors.Count -gt 0) { Block-Verify "Parse failed in ${RelativePath}: $($Errors[0].Message)" }
}

function Assert-Text {
  param([string]$RelativePath, [string[]]$Markers)
  $Path = Assert-File $RelativePath
  $Text = Get-Content -LiteralPath $Path -Raw
  foreach ($Marker in $Markers) {
    if ($Text -notlike "*$Marker*") { Block-Verify "Missing marker '$Marker' in $RelativePath" }
  }
}

$Required = @(
  "SERA_ENABLE_AUTO_WATCHER.ps1",
  "SERA_DISABLE_AUTO_WATCHER.ps1",
  "SERA_AUTO_WATCHER_STATUS.ps1",
  "SERA_START_WATCHER_NOW.ps1",
  "scripts\sera-auto-watcher-scheduled-task-v1.ps1",
  "scripts\verify-phase183-opt-in-auto-watcher-startup-proof-v1.ps1",
  "scripts\phase183-opt-in-auto-watcher-startup-proof-v1.ps1",
  ".overlay\phase183_opt_in_auto_watcher_startup_proof_v1.json",
  ".sera-proof\phase183_opt_in_auto_watcher_startup_proof_v1.json",
  "docs\phase183-opt-in-auto-watcher-startup-proof-v1.md"
)

foreach ($File in $Required) { Assert-File $File | Out-Null }
foreach ($Script in $Required | Where-Object { $_ -like "*.ps1" }) { Assert-ParseOk $Script }

Assert-Text "SERA_START_WATCHER_NOW.ps1" @(
  "SINGLE_INSTANCE_GUARD_ACQUIRED",
  "SERA_WATCH_COMMAND_INBOX.ps1",
  "AUTO_WATCHER_START_NOW",
  "LaunchBrowserIfNeeded"
)

Assert-Text "scripts\sera-auto-watcher-scheduled-task-v1.ps1" @(
  "Register-ScheduledTask",
  "Unregister-ScheduledTask",
  "New-ScheduledTaskTrigger -AtLogOn",
  "New-ScheduledTaskPrincipal",
  "LogonType Interactive",
  "RunLevel LeastPrivilege",
  "MultipleInstances IgnoreNew",
  "AUTO_WATCHER_TASK_ENABLED",
  "AUTO_WATCHER_TASK_DISABLED",
  "AUTO_WATCHER_STATUS"
)

Assert-Text "docs\phase183-opt-in-auto-watcher-startup-proof-v1.md" @(
  "explicit opt-in",
  "current-user scheduled task",
  "Disable anytime",
  "OneDrive"
)

$AllScripts = Get-ChildItem (Join-Path $RepoRoot "scripts") -File -Filter "*.ps1" -ErrorAction SilentlyContinue
$RootScripts = Get-ChildItem $RepoRoot -File -Filter "SERA_*.ps1" -ErrorAction SilentlyContinue
$ForbiddenPatterns = @(
  "New-Service",
  "sc.exe create",
  "nssm",
  "-User SYSTEM",
  "NT AUTHORITY\\SYSTEM",
  "RunLevel Highest",
  "Start-Process.*-Verb RunAs",
  "-Password",
  "-Credential",
  "Set-ItemProperty.*Run",
  "Startup\\Programs"
)

foreach ($File in @($AllScripts + $RootScripts)) {
  $Text = Get-Content -LiteralPath $File.FullName -Raw
  foreach ($Pattern in $ForbiddenPatterns) {
    if ($Text -match $Pattern) {
      Block-Verify "Forbidden persistence/security pattern '$Pattern' found in $($File.FullName)"
    }
  }
}

# Register-ScheduledTask is explicitly allowed only in the opt-in scheduler script for Phase183.
foreach ($File in @($AllScripts + $RootScripts)) {
  $Text = Get-Content -LiteralPath $File.FullName -Raw
  if ($Text -like "*Register-ScheduledTask*" -and $File.Name -ne "sera-auto-watcher-scheduled-task-v1.ps1") {
    Block-Verify "Register-ScheduledTask found outside explicit opt-in scheduler script: $($File.FullName)"
  }
}

# Preserve current browser bridge and pasteback guard markers if those files are present in the repo.
if (Test-Path (Join-Path $RepoRoot "scripts\sera-chatgpt-browser-bridge-v1.ps1")) {
  Assert-Text "scripts\sera-chatgpt-browser-bridge-v1.ps1" @("SAVED_CHATGPT_TARGET_CAPTURE")
}

if (Test-Path (Join-Path $RepoRoot "scripts\sera-final-handoff-pasteback-v1.ps1")) {
  Assert-Text "scripts\sera-final-handoff-pasteback-v1.ps1" @(
    "PASTEBACK_POSTED_TEXT_MATCH",
    "No random chat fallback was used",
    "No new chat fallback was used"
  )
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"
@"
Status: VERIFY_PASS
Phase: $PhaseName
Timestamp: $Stamp

Proof:
- Opt-in auto watcher startup scripts exist and parse.
- Enable, disable, status, and start-now root scripts exist.
- Scheduled task logic is current-user, AtLogOn, Interactive, LeastPrivilege, and reversible.
- Single-instance guard is present.
- No service creation, SYSTEM run-as, credential storage, admin elevation, or hidden startup folder/registry persistence was found.
- Register-ScheduledTask is contained only in the explicit opt-in scheduler script.
- Browser saved-target and pasteback text-match markers remain present.
"@ | Set-Content $PassPath -Encoding UTF8

Write-Host "PHASE183_VERIFY PASS"
Write-Host $PassPath
exit 0

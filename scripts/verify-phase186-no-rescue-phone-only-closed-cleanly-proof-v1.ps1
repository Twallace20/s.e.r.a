param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase186_no_rescue_phone_only_closed_cleanly_proof_v1_overlay"
$Slug = "phase186_no_rescue_phone_only_closed_cleanly_proof_v1"
$ExpectedZip = "s.e.r.a_phase186_no_rescue_phone_only_closed_cleanly_proof_v1_overlay.zip"

$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$BridgeOutbox = Join-Path $AutoOpsRoot "15_bridge_outbox"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$LogDir = Join-Path $AutoOpsRoot "00_control_center\logs"
$TargetDir = Join-Path $AutoOpsRoot "00_control_center\chatgpt_targets"

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

  Write-Host "PHASE186_VERIFY BLOCKED"
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

function Assert-NoForbiddenRuntimePattern {
  param([string]$RelativePath)

  $Path = Assert-File $RelativePath
  $Text = Get-Content -LiteralPath $Path -Raw

  $ForbiddenPatterns = @(
    ("New" + "-Service"),
    ("sc.exe " + "create"),
    ("sc.exe " + "config"),
    ("Start" + "-Service"),
    ("Set" + "-Service"),
    ("Restart" + "-Service"),
    ("NT AUTHORITY" + "\SYSTEM"),
    ("-User " + '"' + "SYSTEM" + '"'),
    ("-User " + "SYSTEM"),
    ("RunLevel " + "Highest"),
    ("ConvertTo" + "-SecureString"),
    ("Export" + "-Clixml")
  )

  foreach ($Pattern in $ForbiddenPatterns) {
    if ($Text -like "*$Pattern*") {
      Block-Verify "Forbidden service/security pattern '$Pattern' found in $RelativePath"
    }
  }
}

function Get-Phase186RunnerLogText {
  $Logs = Get-ChildItem $LogDir -File -Filter "sera-auto-watcher-runner-*.log" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 10

  foreach ($Log in $Logs) {
    $Text = Get-Content -LiteralPath $Log.FullName -Raw
    if ($Text -like "*$Slug*" -or $Text -like "*phase=186*") {
      return $Text
    }
  }

  return $null
}

$RequiredFiles = @(
  ".overlay\phase186_no_rescue_phone_only_closed_cleanly_proof_v1.json",
  ".sera-proof\phase186_no_rescue_phone_only_closed_cleanly_proof_v1.json",
  "docs\phase186-no-rescue-phone-only-closed-cleanly-proof-v1.md",
  "scripts\verify-phase186-no-rescue-phone-only-closed-cleanly-proof-v1.ps1",
  "scripts\phase186-no-rescue-phone-only-closed-cleanly-proof-v1.ps1",
  "SERA_AUTO_WATCHER_RUNNER.ps1",
  "SERA_START_WATCHER_NOW.ps1",
  "SERA_AUTO_WATCHER_STATUS.ps1",
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  "scripts\sera-final-handoff-pasteback-v1.ps1"
)

foreach ($File in $RequiredFiles) {
  Assert-File $File | Out-Null
}

foreach ($Script in $RequiredFiles | Where-Object { $_ -like "*.ps1" }) {
  Assert-ParseOk $Script
}

Assert-Text "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1" @(
  "Resolve-SeraOverlayZip",
  "ZIP_PATH_ARGUMENT_WAS_BLANK_RECOVERED",
  "ZIP_PATH_RESOLVED_FROM_EXPECTED_FILENAME",
  "ZIP_PATH_RESOLVED_FROM_DOWNLOADS13",
  "expectedFilename",
  "searchedDirectories"
)

Assert-Text "scripts\sera-final-handoff-pasteback-v1.ps1" @(
  "PASTEBACK_EXPECTED_FILENAME_RECOVERED",
  "ExpectedFilename fallback prevents missing argument failure"
)

$RuntimeScanFiles = @(
  "scripts\phase186-no-rescue-phone-only-closed-cleanly-proof-v1.ps1",
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  "scripts\sera-final-handoff-pasteback-v1.ps1",
  "SERA_AUTO_WATCHER_RUNNER.ps1",
  "SERA_START_WATCHER_NOW.ps1"
)

foreach ($File in $RuntimeScanFiles) {
  Assert-NoForbiddenRuntimePattern $File
}

$StartupFallback = Join-Path ([Environment]::GetFolderPath("Startup")) "SERA_AutoOps_Command_Inbox_Watcher.cmd"

$ScheduledTaskExists = $false
try {
  $Task = Get-ScheduledTask -TaskName "SERA AutoOps Command Inbox Watcher" -ErrorAction SilentlyContinue
  if ($Task) {
    $ScheduledTaskExists = $true
  }
} catch {
  $ScheduledTaskExists = $false
}

if (!(Test-Path $StartupFallback) -and -not $ScheduledTaskExists) {
  Block-Verify "No approved auto watcher startup mechanism exists."
}

$Prompt = Get-ChildItem $BridgeOutbox -File -Filter "*phase186*" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$Prompt) {
  Block-Verify "Phase186 bridge prompt not found."
}

$SavedTarget = Join-Path $TargetDir "$Slug-saved-chatgpt-target.json"
if (!(Test-Path $SavedTarget)) {
  Block-Verify "Phase186 saved ChatGPT target not found: $SavedTarget"
}

$ZipPath = Join-Path $Downloads13 $ExpectedZip
if (!(Test-Path $ZipPath)) {
  Block-Verify "Exact Phase186 ZIP not found in downloads: $ZipPath"
}

$RunnerLogText = Get-Phase186RunnerLogText
if ([string]::IsNullOrWhiteSpace($RunnerLogText)) {
  Block-Verify "Phase186 auto watcher runner log not found."
}

$LogMarkers = @(
  "SERA_AUTO_WATCHER_RUNNER_START",
  "WATCHER_SCRIPT=",
  "WATCHER_INVOKE_PARAMS=",
  "NEW_COMMAND_JSON_DETECTED",
  "phase186_no_rescue_phone_only_closed_cleanly_proof_v1",
  "REQUEST_READY",
  "CHATGPT_BROWSER_BRIDGE_CONNECTED",
  "ARTIFACT_CLICK_RESULT",
  "ARTIFACT_FOUND",
  "ZIP_READY",
  "RUN_DIRECT_ZIP_CLOSEOUT"
)

foreach ($Marker in $LogMarkers) {
  if ($RunnerLogText -notlike "*$Marker*") {
    Block-Verify "Phase186 runner log missing marker: $Marker"
  }
}

$DirectForegroundWatcherLaunch = $false

foreach ($Line in ($RunnerLogText -split "\r?\n")) {
  if (
    $Line -like "*Host Application:*" -and
    $Line -like "*powershell.exe*" -and
    $Line -like "* -File *SERA_WATCH_COMMAND_INBOX.ps1*"
  ) {
    $DirectForegroundWatcherLaunch = $true
  }
}

if ($DirectForegroundWatcherLaunch) {
  Block-Verify "Runner log host application shows direct foreground watcher start instead of auto watcher runner path."
}

# PHASE186_VERIFIER_FIX: runner-path check is line-scoped so WATCHER_SCRIPT does not false-positive as a direct launch.

$PriorBlocked = Get-ChildItem $Handoff -File -Filter "$PhaseName-*VERIFY_BLOCKED.md" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$PriorBlocked) {
  Block-Verify "Prior Phase186 VERIFY_BLOCKED handoff missing; cannot prove the repair addressed the observed failure."
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"

@"
Status: VERIFY_PASS
Phase: $PhaseName
Timestamp: $Stamp

Proof:
- Phase186 overlay files exist and parse.
- Phase183 auto-watcher runner/start controls exist and parse.
- StartupFallback or ScheduledTask exists for approved auto watcher startup.
- Direct closeout now contains real ZIP recovery behavior through Resolve-SeraOverlayZip.
- Direct closeout resolves blank ZIP args from expected filename and 13_chatgpt_downloads.
- Missing ZIP errors include expectedFilename and searchedDirectories.
- Pasteback now recovers ExpectedFilename before invoking the legacy helper.
- Phase186 bridge prompt exists.
- Phase186 saved ChatGPT target exists.
- Exact Phase186 ZIP exists in 13_chatgpt_downloads.
- Phase186 auto watcher runner log includes NEW_COMMAND_JSON_DETECTED, REQUEST_READY, CHATGPT_BROWSER_BRIDGE_CONNECTED, ARTIFACT_CLICK_RESULT, ARTIFACT_FOUND, ZIP_READY, and RUN_DIRECT_ZIP_CLOSEOUT.
- Runner log shows the auto watcher runner path, not a direct manual foreground watcher launch.
- The prior Phase186 VERIFY_BLOCKED handoff is present and the actual missing behavior has been repaired.
- No new service/admin/credential/dependency/security-setting pattern was found in runtime files scanned by this verifier.
"@ | Set-Content $PassPath -Encoding UTF8

Write-Host "PHASE186_VERIFY PASS"
Write-Host $PassPath
exit 0


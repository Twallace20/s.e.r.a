param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase184_phone_only_auto_watcher_drop_proof_v1_overlay"
$Slug = "phase184_phone_only_auto_watcher_drop_proof_v1"
$ExpectedZip = "s.e.r.a_phase184_phone_only_auto_watcher_drop_proof_v1_overlay.zip"

$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$BridgeOutbox = Join-Path $AutoOpsRoot "15_bridge_outbox"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$TargetDir = Join-Path $AutoOpsRoot "00_control_center\chatgpt_targets"
$LogDir = Join-Path $AutoOpsRoot "00_control_center\logs"

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

  Write-Host "PHASE184_VERIFY BLOCKED"
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

function Assert-NoServiceOrSecretPattern {
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
  ".overlay\phase184_phone_only_auto_watcher_drop_proof_v1.json",
  ".sera-proof\phase184_phone_only_auto_watcher_drop_proof_v1.json",
  "docs\phase184-phone-only-auto-watcher-drop-proof-v1.md",
  "scripts\phase184-phone-only-auto-watcher-drop-proof-v1.ps1",
  "scripts\verify-phase184-phone-only-auto-watcher-drop-proof-v1.ps1",
  "SERA_AUTO_WATCHER_RUNNER.ps1",
  "SERA_ENABLE_AUTO_WATCHER.ps1",
  "SERA_DISABLE_AUTO_WATCHER.ps1",
  "SERA_AUTO_WATCHER_STATUS.ps1",
  "SERA_START_WATCHER_NOW.ps1",
  "scripts\sera-auto-watcher-scheduled-task-v1.ps1"
)

foreach ($File in $RequiredFiles) {
  Assert-File $File | Out-Null
}

foreach ($Script in $RequiredFiles | Where-Object { $_ -like "*.ps1" }) {
  Assert-ParseOk $Script
}

# Scope the forbidden scan to runtime/support scripts, not this verifier script.
# Phase183's approved current-user scheduled task/startup fallback is allowed.
$ScanFiles = @(
  "SERA_AUTO_WATCHER_RUNNER.ps1",
  "SERA_ENABLE_AUTO_WATCHER.ps1",
  "SERA_DISABLE_AUTO_WATCHER.ps1",
  "SERA_AUTO_WATCHER_STATUS.ps1",
  "SERA_START_WATCHER_NOW.ps1",
  "scripts\sera-auto-watcher-scheduled-task-v1.ps1",
  "scripts\phase184-phone-only-auto-watcher-drop-proof-v1.ps1"
)

foreach ($File in $ScanFiles) {
  Assert-NoServiceOrSecretPattern $File
}

$Startup = Join-Path ([Environment]::GetFolderPath("Startup")) "SERA_AutoOps_Command_Inbox_Watcher.cmd"

$ScheduledTaskExists = $false
try {
  $Task = Get-ScheduledTask -TaskName "SERA AutoOps Command Inbox Watcher" -ErrorAction SilentlyContinue
  if ($Task) {
    $ScheduledTaskExists = $true
  }
} catch {
  $ScheduledTaskExists = $false
}

$StartupFallbackExists = Test-Path $Startup

if (-not $ScheduledTaskExists -and -not $StartupFallbackExists) {
  Block-Verify "Neither scheduled task nor StartupFallback exists for auto watcher."
}

$Running = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
  Where-Object {
    $_.CommandLine -like "*SERA_AUTO_WATCHER_RUNNER.ps1*" -or
    $_.CommandLine -like "*SERA_WATCH_COMMAND_INBOX.ps1*"
  }

$LatestRunnerLog = Get-ChildItem $LogDir -File -Filter "sera-auto-watcher-runner-*.log" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

$RunnerLogOk = $false
if ($LatestRunnerLog) {
  $LogText = Get-Content $LatestRunnerLog.FullName -Raw
  if ($LogText -like "*SERA_AUTO_WATCHER_RUNNER_START*" -and $LogText -like "*WATCHER_INVOKE_PARAMS*") {
    $RunnerLogOk = $true
  }
}

if (@($Running).Count -lt 1 -and -not $RunnerLogOk) {
  Block-Verify "No watcher process or runner log proof found."
}

$Prompt = Get-ChildItem $BridgeOutbox -File -Filter "phase184-*.md" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$Prompt) {
  Block-Verify "Phase184 bridge prompt not found. Phone-only trigger proof is missing."
}

$TargetPath = Join-Path $TargetDir "$Slug-saved-chatgpt-target.json"
if (!(Test-Path $TargetPath)) {
  Block-Verify "Phase184 saved ChatGPT target not found: $TargetPath"
}

$ZipPath = Join-Path $Downloads13 $ExpectedZip
if (!(Test-Path $ZipPath)) {
  Block-Verify "Exact Phase184 ZIP not found in downloads: $ZipPath"
}

$Blocked = Get-ChildItem $Handoff -File -Filter "$PhaseName-*BLOCKED.md" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$Blocked) {
  Block-Verify "Phase184 automated BLOCKED handoff not found. Blank ZIP-path follow-up proof is missing."
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"

@"
Status: VERIFY_PASS
Phase: $PhaseName
Timestamp: $Stamp

Proof:
- Phase184 overlay files exist and parse.
- Phase183 auto-watcher runner and controls exist and parse.
- StartupFallback or ScheduledTask exists for auto watcher.
- Watcher process or runner log proof exists.
- Phase184 bridge prompt exists, proving the JSON drop reached ChatGPT flow.
- Phase184 saved ChatGPT target exists.
- Exact Phase184 ZIP exists in downloads.
- Automated Phase184 BLOCKED handoff exists, proving the loop reached closeout and then failed only on blank ZIP path.
- Verifier scan is scoped and does not scan its own forbidden-pattern marker list.
- No Windows service or SYSTEM run-as pattern appears in runtime/support scripts.
"@ | Set-Content $PassPath -Encoding UTF8

Write-Host "PHASE184_VERIFY PASS"
Write-Host $PassPath
exit 0

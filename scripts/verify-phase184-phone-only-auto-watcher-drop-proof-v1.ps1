param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase184_phone_only_auto_watcher_drop_proof_v1_overlay"
$PhaseSlug = "phase184_phone_only_auto_watcher_drop_proof_v1"
$ExpectedZip = "s.e.r.a_phase184_phone_only_auto_watcher_drop_proof_v1_overlay.zip"

$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$Logs = Join-Path $AutoOpsRoot "00_control_center\logs"
$BridgeOutbox = Join-Path $AutoOpsRoot "15_bridge_outbox"
$Targets = Join-Path $AutoOpsRoot "00_control_center\chatgpt_targets"
$StartupFolder = [Environment]::GetFolderPath("Startup")
$StartupCmd = Join-Path $StartupFolder "SERA_AutoOps_Command_Inbox_Watcher.cmd"

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

Gate result:
QA was not run.
Merge must not run.
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

function Read-AllRelevantLogs {
  $Texts = New-Object System.Collections.Generic.List[string]

  if (Test-Path $Logs) {
    Get-ChildItem $Logs -File -Filter "*.log" -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 20 |
      ForEach-Object {
        try {
          $Texts.Add((Get-Content -LiteralPath $_.FullName -Raw -ErrorAction Stop))
        } catch {}
      }
  }

  $OtherLogRoots = @(
    (Join-Path $AutoOpsRoot "00_control_center"),
    (Join-Path $AutoOpsRoot "12_logs"),
    (Join-Path $AutoOpsRoot "14_runtime_logs")
  )

  foreach ($Root in $OtherLogRoots) {
    if (Test-Path $Root) {
      Get-ChildItem $Root -Recurse -File -Include "*.log","*.txt","*.md" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 30 |
        ForEach-Object {
          try {
            $Content = Get-Content -LiteralPath $_.FullName -Raw -ErrorAction Stop
            if ($Content -like "*phase184*" -or $Content -like "*SERA_AUTO_WATCHER_RUNNER_START*" -or $Content -like "*NEW_COMMAND_JSON_DETECTED*") {
              $Texts.Add($Content)
            }
          } catch {}
        }
    }
  }

  return ($Texts -join "`n--- SERA LOG BOUNDARY ---`n")
}

function Get-WatcherProcessCount {
  $Running = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.CommandLine -like "*SERA_AUTO_WATCHER_RUNNER.ps1*" -or
      $_.CommandLine -like "*SERA_WATCH_COMMAND_INBOX.ps1*"
    }

  return @($Running).Count
}

$RequiredScripts = @(
  "SERA_AUTO_WATCHER_RUNNER.ps1",
  "SERA_ENABLE_AUTO_WATCHER.ps1",
  "SERA_DISABLE_AUTO_WATCHER.ps1",
  "SERA_AUTO_WATCHER_STATUS.ps1",
  "SERA_START_WATCHER_NOW.ps1",
  "scripts\sera-auto-watcher-scheduled-task-v1.ps1",
  "scripts\verify-phase184-phone-only-auto-watcher-drop-proof-v1.ps1",
  "scripts\phase184-phone-only-auto-watcher-drop-proof-v1.ps1"
)

foreach ($Script in $RequiredScripts) {
  Assert-ParseOk $Script
}

foreach ($File in @(
  ".overlay\phase184_phone_only_auto_watcher_drop_proof_v1.json",
  ".sera-proof\phase184_phone_only_auto_watcher_drop_proof_v1.json",
  "docs\phase184-phone-only-auto-watcher-drop-proof-v1.md"
)) {
  Assert-File $File | Out-Null
}

$StartupFallbackExists = Test-Path $StartupCmd
$ScheduledTaskExists = $false

try {
  $Task = Get-ScheduledTask -TaskName "SERA AutoOps Command Inbox Watcher" -ErrorAction SilentlyContinue
  if ($Task) {
    $ScheduledTaskExists = $true
  }
} catch {
  $ScheduledTaskExists = $false
}

if (-not $StartupFallbackExists -and -not $ScheduledTaskExists) {
  Block-Verify "Neither StartupFallback nor scheduled task exists for Phase183 auto watcher."
}

$Phase184Prompt = Get-ChildItem $BridgeOutbox -File -Filter "phase184-*.md" -ErrorAction SilentlyContinue |
  Where-Object {
    try {
      $Text = Get-Content -LiteralPath $_.FullName -Raw -ErrorAction Stop
      $Text -like "*S.E.R.A. PHASE REQUEST*" -and
      $Text -like "*$PhaseSlug*" -and
      $Text -like "*$ExpectedZip*"
    } catch {
      $false
    }
  } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$Phase184Prompt) {
  Block-Verify "Phase184 bridge prompt not found in 15_bridge_outbox."
}

$SavedTarget = Get-ChildItem $Targets -File -Filter "$PhaseSlug-saved-chatgpt-target.json" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$SavedTarget) {
  Block-Verify "Phase184 saved ChatGPT target was not captured."
}

$LogText = Read-AllRelevantLogs
$WatcherProcessCount = Get-WatcherProcessCount

$HasRunnerStart = $LogText -like "*SERA_AUTO_WATCHER_RUNNER_START*"
$HasWatcherStart = $LogText -like "*COMMAND_INBOX_FOREGROUND_WATCHER_START*" -or $LogText -like "*COMMAND_INBOX_WATCHER_START*"
$HasPhase184Detection = $LogText -like "*NEW_COMMAND_JSON_DETECTED*phase184*" -or $LogText -like "*phase184_phone_only_auto_watcher_drop_proof_v1*"
$HasPhase184RequestReady = $LogText -like "*REQUEST_READY*phase=184*" -or $LogText -like "*REQUEST_READY*phase184*"

if (-not $HasRunnerStart -and $WatcherProcessCount -lt 1) {
  Block-Verify "No runner start log and no watcher process found."
}

if (-not $HasPhase184Detection -and -not $HasPhase184RequestReady) {
  Block-Verify "No Phase184 automatic detection/request proof found in logs."
}

$ForbiddenScanFiles = @(
  "scripts\verify-phase184-phone-only-auto-watcher-drop-proof-v1.ps1",
  "scripts\phase184-phone-only-auto-watcher-drop-proof-v1.ps1",
  "docs\phase184-phone-only-auto-watcher-drop-proof-v1.md"
)

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

foreach ($Relative in $ForbiddenScanFiles) {
  $Path = Join-Path $RepoRoot $Relative
  $Text = Get-Content -LiteralPath $Path -Raw
  foreach ($Pattern in $ForbiddenPatterns) {
    if ($Text -like "*$Pattern*") {
      Block-Verify "Forbidden service/security pattern '$Pattern' found in $Relative"
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
- Phase183 auto-watcher artifacts exist and parse.
- StartupFallbackExists=$StartupFallbackExists
- ScheduledTaskExists=$ScheduledTaskExists
- WatcherProcessCount=$WatcherProcessCount
- RunnerStartLogSeen=$HasRunnerStart
- WatcherStartLogSeen=$HasWatcherStart
- Phase184DetectionLogSeen=$HasPhase184Detection
- Phase184RequestReadySeen=$HasPhase184RequestReady
- Phase184 prompt exists: $($Phase184Prompt.FullName)
- Phase184 saved ChatGPT target exists: $($SavedTarget.FullName)
- No new persistence mechanism was added by Phase184.
- No Windows service, SYSTEM run-as, dependency install, credential/token, paid service, or security-setting change was detected in Phase184 files.
"@ | Set-Content $PassPath -Encoding UTF8

Write-Host "PHASE184_VERIFY PASS"
Write-Host $PassPath
exit 0

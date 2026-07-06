param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [int]$PollSeconds = 5,
  [int]$TimeoutMinutes = 45,
  [switch]$LaunchBrowserIfNeeded
)

$ErrorActionPreference = "Stop"

$Control = Join-Path $AutoOpsRoot "00_control_center"
$CommandInbox = Join-Path $Control "command_inbox"
$StateDir = Join-Path $Control "watcher_state"
$LockPath = Join-Path $StateDir "foreground-watcher.lock"
$LoopScript = Join-Path $RepoRoot "SERA_RUN_UPLOADED_JSON_LOOP.ps1"

New-Item -ItemType Directory -Force $CommandInbox,$StateDir | Out-Null

function Write-Step {
  param([string]$Message)
  Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
}

function Get-CommandFingerprint {
  param([System.IO.FileInfo]$File)
  return "$($File.FullName)|$($File.LastWriteTimeUtc.Ticks)|$($File.Length)"
}

if (!(Test-Path $LoopScript)) {
  throw "Full-loop launcher missing: $LoopScript"
}

if (Test-Path $LockPath) {
  $LockAgeMinutes = ((Get-Date) - (Get-Item $LockPath).LastWriteTime).TotalMinutes
  if ($LockAgeMinutes -lt 120) {
    throw "Foreground watcher lock exists. Another watcher may be running: $LockPath"
  }
  Remove-Item $LockPath -Force
}

Set-Content -LiteralPath $LockPath -Value "$(Get-Date -Format o)`nPID=$PID" -Encoding UTF8

try {
  Write-Step "COMMAND_INBOX_FOREGROUND_WATCHER_START inbox=$CommandInbox"
  Write-Step "This watcher is explicit foreground mode only. No persistence was added."

  $Seen = New-Object 'System.Collections.Generic.HashSet[string]'

  Get-ChildItem $CommandInbox -File -Filter "*.json" -ErrorAction SilentlyContinue |
    ForEach-Object { [void]$Seen.Add((Get-CommandFingerprint $_)) }

  while ($true) {
    $Latest = Get-ChildItem $CommandInbox -File -Filter "*.json" -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1

    if ($Latest) {
      $Fingerprint = Get-CommandFingerprint $Latest

      if (!$Seen.Contains($Fingerprint)) {
        [void]$Seen.Add($Fingerprint)
        Write-Step "NEW_COMMAND_JSON_DETECTED $($Latest.FullName)"

        $ArgsList = @(
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          $LoopScript,
          "-RepoRoot",
          $RepoRoot,
          "-AutoOpsRoot",
          $AutoOpsRoot,
          "-TimeoutMinutes",
          ([string]$TimeoutMinutes)
        )

        if ($LaunchBrowserIfNeeded) {
          $ArgsList += "-LaunchBrowserIfNeeded"
        }

        & powershell.exe @ArgsList
        $Exit = $LASTEXITCODE

        Write-Step "FULL_LOOP_EXIT_CODE $Exit"

        if ($Exit -ne 0) {
          Write-Step "WATCHER_STOP_AFTER_BLOCKED_OR_FAILED_RUN"
          exit $Exit
        }

        Write-Step "WATCHER_COMPLETED_ONE_COMMAND"
      }
    }

    Start-Sleep -Seconds $PollSeconds
  }
}
finally {
  if (Test-Path $LockPath) {
    Remove-Item $LockPath -Force -ErrorAction SilentlyContinue
  }
}

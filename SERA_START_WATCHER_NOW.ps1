param(
  [string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path),
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [switch]$LaunchBrowserIfNeeded,
  [switch]$FromScheduledTask
)

$ErrorActionPreference = "Stop"

$RepoRoot = [IO.Path]::GetFullPath($RepoRoot)
$AutoOpsRoot = [IO.Path]::GetFullPath($AutoOpsRoot)
$Control = Join-Path $AutoOpsRoot "00_control_center"
$LogDir = Join-Path $Control "auto_watcher_logs"
New-Item -ItemType Directory -Force $LogDir | Out-Null

$LogPath = Join-Path $LogDir ("auto-watcher-start-now-{0}.log" -f (Get-Date -Format "yyyyMMdd_HHmmss"))

function Write-Log {
  param([string]$Message)
  $Line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  $Line | Tee-Object -FilePath $LogPath -Append
}

$Watcher = Join-Path $RepoRoot "SERA_WATCH_COMMAND_INBOX.ps1"
if (!(Test-Path $Watcher)) {
  throw "SERA_WATCH_COMMAND_INBOX.ps1 not found: $Watcher"
}

$HashInput = ($RepoRoot + "|" + $AutoOpsRoot).ToLowerInvariant()
$Sha1 = [Security.Cryptography.SHA1]::Create()
$HashBytes = $Sha1.ComputeHash([Text.Encoding]::UTF8.GetBytes($HashInput))
$Hash = -join ($HashBytes | ForEach-Object { $_.ToString("x2") })
$MutexName = "Local\SERA_AutoOps_Command_Inbox_Watcher_$($Hash.Substring(0,12))"

$CreatedNew = $false
$Mutex = [Threading.Mutex]::new($true, $MutexName, [ref]$CreatedNew)

if (!$CreatedNew) {
  Write-Log "SINGLE_INSTANCE_GUARD_ALREADY_RUNNING mutex=$MutexName"
  exit 0
}

try {
  Write-Log "AUTO_WATCHER_START_NOW"
  Write-Log "RepoRoot=$RepoRoot"
  Write-Log "AutoOpsRoot=$AutoOpsRoot"
  Write-Log "Watcher=$Watcher"
  Write-Log "FromScheduledTask=$FromScheduledTask"
  Write-Log "LaunchBrowserIfNeeded=$LaunchBrowserIfNeeded"
  Write-Log "SINGLE_INSTANCE_GUARD_ACQUIRED mutex=$MutexName"

  $Args = @(
    "-RepoRoot", $RepoRoot,
    "-AutoOpsRoot", $AutoOpsRoot
  )

  if ($LaunchBrowserIfNeeded) {
    $Args += "-LaunchBrowserIfNeeded"
  }

  & powershell -NoProfile -ExecutionPolicy Bypass -File $Watcher @Args
  $Code = $LASTEXITCODE
  Write-Log "AUTO_WATCHER_EXIT_CODE $Code"
  exit $Code
} finally {
  try { $Mutex.ReleaseMutex() | Out-Null } catch {}
  $Mutex.Dispose()
  Write-Log "SINGLE_INSTANCE_GUARD_RELEASED mutex=$MutexName"
}

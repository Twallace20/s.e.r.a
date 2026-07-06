param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [switch]$LaunchBrowserIfNeeded
)

$ErrorActionPreference = "Stop"

$MutexName = "Global\SERA_AutoOps_Command_Inbox_Watcher"
$CreatedNew = $false
$Mutex = [System.Threading.Mutex]::new($true, $MutexName, [ref]$CreatedNew)

if (-not $CreatedNew) {
  Write-Host "AUTO_WATCHER_ALREADY_RUNNING"
  exit 0
}

$LogDir = Join-Path $AutoOpsRoot "00_control_center\logs"
New-Item -ItemType Directory -Force $LogDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogPath = Join-Path $LogDir "sera-auto-watcher-runner-$Stamp.log"

try {
  Start-Transcript -Path $LogPath -Append | Out-Null

  Write-Host "SERA_AUTO_WATCHER_RUNNER_START"
  Write-Host "RepoRoot=$RepoRoot"
  Write-Host "AutoOpsRoot=$AutoOpsRoot"
  Write-Host "LogPath=$LogPath"

  $Watcher = Join-Path $RepoRoot "SERA_WATCH_COMMAND_INBOX.ps1"

  if (!(Test-Path $Watcher)) {
    throw "Watcher script missing: $Watcher"
  }

  $CommandInfo = Get-Command $Watcher
  $SupportedParams = @($CommandInfo.Parameters.Keys)

  Write-Host "WATCHER_SCRIPT=$Watcher"
  Write-Host "WATCHER_SUPPORTED_PARAMS=$($SupportedParams -join ',')"

  $InvokeParams = @{}

  if ($CommandInfo.Parameters.ContainsKey("RepoRoot")) {
    $InvokeParams["RepoRoot"] = $RepoRoot
  }

  if ($CommandInfo.Parameters.ContainsKey("AutoOpsRoot")) {
    $InvokeParams["AutoOpsRoot"] = $AutoOpsRoot
  }

  if ($CommandInfo.Parameters.ContainsKey("PollSeconds")) {
    $InvokeParams["PollSeconds"] = 5
  }

  if ($LaunchBrowserIfNeeded -and $CommandInfo.Parameters.ContainsKey("LaunchBrowserIfNeeded")) {
    $InvokeParams["LaunchBrowserIfNeeded"] = $true
  }

  Write-Host "WATCHER_INVOKE_PARAMS=$($InvokeParams.Keys -join ',')"

  & $Watcher @InvokeParams

  $Code = $LASTEXITCODE
  if ($null -eq $Code) { $Code = 0 }

  Write-Host "SERA_AUTO_WATCHER_RUNNER_EXIT code=$Code"
  exit $Code
}
finally {
  try { Stop-Transcript | Out-Null } catch {}
  try { $Mutex.ReleaseMutex() | Out-Null } catch {}
  try { $Mutex.Dispose() } catch {}
}

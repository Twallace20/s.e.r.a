param(
  [switch]$Install,
  [switch]$Remove,
  [switch]$RunOnceNow,
  [int]$EveryMinutes = 5,
  [string]$TaskName = "SERA ChatGPT Artifact Watcher"
)

$ErrorActionPreference = "Stop"

$Repo = Split-Path -Parent $PSScriptRoot
$WatchScript = Join-Path $Repo "scripts\sera-chatgpt-artifact-watch.ps1"

if (!(Test-Path $WatchScript)) {
  throw "Watcher script not found: $WatchScript"
}

if ($EveryMinutes -lt 1) {
  throw "EveryMinutes must be at least 1. Recommended: 5."
}

if ($Remove) {
  $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Removed scheduled task: $TaskName"
  } else {
    Write-Host "Scheduled task not found: $TaskName"
  }
  return
}

if ($Install) {
  $ActionArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$WatchScript`" -Once -StartRunner"
  $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $ActionArgs -WorkingDirectory $Repo
  $Trigger = New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(1)) -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)
  $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew
  Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "S.E.R.A. watches ChatGPT artifacts and routes expected ZIPs into AutoOps." -Force | Out-Null
  Write-Host "Installed scheduled task: $TaskName"
  Write-Host "Cadence: every $EveryMinutes minute(s)"
}

if ($RunOnceNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "Started scheduled task: $TaskName"
}

if (!$Install -and !$Remove -and !$RunOnceNow) {
  Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue | Format-List
}

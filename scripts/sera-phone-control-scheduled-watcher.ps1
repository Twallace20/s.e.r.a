param(
  [switch]$Install,
  [switch]$Uninstall,
  [switch]$RunOnce,
  [switch]$Status,
  [switch]$Force,
  [int]$EveryMinutes = 5
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Script = Join-Path $PSScriptRoot "sera-phone-control-scheduled-watcher.mjs"
$TaskName = "SERA Phone Control Watcher"

if (!(Test-Path $Script)) {
  throw "Missing scheduled watcher script: $Script"
}

function Invoke-PhoneWatcher {
  param([string[]]$ExtraArgs)
  Push-Location $RepoRoot
  try {
    & node $Script @ExtraArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  } finally {
    Pop-Location
  }
}

if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Uninstalled $TaskName"
  return
}

if ($Install) {
  if ($EveryMinutes -lt 1) { throw "EveryMinutes must be at least 1." }
  $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$PSCommandPath`" -RunOnce"
  $Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes)
  $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -StartWhenAvailable
  Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Checks SERA autopilot-command.json and starts bounded guarded work when enabled." -Force | Out-Null
  Write-Host "Installed $TaskName to check every $EveryMinutes minutes."
  if ($RunOnce) { Invoke-PhoneWatcher @("--run-once", "--json") }
  return
}

if ($Status) {
  Invoke-PhoneWatcher @("--status", "--json")
  return
}

if ($RunOnce) {
  $Args = @("--run-once", "--json")
  if ($Force) { $Args += "--force" }
  Invoke-PhoneWatcher $Args
  return
}

Write-Host "Usage:"
Write-Host "  .\scripts\sera-phone-control-scheduled-watcher.ps1 -Install -EveryMinutes 5"
Write-Host "  .\scripts\sera-phone-control-scheduled-watcher.ps1 -RunOnce"
Write-Host "  .\scripts\sera-phone-control-scheduled-watcher.ps1 -Status"
Write-Host "  .\scripts\sera-phone-control-scheduled-watcher.ps1 -Uninstall"

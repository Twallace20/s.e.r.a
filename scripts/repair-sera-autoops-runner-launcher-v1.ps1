param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [int]$WaitForZipMinutes = 240,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$Control = Join-Path $AutoOpsRoot "00_control_center"
$LauncherDir = Join-Path $Control "task_launchers_hidden"
$LauncherPath = Join-Path $LauncherDir "SERA_AutoOps_Runner-action1.vbs"
$RunnerScript = Join-Path $RepoRoot "scripts\sera-production-json-pickup-runner-v1.ps1"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"

if (!(Test-Path -LiteralPath $RunnerScript)) { throw "Missing production JSON pickup runner: $RunnerScript" }
New-Item -ItemType Directory -Force $LauncherDir | Out-Null

$PowerShellCommand = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $RunnerScript + '" -RepoRoot "' + $RepoRoot + '" -AutoOpsRoot "' + $AutoOpsRoot + '" -Once -WaitForZipMinutes ' + $WaitForZipMinutes
$VbsLines = @(
  'Set WshShell = CreateObject("WScript.Shell")',
  'cmd = "' + ($PowerShellCommand -replace '"','""') + '"',
  'WshShell.Run cmd, 0, False'
)

if ($DryRun) {
  Write-Host "RUNNER_LAUNCHER_DRY_RUN PASS"
  Write-Host "Launcher: $LauncherPath"
  Write-Host "Runner: $RunnerScript"
  Write-Host "WaitForZipMinutes: $WaitForZipMinutes"
  exit 0
}

if (Test-Path -LiteralPath $LauncherPath) {
  $Backup = "$LauncherPath.phase170-backup-$Stamp.bak"
  Copy-Item -LiteralPath $LauncherPath -Destination $Backup -Force
  Write-Host "Backed up existing launcher: $Backup"
}

$VbsLines -join "`r`n" | Set-Content -Path $LauncherPath -Encoding ASCII

Write-Host "RUNNER_LAUNCHER_REPAIRED PASS"
Write-Host "Launcher: $LauncherPath"
Write-Host "Runner: $RunnerScript"
Write-Host "WaitForZipMinutes: $WaitForZipMinutes"
Write-Host "No scheduled task enablement was performed. No startup persistence was added."
exit 0

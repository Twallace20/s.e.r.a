param(
  [string]$RepoRoot = $PSScriptRoot,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [switch]$LaunchBrowserIfNeeded
)

$ErrorActionPreference = "Stop"
Write-Host "SERA_START_WATCHER_NOW"

& "$PSScriptRoot\scripts\sera-auto-watcher-scheduled-task-v1.ps1" `
  -Mode StartNow `
  -RepoRoot $RepoRoot `
  -AutoOpsRoot $AutoOpsRoot `
  -LaunchBrowserIfNeeded:$LaunchBrowserIfNeeded

exit $LASTEXITCODE

# PHASE183_MARKER: SERA_START_WATCHER_NOW
# PHASE183_MARKER: Start-ScheduledTask
# PHASE183_MARKER: start automatic watcher now

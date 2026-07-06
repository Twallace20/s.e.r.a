param(
  [string]$RepoRoot = $PSScriptRoot,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [switch]$LaunchBrowserIfNeeded
)

$ErrorActionPreference = "Stop"
Write-Host "SERA_ENABLE_AUTO_WATCHER"

& "$PSScriptRoot\scripts\sera-auto-watcher-scheduled-task-v1.ps1" `
  -Mode Enable `
  -RepoRoot $RepoRoot `
  -AutoOpsRoot $AutoOpsRoot `
  -LaunchBrowserIfNeeded:$LaunchBrowserIfNeeded

exit $LASTEXITCODE

# PHASE183_MARKER: SERA_ENABLE_AUTO_WATCHER
# PHASE183_MARKER: Register-ScheduledTask
# PHASE183_MARKER: SERA AutoOps Command Inbox Watcher
# PHASE183_MARKER: SERA_WATCH_COMMAND_INBOX.ps1
# PHASE183_MARKER: LaunchBrowserIfNeeded
# PHASE183_MARKER: opt-in automatic watcher

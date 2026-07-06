param(
  [string]$RepoRoot = $PSScriptRoot,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"
Write-Host "SERA_DISABLE_AUTO_WATCHER"

& "$PSScriptRoot\scripts\sera-auto-watcher-scheduled-task-v1.ps1" `
  -Mode Disable `
  -RepoRoot $RepoRoot `
  -AutoOpsRoot $AutoOpsRoot

exit $LASTEXITCODE

# PHASE183_MARKER: SERA_DISABLE_AUTO_WATCHER
# PHASE183_MARKER: Unregister-ScheduledTask
# PHASE183_MARKER: SERA AutoOps Command Inbox Watcher
# PHASE183_MARKER: disable automatic watcher

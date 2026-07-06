param(
  [string]$RepoRoot = $PSScriptRoot,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"
Write-Host "SERA_AUTO_WATCHER_STATUS"

& "$PSScriptRoot\scripts\sera-auto-watcher-scheduled-task-v1.ps1" `
  -Mode Status `
  -RepoRoot $RepoRoot `
  -AutoOpsRoot $AutoOpsRoot

exit $LASTEXITCODE

# PHASE183_MARKER: SERA_AUTO_WATCHER_STATUS
# PHASE183_MARKER: Get-ScheduledTask
# PHASE183_MARKER: command_inbox
# PHASE183_MARKER: automatic watcher status

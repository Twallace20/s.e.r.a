param(
  [string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path),
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"
$Script = Join-Path $RepoRoot "scripts\sera-auto-watcher-scheduled-task-v1.ps1"
if (!(Test-Path $Script)) { throw "Missing scheduler script: $Script" }

& powershell -NoProfile -ExecutionPolicy Bypass -File $Script -Mode Status -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
exit $LASTEXITCODE
# PHASE183_MARKER: SERA_AUTO_WATCHER_STATUS
# PHASE183_MARKER: Get-ScheduledTask
# PHASE183_MARKER: command_inbox
# PHASE183_MARKER: automatic watcher status


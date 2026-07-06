param(
  [string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path),
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [switch]$LaunchBrowserIfNeeded
)

$ErrorActionPreference = "Stop"
$Script = Join-Path $RepoRoot "scripts\sera-auto-watcher-scheduled-task-v1.ps1"
if (!(Test-Path $Script)) { throw "Missing scheduler script: $Script" }

$Args = @(
  "-Mode", "Enable",
  "-RepoRoot", $RepoRoot,
  "-AutoOpsRoot", $AutoOpsRoot
)
if ($LaunchBrowserIfNeeded) { $Args += "-LaunchBrowserIfNeeded" }

& powershell -NoProfile -ExecutionPolicy Bypass -File $Script @Args
exit $LASTEXITCODE
# PHASE183_MARKER: SERA_ENABLE_AUTO_WATCHER
# PHASE183_MARKER: Register-ScheduledTask
# PHASE183_MARKER: SERA AutoOps Command Inbox Watcher
# PHASE183_MARKER: SERA_WATCH_COMMAND_INBOX.ps1
# PHASE183_MARKER: opt-in automatic watcher


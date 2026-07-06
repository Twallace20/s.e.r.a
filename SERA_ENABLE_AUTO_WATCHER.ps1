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

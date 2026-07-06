param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [int]$PollSeconds = 5,
  [int]$TimeoutMinutes = 45,
  [switch]$LaunchBrowserIfNeeded
)

$ErrorActionPreference = "Stop"

$Watcher = Join-Path $RepoRoot "scripts\sera-command-inbox-foreground-watcher-v1.ps1"

if (!(Test-Path $Watcher)) {
  throw "Watcher script missing: $Watcher"
}

$ArgsList = @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  $Watcher,
  "-RepoRoot",
  $RepoRoot,
  "-AutoOpsRoot",
  $AutoOpsRoot,
  "-PollSeconds",
  ([string]$PollSeconds),
  "-TimeoutMinutes",
  ([string]$TimeoutMinutes)
)

if ($LaunchBrowserIfNeeded) {
  $ArgsList += "-LaunchBrowserIfNeeded"
}

& powershell.exe @ArgsList
exit $LASTEXITCODE

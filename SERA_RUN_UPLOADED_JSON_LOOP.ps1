param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [int]$TimeoutMinutes = 30,
  [switch]$LaunchBrowserIfNeeded
)

$ErrorActionPreference = "Stop"

$Router = Join-Path $RepoRoot "scripts\sera-full-auto-json-loop-router-v1.ps1"
if (!(Test-Path $Router)) {
  throw "Full auto loop router missing: $Router"
}

$ArgsForRouter = @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  $Router,
  "-RepoRoot",
  $RepoRoot,
  "-AutoOpsRoot",
  $AutoOpsRoot,
  "-TimeoutMinutes",
  "$TimeoutMinutes"
)

if ($LaunchBrowserIfNeeded) {
  $ArgsForRouter += "-LaunchBrowserIfNeeded"
}

& powershell.exe @ArgsForRouter
exit $LASTEXITCODE

param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)
$ErrorActionPreference = "Stop"
& (Join-Path $PSScriptRoot "phase200-repeat-full-autopilot-clean-baseline-proof-v1-fixtures-v1.ps1") -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& (Join-Path $PSScriptRoot "sera-phase200-repeatability-proof-v1.ps1")
exit $LASTEXITCODE

param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"
Write-Host "PHASE189_QA_ALIAS_COMPAT"
& (Join-Path $PSScriptRoot "phase189-final-handoff-identity-integrity-true-no-rescue-v1.ps1") -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
exit $LASTEXITCODE

[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)
$Script = Join-Path $PSScriptRoot "qa-phase197-full-autopilot-json-to-remote-truth-closeout-proof-v1.ps1"
if (!(Test-Path -LiteralPath $Script)) { throw "Missing delegated QA script: $Script" }
Write-Host "PHASE197_QA_ALIAS_DELEGATING_TO=$Script"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Script -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
exit $LASTEXITCODE

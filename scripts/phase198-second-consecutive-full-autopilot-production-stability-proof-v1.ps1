[CmdletBinding()]
param([string]$RepoRoot = (Get-Location).Path,[string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps")
$Script = Join-Path $PSScriptRoot "qa-phase198-second-consecutive-full-autopilot-production-stability-proof-v1.ps1"
if (!(Test-Path -LiteralPath $Script)) { throw "Missing delegated QA script: $Script" }
Write-Host "PHASE198_QA_ALIAS_DELEGATING_TO=$Script"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Script -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
exit $LASTEXITCODE

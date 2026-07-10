[CmdletBinding()]
param([string]$RepoRoot = (Get-Location).Path,[string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps")
$Script = Join-Path $PSScriptRoot "qa-phase199-post-closeout-clean-repo-endurance-autopilot-v1.ps1"
if (!(Test-Path -LiteralPath $Script)) { throw "Missing delegated QA script: $Script" }
Write-Host "PHASE199_QA_ALIAS_DELEGATING_TO=$Script"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Script -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
exit $LASTEXITCODE

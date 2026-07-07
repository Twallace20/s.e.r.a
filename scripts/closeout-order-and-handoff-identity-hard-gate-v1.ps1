param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,[string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps")
# PHASE190_QA_ALIAS_COMPAT
& (Join-Path $PSScriptRoot "phase190-closeout-order-and-handoff-identity-hard-gate-v1.ps1") -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
exit $LASTEXITCODE

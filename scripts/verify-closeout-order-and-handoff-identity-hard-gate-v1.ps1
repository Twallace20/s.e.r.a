param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,[string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps")
# PHASE190_VERIFIER_ALIAS_COMPAT
& (Join-Path $PSScriptRoot "verify-phase190-closeout-order-and-handoff-identity-hard-gate-v1.ps1") -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
exit $LASTEXITCODE

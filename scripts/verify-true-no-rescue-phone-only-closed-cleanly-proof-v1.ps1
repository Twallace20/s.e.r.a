param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$PhaseName = "s.e.r.a_phase188_true_no_rescue_phone_only_closed_cleanly_proof_v1_overlay",
  [string]$PhaseSlug = "phase188_true_no_rescue_phone_only_closed_cleanly_proof_v1",
  [string]$PhaseToken = "phase188-true-no-rescue-phone-only-closed-cleanly-proof-v1",
  [int]$Phase = 188
)

$ErrorActionPreference = "Stop"

$AliasTarget = Join-Path $PSScriptRoot "verify-phase188-true-no-rescue-phone-only-closed-cleanly-proof-v1.ps1"
if (!(Test-Path -LiteralPath $AliasTarget)) {
  throw "Phase188 verifier alias target missing: $AliasTarget"
}

Write-Host "PHASE188_VERIFIER_ALIAS_COMPAT verify-true-no-rescue-phone-only-closed-cleanly-proof-v1 -> verify-phase188-true-no-rescue-phone-only-closed-cleanly-proof-v1"
& $AliasTarget -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot -PhaseName $PhaseName -PhaseSlug $PhaseSlug -PhaseToken $PhaseToken -Phase $Phase
exit $LASTEXITCODE

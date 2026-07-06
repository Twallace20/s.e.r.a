param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$PhaseName = "s.e.r.a_phase188_true_no_rescue_phone_only_closed_cleanly_proof_v1_overlay",
  [string]$PhaseSlug = "phase188_true_no_rescue_phone_only_closed_cleanly_proof_v1",
  [string]$PhaseToken = "phase188-true-no-rescue-phone-only-closed-cleanly-proof-v1",
  [int]$Phase = 188
)

$ErrorActionPreference = "Stop"

$AliasTarget = Join-Path $PSScriptRoot "phase188-true-no-rescue-phone-only-closed-cleanly-proof-v1.ps1"
if (!(Test-Path -LiteralPath $AliasTarget)) {
  throw "Phase188 QA alias target missing: $AliasTarget"
}

Write-Host "PHASE188_QA_ALIAS_COMPAT true-no-rescue-phone-only-closed-cleanly-proof-v1 -> phase188-true-no-rescue-phone-only-closed-cleanly-proof-v1"
& $AliasTarget -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
exit $LASTEXITCODE

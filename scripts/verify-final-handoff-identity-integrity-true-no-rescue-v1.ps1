param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$PhaseName = "s.e.r.a_phase189_final_handoff_identity_integrity_true_no_rescue_v1_overlay",
  [string]$PhaseSlug = "phase189_final_handoff_identity_integrity_true_no_rescue_v1",
  [string]$PhaseToken = "phase189-final-handoff-identity-integrity-true-no-rescue-v1",
  [int]$Phase = 189
)

$ErrorActionPreference = "Stop"
Write-Host "PHASE189_VERIFIER_ALIAS_COMPAT"
& (Join-Path $PSScriptRoot "verify-phase189-final-handoff-identity-integrity-true-no-rescue-v1.ps1") -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot -PhaseName $PhaseName -PhaseSlug $PhaseSlug -PhaseToken $PhaseToken -Phase $Phase
exit $LASTEXITCODE

[CmdletBinding()]
param(
  [string]$RepoRoot = "",
  [string]$AutoOpsRoot = ""
)

$ErrorActionPreference = "Stop"

# PHASE200_FIXTURE_DEFAULT_ROOTS_HARDENED
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  if ([string]::IsNullOrWhiteSpace($PSScriptRoot)) {
    throw "RepoRoot was not supplied and PSScriptRoot is empty."
  }
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

if ([string]::IsNullOrWhiteSpace($AutoOpsRoot)) {
  $AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
}

$Expected = [ordered]@{
  phase = "200"
  phaseSlug = "phase200_repeat_full_autopilot_clean_baseline_proof_v1"
  expectedZip = "s.e.r.a_phase200_repeat_full_autopilot_clean_baseline_proof_v1_overlay.zip"
  phase199Commit = "51128d59aadb81a11aa0001e58778530295b4454"
  phase199Tag = "phase-199-post-closeout-clean-repo-endurance-autopilot-v1"
  promptTextCompatCommit = "2404acb035e061857856f664eba4a4c76254020b"
  commandId = "phase200-clean-baseline-repeat-full-autopilot-proof-20260710090000"
  runNonce = "phase200-clean-baseline-repeat-full-autopilot-proof-20260710090000"
  zipSha256 = "13989effaab5331fb0066b69c2e815731a1b6301289457b8819942700776656a"
}

function Assert-True {
  param(
    [string]$Name,
    [bool]$Condition
  )
  if (!$Condition) {
    throw "Fixture case failed: $Name"
  }
}

$Cases = @(
  "phase_number_is_200",
  "phase_slug_matches",
  "expected_zip_matches",
  "phase199_baseline_commit_present",
  "phase199_tag_present",
  "prompttext_compat_commit_present",
  "command_id_matches",
  "run_nonce_matches",
  "zip_sha_shape",
  "overlay_manifest_required",
  "proof_file_required",
  "verifier_required",
  "qa_required",
  "clean_repo_pointer_proof_required"
)

Assert-True "phase_number_is_200" ($Expected.phase -eq "200")
Assert-True "phase_slug_matches" ($Expected.phaseSlug -eq "phase200_repeat_full_autopilot_clean_baseline_proof_v1")
Assert-True "expected_zip_matches" ($Expected.expectedZip -eq "s.e.r.a_phase200_repeat_full_autopilot_clean_baseline_proof_v1_overlay.zip")
Assert-True "phase199_baseline_commit_present" ($Expected.phase199Commit -match "^[0-9a-f]{40}$")
Assert-True "phase199_tag_present" ($Expected.phase199Tag -eq "phase-199-post-closeout-clean-repo-endurance-autopilot-v1")
Assert-True "prompttext_compat_commit_present" ($Expected.promptTextCompatCommit -match "^[0-9a-f]{40}$")
Assert-True "command_id_matches" ($Expected.commandId -eq "phase200-clean-baseline-repeat-full-autopilot-proof-20260710090000")
Assert-True "run_nonce_matches" ($Expected.runNonce -eq "phase200-clean-baseline-repeat-full-autopilot-proof-20260710090000")
Assert-True "zip_sha_shape" ($Expected.zipSha256 -match "^[0-9a-f]{64}$")

Assert-True "overlay_manifest_required" (Test-Path -LiteralPath (Join-Path $RepoRoot ".overlay\manifest.json"))
Assert-True "proof_file_required" (Test-Path -LiteralPath (Join-Path $RepoRoot ".sera-proof\phase200_repeat_full_autopilot_clean_baseline_proof_v1_overlay_proof.json"))
Assert-True "verifier_required" (Test-Path -LiteralPath (Join-Path $RepoRoot "scripts\verify-phase200-repeat-full-autopilot-clean-baseline-proof-v1.ps1"))
Assert-True "qa_required" (Test-Path -LiteralPath (Join-Path $RepoRoot "scripts\qa-phase200-repeat-full-autopilot-clean-baseline-proof-v1.ps1"))
Assert-True "clean_repo_pointer_proof_required" (Test-Path -LiteralPath (Join-Path $RepoRoot "scripts\sera-phase200-current-phase-pointer-clean-repo-proof-v1.ps1"))

Write-Host "PHASE200_FIXTURE_PROOF_PASS cases=$($Cases.Count)"
exit 0


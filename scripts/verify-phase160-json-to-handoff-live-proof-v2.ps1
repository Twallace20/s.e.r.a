param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$Phase = 160
$PhaseSlug = "phase160_json_to_handoff_live_proof_v2"
$ExpectedZip = "s.e.r.a_phase160_json_to_handoff_live_proof_v2_overlay.zip"

$Required = @(
  ".overlay\$PhaseSlug.json",
  ".sera-proof\$PhaseSlug.json",
  "docs\phase160-json-to-handoff-live-proof-v2.md",
  "scripts\phase160-json-to-handoff-live-proof-v2.ps1",
  "scripts\verify-phase160-json-to-handoff-live-proof-v2.ps1"
)

$Issues = @()

foreach ($Relative in $Required) {
  $Path = Join-Path $RepoRoot $Relative
  if (!(Test-Path $Path)) { $Issues += "Missing required file: $Relative" }
}

$ManifestPath = Join-Path $RepoRoot ".overlay\$PhaseSlug.json"
if (Test-Path $ManifestPath) {
  try {
    $Manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
    if ($Manifest.phase -ne $Phase) { $Issues += "Manifest phase mismatch." }
    if ($Manifest.phaseSlug -ne $PhaseSlug) { $Issues += "Manifest slug mismatch." }
    if ($Manifest.expectedZipFilename -ne $ExpectedZip) { $Issues += "Manifest expected ZIP mismatch." }
    if ($Manifest.safetyGates.randomRecentChatFallbackAllowed -ne $false) { $Issues += "Random recent chat fallback must be false." }
    if ($Manifest.safetyGates.newChatFallbackAllowed -ne $false) { $Issues += "New chat fallback must be false." }
    if ($Manifest.safetyGates.requiresClosedCleanlyBeforeNext -ne $true) { $Issues += "Closed-cleanly-before-next must be true." }
    if ($Manifest.safetyGates.runnerStartsOnlyAfterExactZipExistsIn13 -ne $true) { $Issues += "Runner must start only after exact ZIP exists in 13." }
    if ($Manifest.runtimeAcceptance.artifactRequestExpectedZipMustMatchCurrentPhase -ne $true) { $Issues += "Runtime acceptance must require fresh request expected ZIP match." }
    if ($Manifest.runtimeAcceptance.noStandaloneNpmTestRequiredForRuntimeProof -ne $true) { $Issues += "Runtime proof must not require standalone npm test." }
  } catch {
    $Issues += "Manifest JSON parse failed: $($_.Exception.Message)"
  }
}

$ProofPath = Join-Path $RepoRoot ".sera-proof\$PhaseSlug.json"
if (Test-Path $ProofPath) {
  try {
    $Proof = Get-Content $ProofPath -Raw | ConvertFrom-Json
    if ($Proof.phase -ne $Phase) { $Issues += "Proof phase mismatch." }
    if ($Proof.phaseSlug -ne $PhaseSlug) { $Issues += "Proof slug mismatch." }
    if ($Proof.expectedZipFilename -ne $ExpectedZip) { $Issues += "Proof expected ZIP mismatch." }
    if ($Proof.assertions.jsonCommandMustCreateFreshArtifactRequest -ne $true) { $Issues += "Proof must require JSON command to create fresh artifact request." }
    if ($Proof.assertions.staleArtifactRequestMustBlock -ne $true) { $Issues += "Proof must block stale artifact requests." }
    if ($Proof.assertions.exactZipRequiredBeforeRunner -ne $true) { $Issues += "Proof must require exact ZIP before runner." }
    if ($Proof.validation.standaloneNpmTestRequired -ne $false) { $Issues += "Standalone npm test must not be required for this runtime proof." }
  } catch {
    $Issues += "Proof JSON parse failed: $($_.Exception.Message)"
  }
}

$Ok = ($Issues.Count -eq 0)
[ordered]@{
  ok = $Ok
  phase = $Phase
  phaseSlug = $PhaseSlug
  expectedZip = $ExpectedZip
  repoRoot = $RepoRoot
  checkedFiles = $Required
  issues = $Issues
} | ConvertTo-Json -Depth 10

if (!$Ok) { exit 1 }
exit 0

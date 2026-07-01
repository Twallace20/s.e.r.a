param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$Phase = 143
$PhaseSlug = "phase143_phone_batch_autopilot_smoke_test_v1"

$Required = @(
  ".overlay\$PhaseSlug.json",
  ".sera-proof\$PhaseSlug.json",
  "docs\phase143-phone-batch-autopilot-smoke-test-v1.md",
  "scripts\phase143-phone-batch-autopilot-smoke-test-v1.ps1",
  "scripts\verify-phase143-phone-batch-autopilot-smoke-test-v1.ps1"
)

$Issues = @()

foreach ($Relative in $Required) {
  $Path = Join-Path $RepoRoot $Relative
  if (!(Test-Path $Path)) {
    $Issues += "Missing required file: $Relative"
  }
}

$ManifestPath = Join-Path $RepoRoot ".overlay\$PhaseSlug.json"
if (Test-Path $ManifestPath) {
  try {
    $Manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
    if ($Manifest.phase -ne $Phase) { $Issues += "Manifest phase mismatch." }
    if ($Manifest.phaseSlug -ne $PhaseSlug) { $Issues += "Manifest slug mismatch." }
    if ($Manifest.safetyGates.randomRecentChatFallbackAllowed -ne $false) { $Issues += "Random recent chat fallback must be false." }
    if ($Manifest.safetyGates.newChatFallbackAllowed -ne $false) { $Issues += "New chat fallback must be false." }
    if ($Manifest.safetyGates.requiresClosedCleanlyBeforeNext -ne $true) { $Issues += "Closed-cleanly-before-next must be true." }
    if ($Manifest.safetyGates.multipleActiveCommandsAllowed -ne $false) { $Issues += "Multiple active commands must not be allowed." }
  } catch {
    $Issues += "Manifest JSON parse failed: $($_.Exception.Message)"
  }
}

$ProofPath = Join-Path $RepoRoot ".sera-proof\$PhaseSlug.json"
if (Test-Path $ProofPath) {
  try {
    $Proof = Get-Content $ProofPath -Raw | ConvertFrom-Json
    if ($Proof.assertions.singleActiveCommandRequired -ne $true) { $Issues += "Proof must require single active command." }
    if ($Proof.assertions.batchModeMustStopOnBlocked -ne $true) { $Issues += "Proof must require batch stop on blocked." }
    if ($Proof.assertions.closedCleanlyRequiredBeforeNextPhase -ne $true) { $Issues += "Proof must require closed cleanly before next phase." }
  } catch {
    $Issues += "Proof JSON parse failed: $($_.Exception.Message)"
  }
}

$Ok = ($Issues.Count -eq 0)

[ordered]@{
  ok = $Ok
  phase = $Phase
  phaseSlug = $PhaseSlug
  repoRoot = $RepoRoot
  checkedFiles = $Required
  issues = $Issues
} | ConvertTo-Json -Depth 10

if (!$Ok) { exit 1 }
exit 0

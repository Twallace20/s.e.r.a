param(
  [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$Required = @(
  ".overlay/phase138_blocked_phase_hotfix_attempt1.json",
  ".sera-proof/phase138_blocked_phase_hotfix_attempt1.json",
  "docs/phase138-blocked-phase-hotfix-attempt1.md",
  "scripts/phase138-blocked-phase-hotfix-attempt1.ps1",
  "scripts/verify-phase138-blocked-phase-hotfix-attempt1.ps1"
)

$Issues = @()

foreach ($Rel in $Required) {
  $Path = Join-Path $RepoRoot $Rel
  if (!(Test-Path $Path)) {
    $Issues += "Missing required file: $Rel"
  }
}

$ManifestPath = Join-Path $RepoRoot ".overlay/phase138_blocked_phase_hotfix_attempt1.json"
$ProofPath = Join-Path $RepoRoot ".sera-proof/phase138_blocked_phase_hotfix_attempt1.json"

if (Test-Path $ManifestPath) {
  $Manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
  if ($Manifest.overlayType -ne "hotfix") { $Issues += "Manifest overlayType must be hotfix." }
  if ($Manifest.phase -ne 138) { $Issues += "Manifest phase must be 138." }
  if ($Manifest.safety.savedChatGptTargetOnly -ne $true) { $Issues += "Manifest must preserve saved ChatGPT target only." }
  if ($Manifest.safety.allowRandomRecentChatFallback -ne $false) { $Issues += "Manifest must disable random recent chat fallback." }
  if ($Manifest.safety.allowNewChatFallback -ne $false) { $Issues += "Manifest must disable new-chat fallback." }
}

if (Test-Path $ProofPath) {
  $Proof = Get-Content $ProofPath -Raw | ConvertFrom-Json
  if ($Proof.ok -ne $true) { $Issues += "Proof ok must be true." }
  if ($Proof.phase -ne 138) { $Issues += "Proof phase must be 138." }
  if ($Proof.hotfixAttempt -ne 1) { $Issues += "Proof hotfixAttempt must be 1." }
}

$Result = [ordered]@{
  ok = ($Issues.Count -eq 0)
  phase = 138
  hotfixAttempt = 1
  repoRoot = $RepoRoot
  checkedFiles = $Required
  issues = $Issues
}

$Result | ConvertTo-Json -Depth 10

if ($Issues.Count -gt 0) {
  exit 1
}

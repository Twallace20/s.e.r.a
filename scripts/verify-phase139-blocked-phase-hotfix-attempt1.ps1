param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

$required = @(
  ".overlay\phase139_blocked_phase_hotfix_attempt1.json",
  ".sera-proof\phase139_blocked_phase_hotfix_attempt1.json",
  "docs\phase139-blocked-phase-hotfix-attempt1.md",
  "scripts\phase139-blocked-phase-hotfix-attempt1.ps1",
  "scripts\verify-phase139-blocked-phase-hotfix-attempt1.ps1"
)

$issues = @()
foreach ($relative in $required) {
  $path = Join-Path $RepoRoot $relative
  if (-not (Test-Path -LiteralPath $path)) {
    $issues += "Missing required file: $relative"
  }
}

$manifestPath = Join-Path $RepoRoot ".overlay\phase139_blocked_phase_hotfix_attempt1.json"
$proofPath = Join-Path $RepoRoot ".sera-proof\phase139_blocked_phase_hotfix_attempt1.json"
$helperPath = Join-Path $RepoRoot "scripts\phase139-blocked-phase-hotfix-attempt1.ps1"

if (Test-Path -LiteralPath $manifestPath) {
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  if ($manifest.phase -ne 139) { $issues += "Manifest phase is not 139." }
  if ($manifest.kind -ne "hotfix") { $issues += "Manifest kind is not hotfix." }
  if ($manifest.route -ne "02_hotfix_approved") { $issues += "Manifest route is not 02_hotfix_approved." }
  if ($manifest.safetyGates.savedChatGptTargetOnly -ne $true) { $issues += "savedChatGptTargetOnly gate missing." }
  if ($manifest.safetyGates.noRandomRecentChatFallback -ne $true) { $issues += "noRandomRecentChatFallback gate missing." }
  if ($manifest.safetyGates.noNewChatFallback -ne $true) { $issues += "noNewChatFallback gate missing." }
}

if (Test-Path -LiteralPath $proofPath) {
  $proof = Get-Content -LiteralPath $proofPath -Raw | ConvertFrom-Json
  if ($proof.phase -ne 139) { $issues += "Proof phase is not 139." }
  if ($proof.coverage.recoverableBlockedStateRecorded -ne $true) { $issues += "Proof does not record recoverable blocked state coverage." }
  if ($proof.coverage.cleanupHelperIncluded -ne $true) { $issues += "Proof does not include cleanup helper coverage." }
}

if (Test-Path -LiteralPath $helperPath) {
  $helper = Get-Content -LiteralPath $helperPath -Raw
  $requiredTerms = @(
    "s.e.r.a_phase139_phase_139_safe_autopilot_continuation_v1_overlay.zip",
    "allowRandomRecentChatFallback = `$false",
    "allowNewChatFallback = `$false",
    "savedTargetOnly = `$true",
    "No credentials, tokens, paid services"
  )
  foreach ($term in $requiredTerms) {
    if ($helper -notlike "*$term*") {
      $issues += "Helper missing required safety/retry term: $term"
    }
  }
}

$result = [ordered]@{
  ok = ($issues.Count -eq 0)
  phase = 139
  hotfixAttempt = 1
  repoRoot = $RepoRoot
  checkedFiles = $required
  issues = $issues
}

$result | ConvertTo-Json -Depth 6
if ($issues.Count -gt 0) { exit 1 }

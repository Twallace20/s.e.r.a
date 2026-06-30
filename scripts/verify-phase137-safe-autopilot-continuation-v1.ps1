<#
.SYNOPSIS
  Verifies Phase 137 Safe Autopilot Continuation v1 overlay package files.
#>

[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$required = @(
  '.overlay\phase137_phase_137_safe_autopilot_continuation_v1.json',
  '.sera-proof\phase137_phase_137_safe_autopilot_continuation_v1.json',
  'scripts\phase137-safe-autopilot-continuation-v1.ps1',
  'scripts\verify-phase137-safe-autopilot-continuation-v1.ps1',
  'docs\phase137-safe-autopilot-continuation-v1.md'
)

$missing = @()
foreach ($relative in $required) {
  $path = Join-Path $RepoRoot $relative
  if (!(Test-Path $path)) { $missing += $relative }
}

$manifestPath = Join-Path $RepoRoot '.overlay\phase137_phase_137_safe_autopilot_continuation_v1.json'
$proofPath = Join-Path $RepoRoot '.sera-proof\phase137_phase_137_safe_autopilot_continuation_v1.json'
$manifest = if (Test-Path $manifestPath) { Get-Content $manifestPath -Raw | ConvertFrom-Json } else { $null }
$proof = if (Test-Path $proofPath) { Get-Content $proofPath -Raw | ConvertFrom-Json } else { $null }

$issues = @()
if ($missing.Count -gt 0) { $issues += "Missing required files: $($missing -join ', ')" }
if ($manifest -and $manifest.phase -ne 137) { $issues += 'Manifest phase must be 137.' }
if ($manifest -and $manifest.safety.savedChatGptTargetOnly -ne $true) { $issues += 'Manifest must preserve saved ChatGPT target only.' }
if ($manifest -and $manifest.safety.allowNewChatFallback -ne $false) { $issues += 'Manifest must forbid new-chat fallback.' }
if ($manifest -and $manifest.safety.allowRandomRecentChatFallback -ne $false) { $issues += 'Manifest must forbid random recent-chat fallback.' }
if ($proof -and $proof.phase -ne 137) { $issues += 'Proof phase must be 137.' }

$result = [ordered]@{
  ok = ($issues.Count -eq 0)
  phase = 137
  name = 'Phase 137 Safe Autopilot Continuation v1'
  repoRoot = $RepoRoot
  checkedFiles = $required
  issues = $issues
}

$result | ConvertTo-Json -Depth 12
if ($issues.Count -gt 0) { exit 2 }
exit 0

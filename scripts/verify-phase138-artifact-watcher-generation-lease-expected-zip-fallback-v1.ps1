<#
.SYNOPSIS
  Verifies Phase 138 Artifact Watcher Generation Lease + Expected ZIP Fallback v1 overlay package files.
#>

[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$required = @(
  '.overlay\phase138_artifact_watcher_generation_lease_expected_zip_fallback_v1.json',
  '.sera-proof\phase138_artifact_watcher_generation_lease_expected_zip_fallback_v1.json',
  'docs\phase138-artifact-watcher-generation-lease-expected-zip-fallback-v1.md',
  'scripts\phase138-artifact-watcher-generation-lease-expected-zip-fallback-v1.ps1',
  'scripts\verify-phase138-artifact-watcher-generation-lease-expected-zip-fallback-v1.ps1'
)

$missing = @()
foreach ($relative in $required) {
  $path = Join-Path $RepoRoot $relative
  if (!(Test-Path $path)) { $missing += $relative }
}

$issues = @()
if ($missing.Count -gt 0) { $issues += "Missing required files: $($missing -join ', ')" }

$manifestPath = Join-Path $RepoRoot '.overlay\phase138_artifact_watcher_generation_lease_expected_zip_fallback_v1.json'
$proofPath = Join-Path $RepoRoot '.sera-proof\phase138_artifact_watcher_generation_lease_expected_zip_fallback_v1.json'
$scriptPath = Join-Path $RepoRoot 'scripts\phase138-artifact-watcher-generation-lease-expected-zip-fallback-v1.ps1'

$manifest = if (Test-Path $manifestPath) { Get-Content $manifestPath -Raw | ConvertFrom-Json } else { $null }
$proof = if (Test-Path $proofPath) { Get-Content $proofPath -Raw | ConvertFrom-Json } else { $null }
$script = if (Test-Path $scriptPath) { Get-Content $scriptPath -Raw } else { '' }

if ($manifest -and $manifest.phase -ne 138) { $issues += 'Manifest phase must be 138.' }
if ($proof -and $proof.phase -ne 138) { $issues += 'Proof phase must be 138.' }
if ($manifest -and $manifest.safety.savedChatGptTargetOnly -ne $true) { $issues += 'Manifest must preserve saved ChatGPT target only.' }
if ($manifest -and $manifest.safety.allowNewChatFallback -ne $false) { $issues += 'Manifest must forbid new-chat fallback.' }
if ($manifest -and $manifest.safety.allowRandomRecentChatFallback -ne $false) { $issues += 'Manifest must forbid random recent-chat fallback.' }

$requiredScriptMarkers = @(
  'generation_lease',
  'doNotRefresh',
  'doNotResubmit',
  'doNotEscalateBeforeLeaseExpires',
  'expectedZipFilename',
  'exact_expectedZipFilename',
  'phase138-stale-prompt-references',
  'allowNewChatFallback = $false',
  'allowRandomRecentChatFallback = $false',
  'SERA_ChatGPT_Artifact_Watcher-action1.vbs',
  'SERA_Phone_Control_Watcher-action1.vbs'
)
foreach ($marker in $requiredScriptMarkers) {
  if ($script -notlike "*$marker*") { $issues += "Script is missing required marker: $marker" }
}

$result = [ordered]@{
  ok = ($issues.Count -eq 0)
  phase = 138
  name = 'Artifact Watcher Generation Lease + Expected ZIP Fallback v1'
  repoRoot = $RepoRoot
  checkedFiles = $required
  coverage = [ordered]@{
    generationLeaseBehavior = ($script -like '*generation_lease*')
    noRefreshDuringLease = ($script -like '*doNotRefresh*')
    noResubmitDuringLease = ($script -like '*doNotResubmit*')
    expectedZipExactFallback = ($script -like '*exact_expectedZipFilename*')
    stalePromptArchive = ($script -like '*phase138-stale-prompt-references*')
    savedTargetOnly = ($manifest -and $manifest.safety.savedChatGptTargetOnly -eq $true)
  }
  issues = $issues
}

$result | ConvertTo-Json -Depth 16
if ($issues.Count -gt 0) { exit 2 }
exit 0

param(
  [string]$RepoRoot = (Get-Location).Path,
  [switch]$WriteRuntimeSpec
)

$ErrorActionPreference = "Stop"
$PhaseSlug = "phase144_no_refresh_browser_submission_lock_onedrive_inbox_sync_guard_v1"
$Output = [ordered]@{
  ok = $true
  phase = 144
  phaseSlug = $PhaseSlug
  repoRoot = $RepoRoot
  mode = "spec-only-runtime-guard"
  browserNoRefreshWhileActive = $true
  oneDriveHydrationGuardRequired = $true
  onePromptSubmissionPerCommand = $true
  duplicateSubmissionBlocks = $true
  downloadCompletionEvidenceRequired = $true
  savedChatGptTargetOnly = $true
  allowRandomRecentChatFallback = $false
  allowNewChatFallback = $false
  safetyGatesPreserved = $true
}

if ($WriteRuntimeSpec) {
  $SpecDir = Join-Path $RepoRoot ".sera-proof"
  New-Item -ItemType Directory -Force $SpecDir | Out-Null
  $SpecPath = Join-Path $SpecDir "$PhaseSlug.runtime-policy.json"
  $Output | ConvertTo-Json -Depth 20 | Set-Content -Path $SpecPath -Encoding UTF8
  $Output.runtimePolicyPath = $SpecPath
}

$Output | ConvertTo-Json -Depth 20

param(
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$ExpectedZipFilename = "s.e.r.a_phase141_browser_duplicate_generation_lock_download_completion_guard_v1_overlay.zip",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

$Phase = "phase141"
$GuardDir = Join-Path $AutoOpsRoot "00_control_center\runtime_guard"
$EvidenceDir = Join-Path $AutoOpsRoot "00_control_center\evidence"
$GuardPath = Join-Path $GuardDir "phase141-browser-duplicate-generation-lock-download-completion-guard-v1.json"
$EvidencePath = Join-Path $EvidenceDir ("phase141-browser-duplicate-generation-lock-download-completion-guard-v1-{0}.json" -f (Get-Date -Format "yyyyMMdd_HHmmss"))

$Guard = [ordered]@{
  schemaVersion = 1
  phase = 141
  phaseSlug = "phase141_browser_duplicate_generation_lock_download_completion_guard_v1"
  expectedZipFilename = $ExpectedZipFilename
  promptSubmissionLockRequired = $true
  maxPromptSubmissionsPerCommand = 1
  generationLeaseRequired = $true
  duplicatePromptSubmissionOutcome = "BLOCKED_PACKET"
  duplicateArtifactGenerationOutcome = "BLOCKED_PACKET"
  staleHandoffCompletionAllowed = $false
  downloadCompleteEvidenceRequired = $true
  mergeApprovalSourceEvidenceRequired = $true
  savedChatGptTargetOnly = $true
  allowRandomRecentChatFallback = $false
  allowNewChatFallback = $false
  noCredentials = $true
  noTokens = $true
  noPaidServices = $true
  noGithubSettingsChanges = $true
  noSelfMerge = $true
  noProductionDeployment = $true
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
}

if ($Apply) {
  New-Item -ItemType Directory -Force $GuardDir | Out-Null
  New-Item -ItemType Directory -Force $EvidenceDir | Out-Null
  $Guard | ConvertTo-Json -Depth 20 | Set-Content -Path $GuardPath -Encoding UTF8
}

$Evidence = [ordered]@{
  ok = $true
  phase = 141
  mode = if ($Apply) { "apply" } else { "dry-run" }
  guardPath = $GuardPath
  evidencePath = $EvidencePath
  expectedZipFilename = $ExpectedZipFilename
  duplicatePromptSubmissionOutcome = "BLOCKED_PACKET"
  duplicateArtifactGenerationOutcome = "BLOCKED_PACKET"
  staleHandoffCompletionAllowed = $false
  downloadCompleteEvidenceRequired = $true
  mergeApprovalSourceEvidenceRequired = $true
  safety = @{
    savedChatGptTargetOnly = $true
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
    noCredentials = $true
    noTokens = $true
    noPaidServices = $true
    noGithubSettingsChanges = $true
    noSelfMerge = $true
    noProductionDeployment = $true
  }
  createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
}

if ($Apply) {
  $Evidence | ConvertTo-Json -Depth 20 | Set-Content -Path $EvidencePath -Encoding UTF8
}

$Evidence | ConvertTo-Json -Depth 20

param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$RequiredFiles = @(
  ".overlay\phase141_browser_duplicate_generation_lock_download_completion_guard_v1.json",
  ".sera-proof\phase141_browser_duplicate_generation_lock_download_completion_guard_v1.json",
  "docs\phase141-browser-duplicate-generation-lock-download-completion-guard-v1.md",
  "scripts\phase141-browser-duplicate-generation-lock-download-completion-guard-v1.ps1",
  "scripts\verify-phase141-browser-duplicate-generation-lock-download-completion-guard-v1.ps1"
)

$Issues = New-Object System.Collections.Generic.List[string]

foreach ($Rel in $RequiredFiles) {
  $Path = Join-Path $RepoRoot $Rel
  if (!(Test-Path $Path)) {
    $Issues.Add("Missing required file: $Rel")
  }
}

$OverlayPath = Join-Path $RepoRoot ".overlay\phase141_browser_duplicate_generation_lock_download_completion_guard_v1.json"
$ProofPath = Join-Path $RepoRoot ".sera-proof\phase141_browser_duplicate_generation_lock_download_completion_guard_v1.json"
$DocPath = Join-Path $RepoRoot "docs\phase141-browser-duplicate-generation-lock-download-completion-guard-v1.md"
$ScriptPath = Join-Path $RepoRoot "scripts\phase141-browser-duplicate-generation-lock-download-completion-guard-v1.ps1"

if (Test-Path $OverlayPath) {
  $Overlay = Get-Content $OverlayPath -Raw | ConvertFrom-Json
  if ($Overlay.phase -ne 141) { $Issues.Add("Overlay phase is not 141.") }
  if ($Overlay.expectedZipFilename -ne "s.e.r.a_phase141_browser_duplicate_generation_lock_download_completion_guard_v1_overlay.zip") { $Issues.Add("Overlay expected ZIP filename mismatch.") }
  if ($Overlay.safetyGates.randomRecentChatFallbackAllowed -ne $false) { $Issues.Add("Random recent-chat fallback must be false.") }
  if ($Overlay.safetyGates.newChatFallbackAllowed -ne $false) { $Issues.Add("New chat fallback must be false.") }
  if ($Overlay.runtimeGuards.downloadCompleteEvidenceRequired -ne $true) { $Issues.Add("Download completion evidence must be required.") }
  if ($Overlay.runtimeGuards.staleHandoffCompletionAllowed -ne $false) { $Issues.Add("Stale handoff completion must be disallowed.") }
  if ($Overlay.runtimeGuards.mergeApprovalSourceEvidenceRequired -ne $true) { $Issues.Add("Merge approval source evidence must be required.") }
}

if (Test-Path $ProofPath) {
  $ProofRaw = Get-Content $ProofPath -Raw
  foreach ($Phrase in @(
    "Duplicate generation",
    "download completion",
    "stale handoff",
    "merge approval source",
    "noRandomChatFallback",
    "noNewChatFallback"
  )) {
    if ($ProofRaw -notmatch [regex]::Escape($Phrase)) {
      $Issues.Add("Proof file missing required phrase: $Phrase")
    }
  }
}

if (Test-Path $DocPath) {
  $DocRaw = Get-Content $DocPath -Raw
  foreach ($Phrase in @(
    "Prompt submission lock",
    "Generation lease",
    "Download completion evidence",
    "Stale handoff protection",
    "Merge approval source evidence"
  )) {
    if ($DocRaw -notmatch [regex]::Escape($Phrase)) {
      $Issues.Add("Doc missing required section/phrase: $Phrase")
    }
  }
}

if (Test-Path $ScriptPath) {
  $ScriptRaw = Get-Content $ScriptPath -Raw
  foreach ($Phrase in @(
    "duplicatePromptSubmissionOutcome",
    "duplicateArtifactGenerationOutcome",
    "downloadCompleteEvidenceRequired",
    "mergeApprovalSourceEvidenceRequired",
    "staleHandoffCompletionAllowed"
  )) {
    if ($ScriptRaw -notmatch [regex]::Escape($Phrase)) {
      $Issues.Add("Runtime script missing guard field: $Phrase")
    }
  }
}

$Result = [ordered]@{
  ok = ($Issues.Count -eq 0)
  phase = 141
  phaseSlug = "phase141_browser_duplicate_generation_lock_download_completion_guard_v1"
  repoRoot = $RepoRoot
  checkedFiles = $RequiredFiles
  issues = @($Issues)
}

$Result | ConvertTo-Json -Depth 20

if ($Issues.Count -gt 0) {
  exit 1
}

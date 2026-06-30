param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$PhaseSlug = "phase142_autoops_extraction_intake_self_test_continuation_queue_v1"

$RequiredFiles = @(
  ".overlay\phase142_autoops_extraction_intake_self_test_continuation_queue_v1.json",
  ".sera-proof\phase142_autoops_extraction_intake_self_test_continuation_queue_v1.json",
  "docs\phase142-autoops-extraction-intake-self-test-continuation-queue-v1.md",
  "scripts\phase142-autoops-extraction-intake-self-test-continuation-queue-v1.ps1",
  "scripts\verify-phase142-autoops-extraction-intake-self-test-continuation-queue-v1.ps1"
)

$Issues = New-Object System.Collections.Generic.List[string]

foreach ($Rel in $RequiredFiles) {
  $Path = Join-Path $RepoRoot $Rel
  if (!(Test-Path $Path)) {
    $Issues.Add("Missing required file: $Rel")
  }
}

$OverlayPath = Join-Path $RepoRoot ".overlay\phase142_autoops_extraction_intake_self_test_continuation_queue_v1.json"
$ProofPath = Join-Path $RepoRoot ".sera-proof\phase142_autoops_extraction_intake_self_test_continuation_queue_v1.json"
$DocPath = Join-Path $RepoRoot "docs\phase142-autoops-extraction-intake-self-test-continuation-queue-v1.md"
$ScriptPath = Join-Path $RepoRoot "scripts\phase142-autoops-extraction-intake-self-test-continuation-queue-v1.ps1"

if (Test-Path $OverlayPath) {
  $Overlay = Get-Content $OverlayPath -Raw | ConvertFrom-Json
  if ($Overlay.phase -ne 142) { $Issues.Add("Overlay phase is not 142.") }
  if ($Overlay.phaseSlug -ne $PhaseSlug) { $Issues.Add("Overlay phase slug mismatch.") }
  if ($Overlay.expectedZipFilename -ne "s.e.r.a_phase142_autoops_extraction_intake_self_test_continuation_queue_v1_overlay.zip") {
    $Issues.Add("Overlay expected ZIP filename mismatch.")
  }
  if ($Overlay.intakeGuards.zipExtractionSelfTestBeforeBranchCreation -ne $true) {
    $Issues.Add("Extraction self-test before branch creation must be required.")
  }
  if ($Overlay.intakeGuards.manifestLookupRequiredBeforeGitBranchMutation -ne $true) {
    $Issues.Add("Manifest lookup before git mutation must be required.")
  }
  if ($Overlay.intakeGuards.branchExistsOutcome -ne "SWITCH_AND_REUSE_BRANCH_IF_CLEAN") {
    $Issues.Add("Branch-exists outcome must switch/reuse clean branch.")
  }
  if ($Overlay.intakeGuards.oneActiveCommandOnly -ne $true) {
    $Issues.Add("One active command lock must be required.")
  }
  if ($Overlay.intakeGuards.stopOnBlocked -ne $true) {
    $Issues.Add("Stop on blocked must be required.")
  }
  if ($Overlay.intakeGuards.requireClosedCleanlyBeforeNext -ne $true) {
    $Issues.Add("Require CLOSED_CLEANLY before next must be true.")
  }
  if ($Overlay.intakeGuards.continuationPacketRequiredOnBlocked -ne $true) {
    $Issues.Add("Continuation packet after blocked must be required.")
  }
  if ($Overlay.intakeGuards.staleHandoffCompletionAllowed -ne $false) {
    $Issues.Add("Stale handoff completion must be disallowed.")
  }
  if ($Overlay.phoneAutopilotPolicy.unattendedMultiPhaseAllowed -ne $false) {
    $Issues.Add("Unattended multi-phase must remain false.")
  }
  if ($Overlay.safetyGates.randomRecentChatFallbackAllowed -ne $false) {
    $Issues.Add("Random recent-chat fallback must be false.")
  }
  if ($Overlay.safetyGates.newChatFallbackAllowed -ne $false) {
    $Issues.Add("New chat fallback must be false.")
  }
}

if (Test-Path $ProofPath) {
  $ProofRaw = Get-Content $ProofPath -Raw
  foreach ($Phrase in @(
    "ZIP extraction self-test",
    "Only one active command",
    "Sequential/batch queue",
    "blocked handoff",
    "stale handoffs",
    "guarded single-phase"
  )) {
    if ($ProofRaw -notmatch [regex]::Escape($Phrase)) {
      $Issues.Add("Proof file missing required phrase: $Phrase")
    }
  }
}

if (Test-Path $DocPath) {
  $DocRaw = Get-Content $DocPath -Raw
  foreach ($Phrase in @(
    "ZIP extraction self-test before branch creation",
    "Branch idempotency",
    "One-active-command lock",
    "Continuation packet after BLOCKED",
    "Sequential queue behavior",
    "Stale handoff protection",
    "Download and routing proof"
  )) {
    if ($DocRaw -notmatch [regex]::Escape($Phrase)) {
      $Issues.Add("Doc missing required section/phrase: $Phrase")
    }
  }
}

if (Test-Path $ScriptPath) {
  $ScriptRaw = Get-Content $ScriptPath -Raw
  foreach ($Phrase in @(
    "zipExtractionSelfTestBeforeBranchCreation",
    "manifestLookupRequiredBeforeGitBranchMutation",
    "SWITCH_AND_REUSE_BRANCH_IF_CLEAN",
    "oneActiveCommandOnly",
    "stopOnBlocked",
    "requireClosedCleanlyBeforeNext",
    "continuationPacketRequiredOnBlocked",
    "downloadCompletionEvidenceRequired"
  )) {
    if ($ScriptRaw -notmatch [regex]::Escape($Phrase)) {
      $Issues.Add("Runtime script missing required field: $Phrase")
    }
  }
}

$Result = [ordered]@{
  ok = ($Issues.Count -eq 0)
  phase = 142
  phaseSlug = $PhaseSlug
  repoRoot = $RepoRoot
  checkedFiles = $RequiredFiles
  issues = @($Issues)
}

$Result | ConvertTo-Json -Depth 20

if ($Issues.Count -gt 0) {
  exit 1
}

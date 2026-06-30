param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$RequiredFiles = @(
  ".overlay\phase140_safe_autopilot_recovery_branch_idempotent_intake_v1.json",
  ".sera-proof\phase140_safe_autopilot_recovery_branch_idempotent_intake_v1.json",
  "docs\phase140-safe-autopilot-recovery-branch-idempotent-intake-v1.md",
  "scripts\phase140-safe-autopilot-recovery-branch-idempotent-intake-v1.ps1",
  "scripts\verify-phase140-safe-autopilot-recovery-branch-idempotent-intake-v1.ps1"
)

$Issues = New-Object System.Collections.Generic.List[string]

foreach ($Rel in $RequiredFiles) {
  $Path = Join-Path $RepoRoot $Rel
  if (!(Test-Path $Path)) {
    $Issues.Add("Missing required file: $Rel")
  }
}

$ManifestPath = Join-Path $RepoRoot ".overlay\phase140_safe_autopilot_recovery_branch_idempotent_intake_v1.json"
$ProofPath = Join-Path $RepoRoot ".sera-proof\phase140_safe_autopilot_recovery_branch_idempotent_intake_v1.json"
$DocPath = Join-Path $RepoRoot "docs\phase140-safe-autopilot-recovery-branch-idempotent-intake-v1.md"

if (Test-Path $ManifestPath) {
  $Manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
  if ($Manifest.phase -ne 140) { $Issues.Add("Manifest phase is not 140.") }
  if ($Manifest.branch -ne "work/phase140-safe-autopilot-recovery-branch-idempotent-intake-v1") { $Issues.Add("Manifest branch is not the Phase 140 branch.") }
  if ($Manifest.safetyGates.savedChatGptTargetOnly -ne $true) { $Issues.Add("savedChatGptTargetOnly is not true.") }
  if ($Manifest.safetyGates.allowRandomRecentChatFallback -ne $false) { $Issues.Add("Random recent-chat fallback is not false.") }
  if ($Manifest.safetyGates.allowNewChatFallback -ne $false) { $Issues.Add("New chat fallback is not false.") }
  if ($Manifest.safetyGates.selfMergeAllowed -ne $false) { $Issues.Add("selfMergeAllowed is not false.") }
}

if (Test-Path $ProofPath) {
  $Proof = Get-Content $ProofPath -Raw | ConvertFrom-Json
  if ($Proof.phase -ne 140) { $Issues.Add("Proof phase is not 140.") }
  if ($Proof.requiredRuntimeRules.branchIdempotency -notmatch "branch already exists") { $Issues.Add("Proof branch idempotency rule is missing existing-branch language.") }
  if ($Proof.requiredRuntimeRules.staleHandoffIsolation -notmatch "command id") { $Issues.Add("Proof stale handoff isolation rule is missing command id match.") }
  if ($Proof.requiredRuntimeRules.duplicateGenerationHandling -notmatch "blocked evidence") { $Issues.Add("Proof duplicate generation rule is missing blocked evidence language.") }
}

if (Test-Path $DocPath) {
  $Doc = Get-Content $DocPath -Raw
  foreach ($Phrase in @(
    "Phase 140",
    "Branch idempotency rule",
    "Stale handoff isolation rule",
    "Duplicate generation rule",
    "13_chatgpt_downloads is the capture/source folder",
    "Saved ChatGPT target only",
    "No random chat fallback",
    "No new-chat fallback"
  )) {
    if ($Doc -notmatch [regex]::Escape($Phrase)) {
      $Issues.Add("Document missing phrase: $Phrase")
    }
  }
}

$Result = [ordered]@{
  ok = ($Issues.Count -eq 0)
  phase = 140
  phaseId = "phase140-safe-autopilot-recovery-branch-idempotent-intake-v1"
  checkedFiles = $RequiredFiles
  issues = @($Issues)
}

$Result | ConvertTo-Json -Depth 20

if ($Issues.Count -gt 0) {
  exit 1
}

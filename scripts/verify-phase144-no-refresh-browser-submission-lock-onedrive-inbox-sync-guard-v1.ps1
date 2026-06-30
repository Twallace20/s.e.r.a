param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
$PhaseSlug = "phase144_no_refresh_browser_submission_lock_onedrive_inbox_sync_guard_v1"
$RequiredFiles = @(
  ".overlay\$PhaseSlug.json",
  ".sera-proof\$PhaseSlug.json",
  "docs\phase144-no-refresh-browser-submission-lock-onedrive-inbox-sync-guard-v1.md",
  "scripts\phase144-no-refresh-browser-submission-lock-onedrive-inbox-sync-guard-v1.ps1",
  "scripts\verify-phase144-no-refresh-browser-submission-lock-onedrive-inbox-sync-guard-v1.ps1"
)

$Issues = @()
foreach ($Relative in $RequiredFiles) {
  $Path = Join-Path $RepoRoot $Relative
  if (!(Test-Path $Path)) {
    $Issues += "Missing required file: $Relative"
  }
}

$ManifestPath = Join-Path $RepoRoot ".overlay\$PhaseSlug.json"
if (Test-Path $ManifestPath) {
  $Manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
  if ($Manifest.phase -ne 144) { $Issues += "Manifest phase is not 144." }
  if ($Manifest.safetyGates.allowRandomRecentChatFallback -ne $false) { $Issues += "Random recent chat fallback must remain false." }
  if ($Manifest.safetyGates.allowNewChatFallback -ne $false) { $Issues += "New chat fallback must remain false." }
  if ($Manifest.safetyGates.savedChatGptTargetOnly -ne $true) { $Issues += "Saved ChatGPT target guard must remain true." }
  if ($Manifest.scope.disableRefreshDuringPromptTyping -ne $true) { $Issues += "Prompt typing no-refresh guard missing." }
  if ($Manifest.scope.disableRefreshDuringGenerationLease -ne $true) { $Issues += "Generation lease no-refresh guard missing." }
  if ($Manifest.scope.onedriveInboxHydrationGuard -ne $true) { $Issues += "OneDrive inbox hydration guard missing." }
  if ($Manifest.scope.downloadCompletionGuard -ne $true) { $Issues += "Download completion guard missing." }
}

$ProofPath = Join-Path $RepoRoot ".sera-proof\$PhaseSlug.json"
if (Test-Path $ProofPath) {
  $Proof = Get-Content $ProofPath -Raw | ConvertFrom-Json
  if ($Proof.claims.preservesSafetyGates -ne $true) { $Issues += "Proof does not preserve safety gates." }
  if ($Proof.claims.requiresNoRefreshWhileActive -ne $true) { $Issues += "Proof does not require no-refresh while active." }
  if ($Proof.claims.requiresOneDriveHydrationGuard -ne $true) { $Issues += "Proof does not require OneDrive hydration guard." }
}

$Result = [ordered]@{
  ok = ($Issues.Count -eq 0)
  phase = 144
  phaseSlug = $PhaseSlug
  repoRoot = $RepoRoot
  checkedFiles = $RequiredFiles
  issues = $Issues
}

$Result | ConvertTo-Json -Depth 20
if ($Issues.Count -gt 0) { exit 1 }

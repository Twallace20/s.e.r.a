[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)
$ErrorActionPreference = "Stop"
$Phase = 199
$PhaseSlug = "phase199_post_closeout_clean_repo_endurance_autopilot_v1"
$PhaseName = "s.e.r.a_phase199_post_closeout_clean_repo_endurance_autopilot_v1_overlay"
$ExpectedZipFilename = "s.e.r.a_phase199_post_closeout_clean_repo_endurance_autopilot_v1_overlay.zip"
$Phase198Commit = "edbb3d2e842a1353eb88955b8cc702b92e0ce287"
$Phase198Tag = "phase-198-second-consecutive-full-autopilot-production-stability-proof-v1"
$BrowserSubmitHotfixCommit = "5348b8410e2101d20567c6356eef09404fc295cb"
$DownloadsDir = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$HandoffDir = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $HandoffDir | Out-Null

function Get-Sha256Hex([string]$Path) { (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
function Assert-File([string]$Path) { if (!(Test-Path -LiteralPath $Path)) { throw "Missing required file: $Path" } }
function Assert-Contains([string]$Path, [string]$Needle) { $t = Get-Content -LiteralPath $Path -Raw; if ($t -notlike "*$Needle*") { throw "Missing marker '$Needle' in $Path" } }
function Assert-ParseClean([string]$Path) {
  $tokens = $null; $errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$tokens, [ref]$errors) | Out-Null
  if ($errors -and $errors.Count -gt 0) { throw "PowerShell parse failed for ${Path}: $($errors[0].Message)" }
}
function Write-Handoff([string]$Status, [string]$Reason, [string[]]$ProofLines) {
  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Path = Join-Path $HandoffDir ("{0}-{1}-{2}.md" -f $PhaseName, $Stamp, $Status)
  @"
Status: $Status
Phase: $PhaseName
Branch: work/phase199-post-closeout-clean-repo-endurance-autopilot-v1
Timestamp: $Stamp

Reason:
$Reason

Proof:
$($ProofLines -join "`n")
"@ | Set-Content -LiteralPath $Path -Encoding UTF8
  return $Path
}

try {
  Set-Location $RepoRoot
  $ManifestPath = Join-Path $RepoRoot ".overlay\manifest.json"
  $ProofPath = Join-Path $RepoRoot ".sera-proof\phase199_post_closeout_clean_repo_endurance_autopilot_v1_overlay_proof.json"
  $CommandPath = Join-Path $RepoRoot "commands\phase199-post-closeout-clean-repo-endurance-autopilot-v1.command.json"
  $FixtureScript = Join-Path $RepoRoot "scripts\phase199-post-closeout-clean-repo-endurance-autopilot-fixtures-v1.ps1"
  $CleanRepoProof = Join-Path $RepoRoot "scripts\sera-phase199-current-phase-pointer-clean-repo-proof-v1.ps1"
  $Gate = Join-Path $RepoRoot "scripts\sera-post-closeout-clean-repo-endurance-autopilot-v1.ps1"
  $Qa = Join-Path $RepoRoot "scripts\qa-phase199-post-closeout-clean-repo-endurance-autopilot-v1.ps1"
  $Bridge = Join-Path $RepoRoot "scripts\sera-chatgpt-browser-bridge-v1.ps1"

  foreach ($Path in @($ManifestPath,$ProofPath,$CommandPath,$FixtureScript,$CleanRepoProof,$Gate,$Qa)) { Assert-File $Path }
  foreach ($Path in @($FixtureScript,$CleanRepoProof,$Gate,$Qa)) { Assert-ParseClean $Path }

  $Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
  $Proof = Get-Content -LiteralPath $ProofPath -Raw | ConvertFrom-Json
  $Command = Get-Content -LiteralPath $CommandPath -Raw | ConvertFrom-Json
  if ([string]$Manifest.phaseSlug -ne $PhaseSlug) { throw "Manifest phaseSlug mismatch: $($Manifest.phaseSlug)" }
  if ([string]$Manifest.expectedZipFilename -ne $ExpectedZipFilename) { throw "Manifest expectedZipFilename mismatch: $($Manifest.expectedZipFilename)" }
  if ([string]$Proof.phaseSlug -ne $PhaseSlug) { throw "Proof phaseSlug mismatch: $($Proof.phaseSlug)" }
  if ([string]$Command.phaseSlug -ne $PhaseSlug) { throw "Command phaseSlug mismatch: $($Command.phaseSlug)" }
  if ($Command.savedChatGptTargetOnly -ne $true) { throw "savedChatGptTargetOnly must be true" }
  if ($Command.allowRandomRecentChatFallback -ne $false) { throw "allowRandomRecentChatFallback must be false" }
  if ($Command.allowNewChatFallback -ne $false) { throw "allowNewChatFallback must be false" }

  $HashFailures = @()
  foreach ($Entry in @($Manifest.files)) {
    $Rel = ([string]$Entry.path) -replace '^repo/', ''
    if ($Rel -eq ".overlay/manifest.json" -or $Rel -eq ".overlay\manifest.json") { continue }
    $Abs = Join-Path $RepoRoot ($Rel -replace '/', '\')
    if (!(Test-Path -LiteralPath $Abs)) { $HashFailures += "$($Entry.path): missing"; continue }
    $Actual = Get-Sha256Hex $Abs
    if ($Entry.sha256 -and $Actual -ne ([string]$Entry.sha256).ToLowerInvariant()) { $HashFailures += "$($Entry.path): expected $($Entry.sha256) actual $Actual" }
  }
  if ($HashFailures.Count -gt 0) { throw "Manifest hash validation failed: $($HashFailures -join '; ')" }

  $ZipPath = Join-Path $DownloadsDir $ExpectedZipFilename
  Assert-File $ZipPath
  $ZipHash = Get-Sha256Hex $ZipPath

  $Phase198Local = (git rev-list -n 1 $Phase198Tag).Trim()
  if ($Phase198Local -ne $Phase198Commit) { throw "Phase198 local tag mismatch: $Phase198Local" }
  $Phase198Remote = (git ls-remote --tags origin "refs/tags/$Phase198Tag" | ForEach-Object { ($_ -split "\s+")[0] } | Select-Object -First 1)
  if ($Phase198Remote -ne $Phase198Commit) { throw "Phase198 remote tag mismatch: $Phase198Remote" }
  $HotfixInHistory = (git merge-base --is-ancestor $BrowserSubmitHotfixCommit HEAD; if ($LASTEXITCODE -eq 0) { "true" } else { "false" })
  if ($HotfixInHistory -ne "true") { throw "Browser-submit hotfix commit is not in HEAD ancestry: $BrowserSubmitHotfixCommit" }
  Assert-File $Bridge
  foreach ($Needle in @("prompt_submit_empty_composer_before_send","prompt_submit_unconfirmed_after_retry","safe_block_no_zip_wait_until_submit_confirmed","prompt_submitted_by_button_verified_user_message","prompt_submitted_by_button_verified_generating")) { Assert-Contains $Bridge $Needle }

  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $FixtureScript -RepoRoot $RepoRoot
  if ($LASTEXITCODE -ne 0) { throw "Phase199 fixture proof failed." }
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $CleanRepoProof -AutoOpsRoot $AutoOpsRoot
  if ($LASTEXITCODE -ne 0) { throw "Phase199 pointer clean-repo proof failed." }

  $ProofLines = @(
    "VERIFY_PASS phase=199",
    "expected zip: $ZipPath",
    "sha256: $ZipHash",
    "Phase198 local and remote tag verified at $Phase198Commit",
    "Browser-submit hotfix baseline verified at $BrowserSubmitHotfixCommit",
    "Bridge contains submit retry/confirmation markers",
    "Manifest, proof, command, verifier, QA, fixture, and clean-repo proof contracts validated",
    "PHASE199_POINTER_CLEAN_REPO_PROOF_PASS",
    "PHASE199_FIXTURE_PROOF_PASS"
  )
  $Out = Write-Handoff -Status "VERIFY_PASS" -Reason "Phase199 verifier passed for exact ZIP, Phase198 baseline, browser-submit hotfix baseline, and clean-repo endurance contracts." -ProofLines $ProofLines
  Write-Host "VERIFY_PASS phase=199 zip=$ZipPath sha256=$ZipHash handoff=$Out"
  exit 0
} catch {
  $Reason = $_.Exception.Message
  $Out = Write-Handoff -Status "BLOCKED" -Reason $Reason -ProofLines @("VERIFY_BLOCKED phase=199","RepoRoot=$RepoRoot","AutoOpsRoot=$AutoOpsRoot","ExpectedZipFilename=$ExpectedZipFilename")
  Write-Host "BLOCKED phase=199 reason=$Reason handoff=$Out"
  exit 1
}

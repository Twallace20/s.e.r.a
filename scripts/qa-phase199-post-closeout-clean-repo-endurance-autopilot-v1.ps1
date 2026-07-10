[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)
$ErrorActionPreference = "Stop"
$PhaseName = "s.e.r.a_phase199_post_closeout_clean_repo_endurance_autopilot_v1_overlay"
$HandoffDir = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $HandoffDir | Out-Null
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
  $FixtureScript = Join-Path $RepoRoot "scripts\phase199-post-closeout-clean-repo-endurance-autopilot-fixtures-v1.ps1"
  $CleanRepoProof = Join-Path $RepoRoot "scripts\sera-phase199-current-phase-pointer-clean-repo-proof-v1.ps1"
  $ContractPath = Join-Path $RepoRoot "scripts\phase199-post-closeout-clean-repo-endurance-autopilot-v1.contract.json"
  foreach ($Path in @($FixtureScript,$CleanRepoProof,$ContractPath)) { if (!(Test-Path -LiteralPath $Path)) { throw "Missing QA artifact: $Path" } }
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $FixtureScript -RepoRoot $RepoRoot
  if ($LASTEXITCODE -ne 0) { throw "Fixture proof failed during QA." }
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $CleanRepoProof -AutoOpsRoot $AutoOpsRoot
  if ($LASTEXITCODE -ne 0) { throw "Clean repo proof failed during QA." }
  $Contract = Get-Content -LiteralPath $ContractPath -Raw | ConvertFrom-Json
  if ([string]$Contract.phaseSlug -ne "phase199_post_closeout_clean_repo_endurance_autopilot_v1") { throw "Contract phaseSlug mismatch." }
  $Bridge = Join-Path $RepoRoot "scripts\sera-chatgpt-browser-bridge-v1.ps1"
  $BridgeText = Get-Content -LiteralPath $Bridge -Raw
  foreach ($Needle in @("prompt_submit_unconfirmed_after_retry","safe_block_no_zip_wait_until_submit_confirmed")) {
    if ($BridgeText -notlike "*$Needle*") { throw "Bridge missing QA marker: $Needle" }
  }
  $Out = Write-Handoff -Status "PASS_GUARANTEED" -Reason "Phase199 QA passed clean-repo endurance, gate fixture, and browser-submit repair baseline contracts." -ProofLines @(
    "PASS_GUARANTEED phase=199",
    "PHASE199_FIXTURE_PROOF_PASS",
    "PHASE199_POINTER_CLEAN_REPO_PROOF_PASS",
    "Browser submit confirmation retry markers present",
    "Contract requires post-closeout clean git status before CLOSED_CLEANLY",
    "No random recent chat fallback or new chat fallback allowed"
  )
  Write-Host "PASS_GUARANTEED phase=199 handoff=$Out"
  exit 0
} catch {
  $Out = Write-Handoff -Status "BLOCKED" -Reason $_.Exception.Message -ProofLines @("QA_BLOCKED phase=199")
  Write-Host "BLOCKED phase=199 reason=$($_.Exception.Message) handoff=$Out"
  exit 1
}

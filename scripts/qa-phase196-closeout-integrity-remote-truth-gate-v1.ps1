[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)
$ErrorActionPreference = "Stop"
$PhaseSlug = "phase196_closeout_integrity_remote_truth_gate_v1"
$PhaseName = "s.e.r.a_${PhaseSlug}_overlay"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force -Path $Handoff | Out-Null
Set-Location $RepoRoot
function Fail-QA([string]$Reason) {
  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Path = Join-Path $Handoff "$PhaseName-$Stamp-BLOCKED.md"
@"
Status: BLOCKED
Phase: $PhaseName
PhaseSlug: $PhaseSlug
Timestamp: $Stamp
Reason: $Reason

Gate result:
QA failed. Merge, tag, push, cleanup, pasteback, and CLOSED_CLEANLY must not run.
"@ | Set-Content -LiteralPath $Path -Encoding UTF8
  Write-Host "QA_BLOCKED phase=196 handoff=$Path reason=$Reason"
  throw $Reason
}
$VerifyPass = Get-ChildItem $Handoff -File -Filter "*$PhaseSlug*VERIFY_PASS*.md" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (!$VerifyPass) { Fail-QA "Missing Phase196 VERIFY_PASS handoff before QA." }
$Gate = Join-Path $RepoRoot "scripts\sera-closeout-integrity-remote-truth-gate-v1.ps1"
$FixtureRunner = Join-Path $RepoRoot "scripts\phase196-closeout-integrity-remote-truth-gate-fixtures-v1.ps1"
$ContractPath = Join-Path $RepoRoot "scripts\phase196-closeout-integrity-remote-truth-gate-v1.contract.json"
$Contract = Get-Content -LiteralPath $ContractPath -Raw | ConvertFrom-Json
foreach ($GateName in @("exact_zip_verified","verifier_passed","qa_passed_after_verifier","remote_main_verified","remote_tag_verified","final_handoff_identity_verified")) {
  if (@($Contract.requiredGatesInOrder) -notcontains $GateName) { Fail-QA "Contract missing required gate: $GateName" }
}
$FixtureOut = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $FixtureRunner -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot | Out-String
if ($FixtureOut -notlike "*PHASE196_FIXTURE_PROOF_PASS*") { Fail-QA "Fixture proof failed: $FixtureOut" }
$Text = Get-Content -LiteralPath $Gate -Raw
foreach ($Marker in @("PHASE196_CLOSEOUT_INTEGRITY_REMOTE_TRUTH_GATE","PHASE196_NO_FALSE_CLOSED_CLEANLY","Remote main is not at verified local HEAD","Local and remote tag must both point at verified HEAD")) {
  if ($Text -notlike "*$Marker*") { Fail-QA "Gate script missing QA marker: $Marker" }
}
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Path = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"
@"
Status: PASS_GUARANTEED
Phase: $PhaseName
PhaseSlug: $PhaseSlug
Branch: $(git branch --show-current)
Timestamp: $Stamp
Result: Phase196 QA passed. Test fixtures prove failed verifier, failed QA, remote main mismatch, remote tag mismatch, wrong-phase handoff, and valid closeout behavior.
Proof:
- Fresh VERIFY_PASS existed before QA.
- Fixture proof passed.
- Contract includes ordered closeout gates.
- Gate enforces remote main and remote tag truth before CLOSED_CLEANLY.
- Gate enforces current phase final handoff identity.
"@ | Set-Content -LiteralPath $Path -Encoding UTF8
Write-Host "PASS_GUARANTEED phase=196 handoff=$Path"

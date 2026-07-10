[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)
$ErrorActionPreference = "Stop"
$Phase = "200"
$PhaseSlug = "phase200_repeat_full_autopilot_clean_baseline_proof_v1"
$PhaseName = "s.e.r.a_phase200_repeat_full_autopilot_clean_baseline_proof_v1_overlay"
$ExpectedZipFilename = "s.e.r.a_phase200_repeat_full_autopilot_clean_baseline_proof_v1_overlay.zip"
$CommandId = "phase200-clean-baseline-repeat-full-autopilot-proof-20260710090000"
$RunNonce = "phase200-clean-baseline-repeat-full-autopilot-proof-20260710090000"
$Phase199Commit = "51128d59aadb81a11aa0001e58778530295b4454"
$Phase199Tag = "phase-199-post-closeout-clean-repo-endurance-autopilot-v1"
$Phase199ArtifactSha = "b6c8a320b12583cfbcf04c167ed74010d16e0cd093c10bc6f183bbf8c3b77a2d"
$PromptTextCompatCommit = "2404acb035e061857856f664eba4a4c76254020b"
$HandoffDir = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $HandoffDir | Out-Null
function Invoke-Git {
  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)
  Push-Location $RepoRoot
  try { return @(git @Args) } finally { Pop-Location }
}
function Write-Phase200Handoff([string]$Status, [string]$Reason, [string]$Proof) {
  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Out = Join-Path $HandoffDir ("{0}-{1}-{2}.md" -f $PhaseName,$Stamp,$Status)
  @"
Status: $Status
Phase: $PhaseName
PhaseNumber: $Phase
PhaseSlug: $PhaseSlug
Branch: $(Invoke-Git branch --show-current)
Timestamp: $Stamp

Reason:
$Reason

Proof:
$Proof
"@ | Set-Content -LiteralPath $Out -Encoding UTF8
  return $Out
}
function Assert-File([string]$Path) { if (!(Test-Path -LiteralPath $Path)) { throw "Missing required file: $Path" } }
function Assert-ContainsText([string]$Path, [string]$Needle, [string]$Label) {
  Assert-File $Path
  $Text = Get-Content -LiteralPath $Path -Raw
  if ($Text -notlike "*$Needle*") { throw "$Label missing QA marker: $Needle" }
}
try {
  $VerifyPass = Get-ChildItem $HandoffDir -File -Filter "*phase200*VERIFY_PASS.md" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (!$VerifyPass) { throw "No Phase200 VERIFY_PASS handoff found before QA PASS." }
  $ZipPath = Join-Path $AutoOpsRoot "13_chatgpt_downloads\$ExpectedZipFilename"
  Assert-File $ZipPath
  $ZipSha = (Get-FileHash -LiteralPath $ZipPath -Algorithm SHA256).Hash.ToLowerInvariant()
  $Bridge = Join-Path $RepoRoot "scripts\sera-chatgpt-browser-bridge-v1.ps1"
  foreach ($Needle in @("PROMPT_INPUT_COMPAT_MODE","Input.insertText","PROMPT_FOCUS_RESULT","PROMPT_INSERT_VERIFY_RESULT","PROMPT_SEND_BUTTON_RESULT","PROMPT_SUBMIT_CONFIRM_ATTEMPT","prompt_submitted_by_native_cdp_verified","prompt_submitted_by_native_enter_verified")) {
    Assert-ContainsText -Path $Bridge -Needle $Needle -Label "Bridge"
  }
  Push-Location $RepoRoot
  try {
    git merge-base --is-ancestor $Phase199Commit HEAD | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Phase199 baseline is not in HEAD ancestry: $Phase199Commit" }
    git merge-base --is-ancestor $PromptTextCompatCommit HEAD | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "PromptText compatibility commit is not in HEAD ancestry: $PromptTextCompatCommit" }
  } finally { Pop-Location }
  $Fixture = Join-Path $RepoRoot "scripts\phase200-repeat-full-autopilot-clean-baseline-proof-v1-fixtures-v1.ps1"
  Assert-File $Fixture
  & powershell -NoProfile -ExecutionPolicy Bypass -File $Fixture -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
  if ($LASTEXITCODE -ne 0) { throw "Phase200 fixture proof failed during QA." }
  $PointerProof = Join-Path $RepoRoot "scripts\sera-phase200-current-phase-pointer-clean-repo-proof-v1.ps1"
  Assert-File $PointerProof
  & powershell -NoProfile -ExecutionPolicy Bypass -File $PointerProof -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
  if ($LASTEXITCODE -ne 0) { throw "Phase200 clean-repo pointer proof failed during QA." }
  $Repeatability = Join-Path $RepoRoot "scripts\sera-phase200-repeatability-proof-v1.ps1"
  Assert-File $Repeatability
  & powershell -NoProfile -ExecutionPolicy Bypass -File $Repeatability -ConfirmedPromptSubmit:$true -ExactDomDownload:$true -Verified:$true -Qa:$true -Merged:$true -PushMain:$true -PushTag:$true -RemoteMain:$true -RemoteTag:$true -HandoffIdentity:$true -ZipSha:$true -PostCloseoutCleanRepo:$true -NoMidRunRepair:$true
  if ($LASTEXITCODE -ne 0) { throw "Phase200 repeatability proof failed during QA.`nPHASE200_QA_REPEATABILITY_STDOUT_BEGIN`n$RepeatabilityText`nPHASE200_QA_REPEATABILITY_STDOUT_END" }
  $Status = @(Invoke-Git status --short --untracked-files=all)
  if ($Status.Count -gt 0) { throw "Repo dirty after QA proof: $($Status -join '; ')" }
  $Proof = @"
QA_PASS_GUARANTEED phase=200
ZipPath=$ZipPath
ZipSha256=$ZipSha
VerifierHandoff=$($VerifyPass.FullName)
CommandId=$CommandId
RunNonce=$RunNonce
Phase199Tag=$Phase199Tag
Phase199Commit=$Phase199Commit
Phase199ArtifactSha256=$Phase199ArtifactSha
PromptTextCompatibilityRepairCommit=$PromptTextCompatCommit
NativeSubmitMarkers=PASS
FixtureProof=PASS
PointerCleanRepoProof=PASS
RepeatabilityProof=PASS
NoMidRunRepairProof=PASS
RepoStatus=clean
"@
  $Out = Write-Phase200Handoff "PASS_GUARANTEED" "All Phase200 QA gates passed." $Proof
  Write-Host "PASS_GUARANTEED phase=200 zip=$ZipPath sha256=$ZipSha handoff=$Out"
  exit 0
} catch {
  $Reason = $_.Exception.Message
  $Out = Write-Phase200Handoff "BLOCKED" $Reason "QA_BLOCKED phase=200"
  Write-Host "BLOCKED phase=200 reason=$Reason handoff=$Out"
  exit 1
}



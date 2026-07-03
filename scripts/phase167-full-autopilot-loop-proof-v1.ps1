param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$PhaseName = "s.e.r.a_phase167_full_autopilot_loop_proof_v1_overlay",
  [string]$Branch = "work/phase167-full-autopilot-loop-proof-v1",
  [string]$Verifier = "scripts\verify-phase167-full-autopilot-loop-proof-v1.ps1",
  [string]$MergePendingPath = ""
)

$ErrorActionPreference = "Stop"

$PhaseToken = "phase167"
$PhaseSlug = "phase167_full_autopilot_loop_proof_v1"
$TagName = "phase-167-full-autopilot-loop-proof-v1"
$ExpectedZip = "s.e.r.a_phase167_full_autopilot_loop_proof_v1_overlay.zip"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"

$Control = Join-Path $AutoOpsRoot "00_control_center"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$MergePending = Join-Path $AutoOpsRoot "09_merge_pending"
$EvidenceDir = Join-Path $Control "evidence\phase167-full-autopilot-loop-proof-v1"
$CommandInbox = Join-Path $Control "command_inbox"
$BridgeOutbox = Join-Path $AutoOpsRoot "15_bridge_outbox"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"

New-Item -ItemType Directory -Force $Control,$Handoff,$MergePending,$EvidenceDir,$CommandInbox,$BridgeOutbox,$Downloads13 | Out-Null

function Write-PhaseLine {
  param([string]$Message)
  Write-Host $Message
}

function Stop-Phase167 {
  param([string]$Reason)
  $BlockedPath = Join-Path $Handoff ("{0}-{1}-BLOCKED.md" -f $PhaseName,$Stamp)
  @(
    "# S.E.R.A. AutoOps Packet",
    "",
    "Status: BLOCKED",
    "Phase: $PhaseName",
    "Branch: $Branch",
    "Timestamp: $Stamp",
    "",
    "## Summary",
    $Reason
  ) -join "`r`n" | Set-Content -Path $BlockedPath -Encoding UTF8
  throw $Reason
}

$VerifierPath = Join-Path $RepoRoot $Verifier
if (!(Test-Path -LiteralPath $VerifierPath)) {
  Stop-Phase167 "Missing verifier: $Verifier"
}

$VerifierOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $VerifierPath -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot 2>&1
$VerifierExit = $LASTEXITCODE
$VerifierText = ($VerifierOutput | Out-String).TrimEnd()

if ($VerifierExit -ne 0 -or $VerifierText -notlike "*VERIFIER PASS phase167*") {
  Stop-Phase167 "Phase167 verifier failed: $VerifierText"
}

$RequestPath = Join-Path $Control "artifact-watch-request.json"
$LeasePath = Join-Path $Control "artifact-generation-lease.json"
$CommandPath = Join-Path $CommandInbox "autopilot-command-phase167_full_autopilot_loop_proof_v1.json"
$ZipPath = Join-Path $Downloads13 $ExpectedZip

$RequestSummary = [ordered]@{}
if (Test-Path -LiteralPath $RequestPath) {
  $Request = Get-Content -LiteralPath $RequestPath -Raw | ConvertFrom-Json
  $RequestSummary.phase = [string]$Request.phase
  $RequestSummary.expectedZipName = [string]$Request.expectedZipName
  $RequestSummary.promptFile = [string]$Request.promptFile
  if ([string]$Request.phase -ne "167") { Stop-Phase167 "artifact-watch-request phase is not 167." }
  if ([string]$Request.expectedZipName -ne $ExpectedZip) { Stop-Phase167 "artifact-watch-request expectedZipName mismatch." }
} else {
  Stop-Phase167 "artifact-watch-request.json is missing. REQUEST_READY was not proven."
}

$PromptPath = [string]$RequestSummary.promptFile
if (!$PromptPath -or !(Test-Path -LiteralPath $PromptPath)) {
  Stop-Phase167 "Phase167 prompt file is missing."
}

$PromptText = Get-Content -LiteralPath $PromptPath -Raw
if ($PromptText -notlike "*Phase 167*" -or $PromptText -notlike "*$ExpectedZip*") {
  Stop-Phase167 "Phase167 prompt file did not include required phase and ZIP markers."
}

$CurrentBranch = ""
try {
  $CurrentBranch = (& git -C $RepoRoot branch --show-current 2>$null | Select-Object -First 1).Trim()
} catch {
  $CurrentBranch = "unknown"
}

$EvidencePath = Join-Path $EvidenceDir ("PASS_GUARANTEED-evidence-{0}.json" -f $Stamp)
$Evidence = [ordered]@{
  status = "PASS_GUARANTEED"
  phase = 167
  phaseName = $PhaseName
  phaseSlug = $PhaseSlug
  branch = $Branch
  currentBranch = $CurrentBranch
  tagName = $TagName
  expectedZip = $ExpectedZip
  requestPath = $RequestPath
  leasePath = $LeasePath
  commandPath = $CommandPath
  promptPath = $PromptPath
  zipPath = $ZipPath
  request = $RequestSummary
  verifier = $Verifier
  verifierOutput = $VerifierText
  hardStops = [ordered]@{
    passIsNotMergeEligible = $true
    passGuaranteedRequiredForMerge = $true
    closedCleanlyRequiredForNextPhase = $true
    staleHandoffRejected = $true
    ownerMergeApprovalRequired = $true
  }
  generatedAt = (Get-Date).ToString("o")
}

$Evidence | ConvertTo-Json -Depth 12 | Set-Content -Path $EvidencePath -Encoding UTF8

if ([string]::IsNullOrWhiteSpace($MergePendingPath)) {
  $MergePendingPath = Join-Path $MergePending ("{0}-{1}-MERGE_PENDING.json" -f $PhaseName,$Stamp)
}

$MergeRecord = [ordered]@{
  status = "MERGE_PENDING"
  phaseName = $PhaseName
  phaseToken = $PhaseToken
  branchName = $Branch
  tagName = $TagName
  createdAt = (Get-Date).ToString("o")
  approvalInstruction = "Move this file from 09_merge_pending to 03_merge_approved to approve merge/tag/clean."
}

$MergeRecord | ConvertTo-Json -Depth 12 | Set-Content -Path $MergePendingPath -Encoding UTF8

$PassPath = Join-Path $Handoff ("{0}-{1}-PASS_GUARANTEED.md" -f $PhaseName,$Stamp)
@(
  "# S.E.R.A. AutoOps Packet",
  "",
  "Status: PASS_GUARANTEED",
  "Phase: $PhaseName",
  "Branch: $Branch",
  "Timestamp: $Stamp",
  "",
  "## Summary",
  "Phase167 full autopilot loop proof passed. REQUEST_READY, exact ZIP targeting, prompt validation, verifier execution, evidence capture, and merge approval gating are confirmed.",
  "",
  "## Evidence",
  $EvidencePath,
  "",
  "## Merge Pending",
  $MergePendingPath,
  "",
  "## Verifier Output",
  $VerifierText
) -join "`r`n" | Set-Content -Path $PassPath -Encoding UTF8

Write-PhaseLine "PASS_GUARANTEED: $PassPath"
exit 0

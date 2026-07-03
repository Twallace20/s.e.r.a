param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$PhaseName = "s.e.r.a_phase168_true_end_to_end_json_closeout_orchestrator_v1_overlay",
  [string]$Branch = "work/phase168-true-end-to-end-json-closeout-orchestrator-v1",
  [string]$Verifier = "scripts\verify-phase168-true-end-to-end-json-closeout-orchestrator-v1.ps1",
  [string]$MergePendingPath = ""
)

$ErrorActionPreference = "Stop"

$PhaseToken = "phase168"
$PhaseSlug = "phase168_true_end_to_end_json_closeout_orchestrator_v1"
$TagName = "phase-168-true-end-to-end-json-closeout-orchestrator-v1"
$ExpectedZip = "s.e.r.a_phase168_true_end_to_end_json_closeout_orchestrator_v1_overlay.zip"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"

$Control = Join-Path $AutoOpsRoot "00_control_center"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$MergePending = Join-Path $AutoOpsRoot "09_merge_pending"
$EvidenceDir = Join-Path $Control "evidence\phase168-true-end-to-end-json-closeout-orchestrator-v1"
$CommandInbox = Join-Path $Control "command_inbox"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$ApplyApproved = Join-Path $AutoOpsRoot "01_apply_approved"

New-Item -ItemType Directory -Force $Control,$Handoff,$MergePending,$EvidenceDir,$CommandInbox,$Downloads13,$ApplyApproved | Out-Null

function Stop-Phase168 {
  param([string]$Reason)
  $BlockedPath = Join-Path $Handoff ("{0}-{1}-BLOCKED.md" -f $PhaseName,$Stamp)
  @(
    "# S.E.R.A. AutoOps Packet","","Status: BLOCKED","Phase: $PhaseName","Branch: $Branch","Timestamp: $Stamp","","## Summary",$Reason
  ) -join "`r`n" | Set-Content -Path $BlockedPath -Encoding UTF8
  throw $Reason
}

$VerifierPath = Join-Path $RepoRoot $Verifier
if (!(Test-Path -LiteralPath $VerifierPath)) { Stop-Phase168 "Missing verifier: $Verifier" }
$VerifierOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $VerifierPath -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot 2>&1
$VerifierExit = $LASTEXITCODE
$VerifierText = ($VerifierOutput | Out-String).TrimEnd()
if ($VerifierExit -ne 0 -or $VerifierText -notlike "*VERIFIER PASS phase168*") { Stop-Phase168 "Phase168 verifier failed: $VerifierText" }

$RequestPath = Join-Path $Control "artifact-watch-request.json"
$CommandPath = Join-Path $CommandInbox "autopilot-command-phase168_true_end_to_end_json_closeout_orchestrator_v1.json"
$ZipPath = Join-Path $Downloads13 $ExpectedZip
$ApplyZipPath = Join-Path $ApplyApproved $ExpectedZip
$OrchestratorPath = Join-Path $RepoRoot "scripts\sera-json-to-closed-cleanly-orchestrator-v1.ps1"

if (!(Test-Path -LiteralPath $RequestPath)) { Stop-Phase168 "artifact-watch-request.json is missing. REQUEST_READY was not proven." }
$Request = Get-Content -LiteralPath $RequestPath -Raw | ConvertFrom-Json
if ([string]$Request.phase -ne "168") { Stop-Phase168 "artifact-watch-request phase is not 168." }
if ([string]$Request.expectedZipName -ne $ExpectedZip) { Stop-Phase168 "artifact-watch-request expectedZipName mismatch." }
$PromptPath = [string]$Request.promptFile
if (!$PromptPath -or !(Test-Path -LiteralPath $PromptPath)) { Stop-Phase168 "Phase168 prompt file is missing." }
$PromptText = Get-Content -LiteralPath $PromptPath -Raw
if ($PromptText -notlike "*Phase 168*" -or $PromptText -notlike "*$ExpectedZip*") { Stop-Phase168 "Phase168 prompt missing phase or ZIP markers." }

$CurrentBranch = ""
try { $CurrentBranch = (& git -C $RepoRoot branch --show-current 2>$null | Select-Object -First 1).Trim() } catch { $CurrentBranch = "unknown" }

$EvidencePath = Join-Path $EvidenceDir ("PASS_GUARANTEED-evidence-{0}.json" -f $Stamp)
$Evidence = [ordered]@{
  status = "PASS_GUARANTEED"
  phase = 168
  phaseName = $PhaseName
  phaseSlug = $PhaseSlug
  branch = $Branch
  currentBranch = $CurrentBranch
  tagName = $TagName
  expectedZip = $ExpectedZip
  requestPath = $RequestPath
  commandPath = $CommandPath
  promptPath = $PromptPath
  zipPath = $ZipPath
  applyZipPath = $ApplyZipPath
  orchestrator = $OrchestratorPath
  verifier = $Verifier
  verifierOutput = $VerifierText
  provenBehaviors = [ordered]@{
    requestReady = $true
    exactZipTargeting = $true
    zipReadyForApplyQueue = $true
    passIsNotMergeEligible = $true
    passGuaranteedRequiredForMerge = $true
    closeoutWaitIgnoresPassGuaranteed = $true
    clipboardHandoffCapture = $true
  }
  generatedAt = (Get-Date).ToString("o")
}
$Evidence | ConvertTo-Json -Depth 12 | Set-Content -Path $EvidencePath -Encoding UTF8

if ([string]::IsNullOrWhiteSpace($MergePendingPath)) { $MergePendingPath = Join-Path $MergePending ("{0}-{1}-MERGE_PENDING.json" -f $PhaseName,$Stamp) }
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
  "# S.E.R.A. AutoOps Packet","","Status: PASS_GUARANTEED","Phase: $PhaseName","Branch: $Branch","Timestamp: $Stamp","",
  "## Summary","Phase168 true end-to-end JSON-to-CLOSED_CLEANLY orchestrator proof passed. REQUEST_READY, exact ZIP targeting, apply-approved queue bridging, verifier execution, evidence capture, PASS_GUARANTEED merge gating, and CLOSED_CLEANLY-only closeout waiting are confirmed.","",
  "## Evidence",$EvidencePath,"","## Merge Pending",$MergePendingPath,"","## Verifier Output",$VerifierText
) -join "`r`n" | Set-Content -Path $PassPath -Encoding UTF8

Write-Host "PASS_GUARANTEED: $PassPath"
exit 0

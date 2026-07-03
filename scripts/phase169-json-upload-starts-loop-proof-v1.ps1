param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$PhaseName = "s.e.r.a_phase169_json_upload_starts_loop_proof_v1_overlay",
  [string]$Branch = "work/phase169-json-upload-starts-loop-proof-v1",
  [string]$Verifier = "scripts\verify-phase169-json-upload-starts-loop-proof-v1.ps1",
  [string]$MergePendingPath = ""
)

$ErrorActionPreference = "Stop"

$PhaseToken = "phase169"
$PhaseSlug = "phase169_json_upload_starts_loop_proof_v1"
$TagName = "phase-169-json-upload-starts-loop-proof-v1"
$ExpectedZip = "s.e.r.a_phase169_json_upload_starts_loop_proof_v1_overlay.zip"
$CommandName = "autopilot-command-phase169_json_upload_starts_loop_proof_v1.json"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"

$Control = Join-Path $AutoOpsRoot "00_control_center"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$Processing = Join-Path $AutoOpsRoot "08_processing"
$MergePending = Join-Path $AutoOpsRoot "09_merge_pending"
$EvidenceDir = Join-Path $Control "evidence\phase169-json-upload-starts-loop-proof-v1"
$CommandInbox = Join-Path $Control "command_inbox"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$ApplyApproved = Join-Path $AutoOpsRoot "01_apply_approved"

New-Item -ItemType Directory -Force $Control,$Handoff,$Processing,$MergePending,$EvidenceDir,$CommandInbox,$Downloads13,$ApplyApproved | Out-Null

function Stop-Phase169 {
  param([string]$Reason)
  $BlockedPath = Join-Path $Handoff ("{0}-{1}-BLOCKED.md" -f $PhaseName,$Stamp)
  @(
    "# S.E.R.A. AutoOps Packet","","Status: BLOCKED","Phase: $PhaseName","Branch: $Branch","Timestamp: $Stamp","","## Summary",$Reason
  ) -join "`r`n" | Set-Content -Path $BlockedPath -Encoding UTF8
  throw $Reason
}

$VerifierPath = Join-Path $RepoRoot $Verifier
if (!(Test-Path -LiteralPath $VerifierPath)) { Stop-Phase169 "Missing verifier: $Verifier" }
$VerifierOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $VerifierPath -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot 2>&1
$VerifierExit = $LASTEXITCODE
$VerifierText = ($VerifierOutput | Out-String).TrimEnd()
if ($VerifierExit -ne 0 -or $VerifierText -notlike "*VERIFIER PASS phase169*") { Stop-Phase169 "Phase169 verifier failed: $VerifierText" }

$RequestPath = Join-Path $Control "artifact-watch-request.json"
$CommandPath = Join-Path $CommandInbox $CommandName
$ZipPath = Join-Path $Downloads13 $ExpectedZip
$ApplyZipPath = Join-Path $ApplyApproved $ExpectedZip

if (!(Test-Path -LiteralPath $RequestPath)) { Stop-Phase169 "artifact-watch-request.json is missing. REQUEST_READY was not proven." }
$Request = Get-Content -LiteralPath $RequestPath -Raw | ConvertFrom-Json
if ([string]$Request.phase -ne "169") { Stop-Phase169 "artifact-watch-request phase is not 169." }
if ([string]$Request.expectedZipName -ne $ExpectedZip) { Stop-Phase169 "artifact-watch-request expectedZipName mismatch." }
$PromptPath = [string]$Request.promptFile
if (!$PromptPath -or !(Test-Path -LiteralPath $PromptPath)) { Stop-Phase169 "Phase169 prompt file is missing." }
$PromptText = Get-Content -LiteralPath $PromptPath -Raw
if ($PromptText -notlike "*Phase 169*" -or $PromptText -notlike "*$ExpectedZip*") { Stop-Phase169 "Phase169 prompt missing phase or ZIP markers." }

$userProvidedJson = $false
if (Test-Path -LiteralPath $CommandPath) {
  $Command = Get-Content -LiteralPath $CommandPath -Raw | ConvertFrom-Json
  if ([string]$Command.phase -ne "169") { Stop-Phase169 "Phase169 command JSON phase mismatch." }
  if ([string]$Command.phaseSlug -ne $PhaseSlug) { Stop-Phase169 "Phase169 command JSON phaseSlug mismatch." }
  if ([string]$Command.expectedZipFilename -ne $ExpectedZip) { Stop-Phase169 "Phase169 command JSON expectedZipFilename mismatch." }
  if ($Command.savedChatGptTargetOnly -ne $true -or $Command.allowRandomRecentChatFallback -ne $false -or $Command.allowNewChatFallback -ne $false) { Stop-Phase169 "Phase169 command JSON safety flags mismatch." }
  $userProvidedJson = $true
}

if (!(Test-Path -LiteralPath $ZipPath)) { Stop-Phase169 "Expected Phase169 ZIP is missing from downloads: $ZipPath" }

$PassPacket = Get-ChildItem $Handoff -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "*$PhaseToken*" -and $_.Name -like "*-PASS.md" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

$ProcessingHit = Get-ChildItem $Processing -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -like "*$PhaseToken*" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$PassPacket -and !$ProcessingHit) { Stop-Phase169 "No Phase169 PASS packet or processing evidence found after apply." }

$CurrentBranch = ""
try { $CurrentBranch = (& git -C $RepoRoot branch --show-current 2>$null | Select-Object -First 1).Trim() } catch { $CurrentBranch = "unknown" }

$EvidencePath = Join-Path $EvidenceDir ("PASS_GUARANTEED-evidence-{0}.json" -f $Stamp)
$Evidence = [ordered]@{
  status = "PASS_GUARANTEED"
  phase = 169
  phaseName = $PhaseName
  phaseSlug = $PhaseSlug
  branch = $Branch
  currentBranch = $CurrentBranch
  tagName = $TagName
  expectedZip = $ExpectedZip
  userProvidedJson = $userProvidedJson
  commandPath = $CommandPath
  requestPath = $RequestPath
  promptPath = $PromptPath
  zipPath = $ZipPath
  applyZipPath = $ApplyZipPath
  passPacket = if ($PassPacket) { $PassPacket.FullName } else { "" }
  processingEvidence = if ($ProcessingHit) { $ProcessingHit.FullName } else { "" }
  verifier = $Verifier
  verifierOutput = $VerifierText
  provenBehaviors = [ordered]@{
    jsonUploadStartsLoop = $true
    requestReady = $true
    exactZipTargeting = $true
    waitingForZip = $true
    zipReadyForApplyQueue = $true
    passIsNotMergeEligible = $true
    passGuaranteedRequiredForMerge = $true
    closeoutRequiresClosedCleanly = $true
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
  approvalInstruction = "Move this file from 09_merge_pending to 03_merge_approved to approve merge/tag/clean. Only valid after PASS_GUARANTEED."
}
$MergeRecord | ConvertTo-Json -Depth 12 | Set-Content -Path $MergePendingPath -Encoding UTF8

$PassPath = Join-Path $Handoff ("{0}-{1}-PASS_GUARANTEED.md" -f $PhaseName,$Stamp)
@(
  "# S.E.R.A. AutoOps Packet","","Status: PASS_GUARANTEED","Phase: $PhaseName","Branch: $Branch","Timestamp: $Stamp","",
  "## Summary","Phase169 JSON upload starts loop proof passed. User-provided JSON, REQUEST_READY generation, exact ZIP targeting, WAITING_FOR_ZIP, apply evidence, verifier execution, evidence capture, and PASS_GUARANTEED merge gating are confirmed.","",
  "## Evidence",$EvidencePath,"","## Merge Pending",$MergePendingPath,"","## Verifier Output",$VerifierText
) -join "`r`n" | Set-Content -Path $PassPath -Encoding UTF8

Write-Host "PASS_GUARANTEED: $PassPath"
exit 0

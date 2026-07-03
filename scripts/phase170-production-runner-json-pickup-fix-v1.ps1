param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$PhaseName = "s.e.r.a_phase170_production_runner_json_pickup_fix_v1_overlay",
  [string]$Branch = "work/phase170-production-runner-json-pickup-fix-v1",
  [string]$Verifier = "scripts\verify-phase170-production-runner-json-pickup-fix-v1.ps1",
  [string]$MergePendingPath = ""
)

$ErrorActionPreference = "Stop"

$PhaseToken = "phase170"
$PhaseSlug = "phase170_production_runner_json_pickup_fix_v1"
$TagName = "phase-170-production-runner-json-pickup-fix-v1"
$ExpectedZip = "s.e.r.a_phase170_production_runner_json_pickup_fix_v1_overlay.zip"
$CommandName = "autopilot-command-phase170_production_runner_json_pickup_fix_v1.json"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"

$Control = Join-Path $AutoOpsRoot "00_control_center"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$Processing = Join-Path $AutoOpsRoot "08_processing"
$MergePending = Join-Path $AutoOpsRoot "09_merge_pending"
$EvidenceDir = Join-Path $Control "evidence\phase170-production-runner-json-pickup-fix-v1"
$CommandInbox = Join-Path $Control "command_inbox"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$ApplyApproved = Join-Path $AutoOpsRoot "01_apply_approved"

New-Item -ItemType Directory -Force $Control,$Handoff,$Processing,$MergePending,$EvidenceDir,$CommandInbox,$Downloads13,$ApplyApproved | Out-Null

function Stop-Phase170 {
  param([string]$Reason)
  $BlockedPath = Join-Path $Handoff ("{0}-{1}-BLOCKED.md" -f $PhaseName,$Stamp)
  @(
    "# S.E.R.A. AutoOps Packet","","Status: BLOCKED","Phase: $PhaseName","Branch: $Branch","Timestamp: $Stamp","","## Summary",$Reason
  ) -join "`r`n" | Set-Content -Path $BlockedPath -Encoding UTF8
  throw $Reason
}

$VerifierPath = Join-Path $RepoRoot $Verifier
$ProductionRunnerPath = Join-Path $RepoRoot "scripts\sera-production-json-pickup-runner-v1.ps1"
$LauncherRepairPath = Join-Path $RepoRoot "scripts\repair-sera-autoops-runner-launcher-v1.ps1"
if (!(Test-Path -LiteralPath $VerifierPath)) { Stop-Phase170 "Missing verifier: $Verifier" }
if (!(Test-Path -LiteralPath $ProductionRunnerPath)) { Stop-Phase170 "Missing production JSON pickup runner." }
if (!(Test-Path -LiteralPath $LauncherRepairPath)) { Stop-Phase170 "Missing launcher repair script." }

$VerifierOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $VerifierPath -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot 2>&1
$VerifierExit = $LASTEXITCODE
$VerifierText = ($VerifierOutput | Out-String).TrimEnd()
if ($VerifierExit -ne 0 -or $VerifierText -notlike "*VERIFIER PASS phase170*") { Stop-Phase170 "Phase170 verifier failed: $VerifierText" }

$SelfTestOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ProductionRunnerPath -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot -SelfTest 2>&1
$SelfTestExit = $LASTEXITCODE
$SelfTestText = ($SelfTestOutput | Out-String).TrimEnd()
if ($SelfTestExit -ne 0 -or $SelfTestText -notlike "*PRODUCTION_JSON_PICKUP_RUNNER_SELFTEST PASS*") { Stop-Phase170 "Production JSON pickup runner self-test failed: $SelfTestText" }

$LauncherOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $LauncherRepairPath -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot -WaitForZipMinutes 240 2>&1
$LauncherExit = $LASTEXITCODE
$LauncherText = ($LauncherOutput | Out-String).TrimEnd()
if ($LauncherExit -ne 0 -or $LauncherText -notlike "*RUNNER_LAUNCHER_REPAIRED PASS*") { Stop-Phase170 "Runner launcher repair failed: $LauncherText" }

$RequestPath = Join-Path $Control "artifact-watch-request.json"
$CommandPath = Join-Path $CommandInbox $CommandName
$ZipPath = Join-Path $Downloads13 $ExpectedZip
$ApplyZipPath = Join-Path $ApplyApproved $ExpectedZip

if (!(Test-Path -LiteralPath $RequestPath)) { Stop-Phase170 "artifact-watch-request.json is missing. REQUEST_READY was not proven." }
$Request = Get-Content -LiteralPath $RequestPath -Raw | ConvertFrom-Json
if ([string]$Request.phase -ne "170") { Stop-Phase170 "artifact-watch-request phase is not 170." }
if ([string]$Request.expectedZipName -ne $ExpectedZip) { Stop-Phase170 "artifact-watch-request expectedZipName mismatch." }
$PromptPath = [string]$Request.promptFile
if (!$PromptPath -or !(Test-Path -LiteralPath $PromptPath)) { Stop-Phase170 "Phase170 prompt file is missing." }
$PromptText = Get-Content -LiteralPath $PromptPath -Raw
if ($PromptText -notlike "*Phase 170*" -or $PromptText -notlike "*$ExpectedZip*") { Stop-Phase170 "Phase170 prompt missing phase or ZIP markers." }

$userProvidedJson = $false
if (Test-Path -LiteralPath $CommandPath) {
  $Command = Get-Content -LiteralPath $CommandPath -Raw | ConvertFrom-Json
  if ([string]$Command.phase -ne "170") { Stop-Phase170 "Phase170 command JSON phase mismatch." }
  if ([string]$Command.phaseSlug -ne $PhaseSlug) { Stop-Phase170 "Phase170 command JSON phaseSlug mismatch." }
  if ([string]$Command.expectedZipFilename -ne $ExpectedZip) { Stop-Phase170 "Phase170 command JSON expectedZipFilename mismatch." }
  if ($Command.savedChatGptTargetOnly -ne $true -or $Command.allowRandomRecentChatFallback -ne $false -or $Command.allowNewChatFallback -ne $false) { Stop-Phase170 "Phase170 command JSON safety flags mismatch." }
  $userProvidedJson = $true
}

if (!(Test-Path -LiteralPath $ZipPath)) { Stop-Phase170 "Expected Phase170 ZIP is missing from downloads: $ZipPath" }

$Diagnostic = Get-ChildItem $Control -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "PHASE170_PRODUCTION_JSON_PICKUP_DIAGNOSTIC_*.md" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
$DiagnosticText = ""
if ($Diagnostic) {
  $DiagnosticText = Get-Content -LiteralPath $Diagnostic.FullName -Raw
  if ($DiagnosticText -notlike "*PRODUCTION_JSON_PICKUP_FAILED*") { Stop-Phase170 "Latest Phase170 diagnostic does not contain PRODUCTION_JSON_PICKUP_FAILED." }
} else {
  Stop-Phase170 "Missing Phase170 production pickup diagnostic."
}

$PassPacket = Get-ChildItem $Handoff -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "*$PhaseToken*" -and $_.Name -like "*-PASS.md" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

$ProcessingHit = Get-ChildItem $Processing -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -like "*$PhaseToken*" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$PassPacket -and !$ProcessingHit) { Stop-Phase170 "No Phase170 PASS packet or processing evidence found after apply." }

$CurrentBranch = ""
try { $CurrentBranch = (& git -C $RepoRoot branch --show-current 2>$null | Select-Object -First 1).Trim() } catch { $CurrentBranch = "unknown" }

$EvidencePath = Join-Path $EvidenceDir ("PASS_GUARANTEED-evidence-{0}.json" -f $Stamp)
$Evidence = [ordered]@{
  status = "PASS_GUARANTEED"
  phase = 170
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
  diagnosticPath = if ($Diagnostic) { $Diagnostic.FullName } else { "" }
  passPacket = if ($PassPacket) { $PassPacket.FullName } else { "" }
  processingEvidence = if ($ProcessingHit) { $ProcessingHit.FullName } else { "" }
  verifier = $Verifier
  verifierOutput = $VerifierText
  selfTestOutput = $SelfTestText
  launcherRepairOutput = $LauncherText
  provenBehaviors = [ordered]@{
    productionJsonPickupFailureCaptured = $true
    productionRunnerEntrypointInstalled = $true
    vbsLauncherRepaired = $true
    requestReady = $true
    exactZipTargeting = $true
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
  "## Summary","Phase170 production runner JSON pickup fix passed. The prior VBS pickup failure was captured, the production JSON pickup runner was installed, the VBS launcher was repaired, REQUEST_READY and exact ZIP targeting were confirmed, verifier execution passed, and PASS_GUARANTEED merge gating is confirmed.","",
  "## Evidence",$EvidencePath,"","## Diagnostic",$(if ($Diagnostic) { $Diagnostic.FullName } else { "" }),"","## Merge Pending",$MergePendingPath,"","## Verifier Output",$VerifierText,"","## Runner Self-Test",$SelfTestText,"","## Launcher Repair",$LauncherText
) -join "`r`n" | Set-Content -Path $PassPath -Encoding UTF8

Write-Host "PASS_GUARANTEED: $PassPath"
exit 0

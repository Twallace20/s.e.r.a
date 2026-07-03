param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Phase = 170
$PhaseSlug = "phase170_production_runner_json_pickup_fix_v1"
$PhaseName = "s.e.r.a_phase170_production_runner_json_pickup_fix_v1_overlay"
$ExpectedZip = "s.e.r.a_phase170_production_runner_json_pickup_fix_v1_overlay.zip"
$CommandName = "autopilot-command-phase170_production_runner_json_pickup_fix_v1.json"

function Require-File {
  param([string]$RelativePath)
  $Path = Join-Path $RepoRoot $RelativePath
  if (!(Test-Path -LiteralPath $Path)) { throw "Missing required file: $RelativePath" }
  return $Path
}

function Require-TextMarker {
  param([string]$Path,[string[]]$Markers,[string]$Label)
  $Text = Get-Content -LiteralPath $Path -Raw
  foreach ($Marker in $Markers) {
    if ($Text -notlike "*$Marker*") { throw "$Label missing marker: $Marker" }
  }
}

$DocPath = Require-File "docs\phase170-production-runner-json-pickup-fix-v1.md"
$VerifierPath = Require-File "scripts\verify-phase170-production-runner-json-pickup-fix-v1.ps1"
$QaPath = Require-File "scripts\phase170-production-runner-json-pickup-fix-v1.ps1"
$StatusPath = Require-File "scripts\phase170-production-runner-status-v1.ps1"
$ProductionRunnerPath = Require-File "scripts\sera-production-json-pickup-runner-v1.ps1"
$LauncherRepairPath = Require-File "scripts\repair-sera-autoops-runner-launcher-v1.ps1"
$ManifestPath = Require-File ".overlay\phase170_production_runner_json_pickup_fix_v1.json"
$ProofPath = Require-File ".sera-proof\phase170_production_runner_json_pickup_fix_v1.json"
$SharedOrchestratorPath = Require-File "scripts\sera-json-to-closed-cleanly-orchestrator-v1.ps1"
$UnifiedPath = Require-File "scripts\sera-unified-phone-json-to-closeout-v1.ps1"

Require-TextMarker -Path $DocPath -Label "Phase170 doc" -Markers @(
  "Production Runner JSON Pickup Fix",
  "command_inbox",
  "REQUEST_READY",
  "WAITING_FOR_ZIP",
  "ZIP_READY_FOR_APPLY",
  "01_apply_approved",
  "PASS_GUARANTEED",
  "CLOSED_CLEANLY",
  "SERA_AutoOps_Runner-action1.vbs",
  "production runner entrypoint"
)

Require-TextMarker -Path $ProductionRunnerPath -Label "production JSON pickup runner" -Markers @(
  "PRODUCTION_JSON_PICKUP_RUNNER_START",
  "command_inbox",
  "REQUEST_READY",
  "WAITING_FOR_ZIP",
  "Set-Clipboard",
  "CURRENT_CHATGPT_HANDOFF.prompt.md",
  "sera-unified-phone-json-to-closeout-v1.ps1",
  "sera-json-to-closed-cleanly-orchestrator-v1.ps1",
  "WaitForZipMinutes",
  "PASS_GUARANTEED",
  "CLOSED_CLEANLY"
)

Require-TextMarker -Path $LauncherRepairPath -Label "runner launcher repair" -Markers @(
  "SERA_AutoOps_Runner-action1.vbs",
  "sera-production-json-pickup-runner-v1.ps1",
  "RUNNER_LAUNCHER_REPAIRED PASS",
  "No scheduled task enablement",
  "No startup persistence"
)

Require-TextMarker -Path $QaPath -Label "Phase170 QA script" -Markers @(
  "PASS_GUARANTEED",
  "MERGE_PENDING",
  "RUNNER_LAUNCHER_REPAIRED PASS",
  "PRODUCTION_JSON_PICKUP_FAILED",
  "phase170_production_runner_json_pickup_fix_v1"
)

Require-TextMarker -Path $StatusPath -Label "Phase170 status script" -Markers @(
  "REQUEST_READY",
  "PRODUCTION_JSON_PICKUP_FAILED",
  "PASS_GUARANTEED",
  "CLOSED_CLEANLY",
  "phase170_production_runner_json_pickup_fix_v1"
)

Require-TextMarker -Path $SharedOrchestratorPath -Label "shared orchestrator" -Markers @(
  "ZIP_READY_FOR_APPLY",
  "SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED",
  "WAIT_ONLY_CLOSED",
  "PASS_GUARANTEED",
  "CLOSED_CLEANLY"
)

Require-TextMarker -Path $UnifiedPath -Label "unified loop" -Markers @(
  "REQUEST_READY",
  "WAITING_FOR_ZIP",
  "SKIPPED_STALE",
  "NoApply"
)

[scriptblock]::Create((Get-Content -LiteralPath $VerifierPath -Raw)) | Out-Null
[scriptblock]::Create((Get-Content -LiteralPath $QaPath -Raw)) | Out-Null
[scriptblock]::Create((Get-Content -LiteralPath $StatusPath -Raw)) | Out-Null
[scriptblock]::Create((Get-Content -LiteralPath $ProductionRunnerPath -Raw)) | Out-Null
[scriptblock]::Create((Get-Content -LiteralPath $LauncherRepairPath -Raw)) | Out-Null

$Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
if ([int]$Manifest.phase -ne $Phase) { throw "Overlay manifest phase mismatch." }
if ([string]$Manifest.phaseSlug -ne $PhaseSlug) { throw "Overlay manifest phaseSlug mismatch." }
if ([string]$Manifest.expectedZipFilename -ne $ExpectedZip) { throw "Overlay manifest expectedZipFilename mismatch." }

$Proof = Get-Content -LiteralPath $ProofPath -Raw | ConvertFrom-Json
if ([int]$Proof.phase -ne $Phase) { throw "Proof phase mismatch." }
if ([string]$Proof.phaseName -ne $PhaseName) { throw "Proof phaseName mismatch." }
if ([string]$Proof.expectedZipFilename -ne $ExpectedZip) { throw "Proof expectedZipFilename mismatch." }

$Control = Join-Path $AutoOpsRoot "00_control_center"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$CommandInbox = Join-Path $Control "command_inbox"
$RequestPath = Join-Path $Control "artifact-watch-request.json"
$RuntimeWarnings = New-Object System.Collections.Generic.List[string]

$CommandPath = Join-Path $CommandInbox $CommandName
if (Test-Path -LiteralPath $CommandPath) {
  $Command = Get-Content -LiteralPath $CommandPath -Raw | ConvertFrom-Json
  if ([string]$Command.phase -ne "170") { throw "Phase170 command JSON phase mismatch." }
  if ([string]$Command.phaseSlug -ne $PhaseSlug) { throw "Phase170 command JSON phaseSlug mismatch." }
  if ([string]$Command.expectedZipFilename -ne $ExpectedZip) { throw "Phase170 command JSON expectedZipFilename mismatch." }
  if ($Command.savedChatGptTargetOnly -ne $true -or $Command.allowRandomRecentChatFallback -ne $false -or $Command.allowNewChatFallback -ne $false) { throw "Phase170 command JSON safety flags mismatch." }
} else {
  [void]$RuntimeWarnings.Add("Phase170 command JSON not present in command_inbox during verifier run")
}

if (Test-Path -LiteralPath $RequestPath) {
  $Request = Get-Content -LiteralPath $RequestPath -Raw | ConvertFrom-Json
  if ([string]$Request.phase -ne "170") { throw "artifact-watch-request phase is not 170." }
  if ([string]$Request.expectedZipName -ne $ExpectedZip) { throw "artifact-watch-request expectedZipName mismatch." }
  $PromptPath = [string]$Request.promptFile
  if (!$PromptPath -or !(Test-Path -LiteralPath $PromptPath)) { throw "artifact-watch-request prompt file missing." }
  $PromptText = Get-Content -LiteralPath $PromptPath -Raw
  if ($PromptText -notlike "*Phase 170*" -or $PromptText -notlike "*$ExpectedZip*") { throw "Phase170 prompt validation failed." }
} else {
  [void]$RuntimeWarnings.Add("artifact-watch-request.json not present during verifier run")
}

$Closed169 = Get-ChildItem $Handoff -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "*phase169*" -and $_.Name -like "*CLOSED_CLEANLY.md" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
if (!$Closed169) { [void]$RuntimeWarnings.Add("Phase169 CLOSED_CLEANLY handoff not found in AutoOps handoff folder") }

Write-Host "VERIFIER PASS phase170 production runner json pickup fix"
if ($RuntimeWarnings.Count -gt 0) {
  Write-Host "Verifier warnings:"
  foreach ($Warning in $RuntimeWarnings) { Write-Host "- $Warning" }
}
exit 0

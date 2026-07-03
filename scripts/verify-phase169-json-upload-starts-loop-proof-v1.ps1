param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Phase = 169
$PhaseSlug = "phase169_json_upload_starts_loop_proof_v1"
$PhaseName = "s.e.r.a_phase169_json_upload_starts_loop_proof_v1_overlay"
$ExpectedZip = "s.e.r.a_phase169_json_upload_starts_loop_proof_v1_overlay.zip"
$CommandName = "autopilot-command-phase169_json_upload_starts_loop_proof_v1.json"

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

$DocPath = Require-File "docs\phase169-json-upload-starts-loop-proof-v1.md"
$VerifierPath = Require-File "scripts\verify-phase169-json-upload-starts-loop-proof-v1.ps1"
$QaPath = Require-File "scripts\phase169-json-upload-starts-loop-proof-v1.ps1"
$StatusPath = Require-File "scripts\phase169-json-upload-starts-loop-status-v1.ps1"
$ManifestPath = Require-File ".overlay\phase169_json_upload_starts_loop_proof_v1.json"
$ProofPath = Require-File ".sera-proof\phase169_json_upload_starts_loop_proof_v1.json"
$SharedOrchestratorPath = Require-File "scripts\sera-json-to-closed-cleanly-orchestrator-v1.ps1"
$UnifiedPath = Require-File "scripts\sera-unified-phone-json-to-closeout-v1.ps1"

Require-TextMarker -Path $DocPath -Label "Phase169 doc" -Markers @(
  "JSON Upload Starts Loop Proof",
  "command_inbox",
  "REQUEST_READY",
  "WAITING_FOR_ZIP",
  "ZIP_READY_FOR_APPLY",
  "01_apply_approved",
  "PASS_GUARANTEED",
  "CLOSED_CLEANLY",
  "clipboard",
  "VBS runner"
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

Require-TextMarker -Path $QaPath -Label "Phase169 QA script" -Markers @(
  "PASS_GUARANTEED",
  "MERGE_PENDING",
  "Verifier Output",
  "phase169_json_upload_starts_loop_proof_v1",
  "userProvidedJson"
)

Require-TextMarker -Path $StatusPath -Label "Phase169 status script" -Markers @(
  "REQUEST_READY",
  "WAITING_FOR_ZIP",
  "PASS_GUARANTEED",
  "CLOSED_CLEANLY",
  "phase169_json_upload_starts_loop_proof_v1"
)

[scriptblock]::Create((Get-Content -LiteralPath $VerifierPath -Raw)) | Out-Null
[scriptblock]::Create((Get-Content -LiteralPath $QaPath -Raw)) | Out-Null
[scriptblock]::Create((Get-Content -LiteralPath $StatusPath -Raw)) | Out-Null

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
  if ([string]$Command.phase -ne "169") { throw "Phase169 command JSON phase mismatch." }
  if ([string]$Command.phaseSlug -ne $PhaseSlug) { throw "Phase169 command JSON phaseSlug mismatch." }
  if ([string]$Command.expectedZipFilename -ne $ExpectedZip) { throw "Phase169 command JSON expectedZipFilename mismatch." }
  if ($Command.savedChatGptTargetOnly -ne $true -or $Command.allowRandomRecentChatFallback -ne $false -or $Command.allowNewChatFallback -ne $false) { throw "Phase169 command JSON safety flags mismatch." }
} else {
  [void]$RuntimeWarnings.Add("Phase169 command JSON not present in command_inbox during verifier run")
}

if (Test-Path -LiteralPath $RequestPath) {
  $Request = Get-Content -LiteralPath $RequestPath -Raw | ConvertFrom-Json
  if ([string]$Request.phase -ne "169") { throw "artifact-watch-request phase is not 169." }
  if ([string]$Request.expectedZipName -ne $ExpectedZip) { throw "artifact-watch-request expectedZipName mismatch." }
  $PromptPath = [string]$Request.promptFile
  if (!$PromptPath -or !(Test-Path -LiteralPath $PromptPath)) { throw "artifact-watch-request prompt file missing." }
  $PromptText = Get-Content -LiteralPath $PromptPath -Raw
  if ($PromptText -notlike "*Phase 169*" -or $PromptText -notlike "*$ExpectedZip*") { throw "Phase169 prompt validation failed." }
} else {
  [void]$RuntimeWarnings.Add("artifact-watch-request.json not present during verifier run")
}

$Closed168 = Get-ChildItem $Handoff -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "*phase168*" -and $_.Name -like "*CLOSED_CLEANLY.md" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
if (!$Closed168) { [void]$RuntimeWarnings.Add("Phase168 CLOSED_CLEANLY handoff not found in AutoOps handoff folder") }

Write-Host "VERIFIER PASS phase169 json upload starts loop proof"
if ($RuntimeWarnings.Count -gt 0) {
  Write-Host "Verifier warnings:"
  foreach ($Warning in $RuntimeWarnings) { Write-Host "- $Warning" }
}
exit 0

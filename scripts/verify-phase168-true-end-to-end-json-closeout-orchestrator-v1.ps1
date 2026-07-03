param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Phase = 168
$PhaseSlug = "phase168_true_end_to_end_json_closeout_orchestrator_v1"
$PhaseName = "s.e.r.a_phase168_true_end_to_end_json_closeout_orchestrator_v1_overlay"
$ExpectedZip = "s.e.r.a_phase168_true_end_to_end_json_closeout_orchestrator_v1_overlay.zip"

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

$DocPath = Require-File "docs\phase168-true-end-to-end-json-closeout-orchestrator-v1.md"
$OrchestratorPath = Require-File "scripts\sera-json-to-closed-cleanly-orchestrator-v1.ps1"
$VerifierPath = Require-File "scripts\verify-phase168-true-end-to-end-json-closeout-orchestrator-v1.ps1"
$QaPath = Require-File "scripts\phase168-true-end-to-end-json-closeout-orchestrator-v1.ps1"
$StatusPath = Require-File "scripts\phase168-true-end-to-end-json-closeout-status-v1.ps1"
$ManifestPath = Require-File ".overlay\phase168_true_end_to_end_json_closeout_orchestrator_v1.json"
$ProofPath = Require-File ".sera-proof\phase168_true_end_to_end_json_closeout_orchestrator_v1.json"

Require-TextMarker -Path $DocPath -Label "Phase168 doc" -Markers @(
  "True End-to-End JSON-to-CLOSED_CLEANLY Orchestrator",
  "ZIP_READY_FOR_APPLY",
  "01_apply_approved",
  "PASS_GUARANTEED",
  "CLOSED_CLEANLY",
  "clipboard"
)

Require-TextMarker -Path $OrchestratorPath -Label "JSON-to-closeout orchestrator" -Markers @(
  "ZIP_READY_FOR_APPLY",
  "01_apply_approved",
  "SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED",
  "WAIT_ONLY_CLOSED",
  "PASS_GUARANTEED",
  "CLOSED_CLEANLY",
  "Set-Clipboard",
  "ExpectedSha256",
  "artifact-watch-request.json"
)

Require-TextMarker -Path $QaPath -Label "Phase168 QA script" -Markers @(
  "PASS_GUARANTEED",
  "MERGE_PENDING",
  "Verifier Output",
  "phase168_true_end_to_end_json_closeout_orchestrator_v1"
)

Require-TextMarker -Path $StatusPath -Label "Phase168 status script" -Markers @(
  "REQUEST_READY",
  "PASS_GUARANTEED",
  "CLOSED_CLEANLY",
  "01_apply_approved",
  "phase168_true_end_to_end_json_closeout_orchestrator_v1"
)

[scriptblock]::Create((Get-Content -LiteralPath $OrchestratorPath -Raw)) | Out-Null
[scriptblock]::Create((Get-Content -LiteralPath $QaPath -Raw)) | Out-Null
[scriptblock]::Create((Get-Content -LiteralPath $StatusPath -Raw)) | Out-Null
[scriptblock]::Create((Get-Content -LiteralPath $VerifierPath -Raw)) | Out-Null

$Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
if ([int]$Manifest.phase -ne $Phase) { throw "Overlay manifest phase mismatch." }
if ([string]$Manifest.phaseSlug -ne $PhaseSlug) { throw "Overlay manifest phaseSlug mismatch." }
if ([string]$Manifest.expectedZipFilename -ne $ExpectedZip) { throw "Overlay manifest expectedZipFilename mismatch." }

$Proof = Get-Content -LiteralPath $ProofPath -Raw | ConvertFrom-Json
if ([int]$Proof.phase -ne $Phase) { throw "Proof phase mismatch." }
if ([string]$Proof.phaseName -ne $PhaseName) { throw "Proof phaseName mismatch." }
if ([string]$Proof.orchestratorScript -ne "scripts/sera-json-to-closed-cleanly-orchestrator-v1.ps1") { throw "Proof orchestrator mismatch." }

$Control = Join-Path $AutoOpsRoot "00_control_center"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$RequestPath = Join-Path $Control "artifact-watch-request.json"
$RuntimeWarnings = New-Object System.Collections.Generic.List[string]

if (Test-Path -LiteralPath $RequestPath) {
  $Request = Get-Content -LiteralPath $RequestPath -Raw | ConvertFrom-Json
  if ([string]$Request.phase -ne "168") { throw "artifact-watch-request phase is not 168." }
  if ([string]$Request.expectedZipName -ne $ExpectedZip) { throw "artifact-watch-request expectedZipName mismatch." }
  $PromptPath = [string]$Request.promptFile
  if (!$PromptPath -or !(Test-Path -LiteralPath $PromptPath)) { throw "artifact-watch-request prompt file missing." }
  $PromptText = Get-Content -LiteralPath $PromptPath -Raw
  if ($PromptText -notlike "*Phase 168*" -or $PromptText -notlike "*$ExpectedZip*") { throw "Phase168 prompt validation failed." }
} else {
  [void]$RuntimeWarnings.Add("artifact-watch-request.json not present during verifier run")
}

$Closed167 = Get-ChildItem $Handoff -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "*phase167*" -and $_.Name -like "*CLOSED_CLEANLY.md" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
if (!$Closed167) { [void]$RuntimeWarnings.Add("Phase167 CLOSED_CLEANLY handoff not found in AutoOps handoff folder") }

Write-Host "VERIFIER PASS phase168 true end-to-end json closeout orchestrator"
if ($RuntimeWarnings.Count -gt 0) {
  Write-Host "Verifier warnings:"
  foreach ($Warning in $RuntimeWarnings) { Write-Host "- $Warning" }
}
exit 0

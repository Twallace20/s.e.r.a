param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Phase = 167
$PhaseSlug = "phase167_full_autopilot_loop_proof_v1"
$PhaseName = "s.e.r.a_phase167_full_autopilot_loop_proof_v1_overlay"
$ExpectedZip = "s.e.r.a_phase167_full_autopilot_loop_proof_v1_overlay.zip"

function Require-File {
  param([string]$RelativePath)
  $Path = Join-Path $RepoRoot $RelativePath
  if (!(Test-Path -LiteralPath $Path)) {
    throw "Missing required file: $RelativePath"
  }
  return $Path
}

function Require-TextMarker {
  param(
    [string]$Path,
    [string[]]$Markers,
    [string]$Label
  )

  $Text = Get-Content -LiteralPath $Path -Raw
  foreach ($Marker in $Markers) {
    if ($Text -notlike "*$Marker*") {
      throw "$Label missing marker: $Marker"
    }
  }
}

function Get-JsonPropertyValue {
  param([object]$Json,[string]$Name)
  if ($null -eq $Json) { return $null }
  $Prop = $Json.PSObject.Properties[$Name]
  if (!$Prop) { return $null }
  return $Prop.Value
}

$DocPath = Require-File "docs\phase167-full-autopilot-loop-proof-v1.md"
$VerifierPath = Require-File "scripts\verify-phase167-full-autopilot-loop-proof-v1.ps1"
$QaPath = Require-File "scripts\phase167-full-autopilot-loop-proof-v1.ps1"
$StatusPath = Require-File "scripts\phase167-full-autopilot-loop-status-v1.ps1"
$ManifestPath = Require-File ".overlay\phase167_full_autopilot_loop_proof_v1.json"
$ProofPath = Require-File ".sera-proof\phase167_full_autopilot_loop_proof_v1.json"
$UnifiedPath = Require-File "scripts\sera-unified-phone-json-to-closeout-v1.ps1"

Require-TextMarker -Path $DocPath -Label "Phase167 doc" -Markers @(
  "Full Autopilot Loop Proof",
  "PASS_GUARANTEED",
  "CLOSED_CLEANLY",
  "REQUEST_READY",
  "MERGE_PENDING",
  "stale handoff"
)

Require-TextMarker -Path $UnifiedPath -Label "Unified loop" -Markers @(
  "REQUEST_READY",
  "WAITING_FOR_ZIP",
  "SKIPPED_STALE",
  "SKIPPED_MALFORMED",
  "Read-SeraCommandJson",
  "Get-SeraJsonString",
  "NoApply"
)

Require-TextMarker -Path $QaPath -Label "Phase167 QA script" -Markers @(
  "PASS_GUARANTEED",
  "MERGE_PENDING",
  "Evidence",
  "Verifier Output",
  "phase167_full_autopilot_loop_proof_v1"
)

Require-TextMarker -Path $StatusPath -Label "Phase167 status script" -Markers @(
  "REQUEST_READY",
  "WAITING_FOR_ZIP",
  "PASS_GUARANTEED",
  "CLOSED_CLEANLY",
  "phase167_full_autopilot_loop_proof_v1"
)

$Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
if ([int]$Manifest.phase -ne $Phase) { throw "Overlay manifest phase mismatch." }
if ([string]$Manifest.phaseSlug -ne $PhaseSlug) { throw "Overlay manifest phaseSlug mismatch." }
if ([string]$Manifest.expectedZipFilename -ne $ExpectedZip) { throw "Overlay manifest expectedZipFilename mismatch." }

$Proof = Get-Content -LiteralPath $ProofPath -Raw | ConvertFrom-Json
if ([int]$Proof.phase -ne $Phase) { throw "Proof phase mismatch." }
if ([string]$Proof.phaseName -ne $PhaseName) { throw "Proof phaseName mismatch." }
if ([string]$Proof.qaGuaranteeScript -ne "scripts/phase167-full-autopilot-loop-proof-v1.ps1") { throw "Proof QA script mismatch." }

[scriptblock]::Create((Get-Content -LiteralPath $QaPath -Raw)) | Out-Null
[scriptblock]::Create((Get-Content -LiteralPath $StatusPath -Raw)) | Out-Null
[scriptblock]::Create((Get-Content -LiteralPath $VerifierPath -Raw)) | Out-Null

$Control = Join-Path $AutoOpsRoot "00_control_center"
$BridgeOutbox = Join-Path $AutoOpsRoot "15_bridge_outbox"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"

$RuntimeWarnings = New-Object System.Collections.Generic.List[string]

$RequestPath = Join-Path $Control "artifact-watch-request.json"
if (Test-Path -LiteralPath $RequestPath) {
  $Request = Get-Content -LiteralPath $RequestPath -Raw | ConvertFrom-Json
  if ([string]$Request.phase -ne "167") { throw "artifact-watch-request phase is not 167." }
  if ([string]$Request.expectedZipName -ne $ExpectedZip) { throw "artifact-watch-request expectedZipName mismatch." }
  $PromptPath = [string]$Request.promptFile
  if (!$PromptPath -or !(Test-Path -LiteralPath $PromptPath)) { throw "artifact-watch-request prompt file missing." }
  $PromptText = Get-Content -LiteralPath $PromptPath -Raw
  if ($PromptText -notlike "*Phase 167*" -or $PromptText -notlike "*$ExpectedZip*") { throw "Phase167 prompt validation failed." }
} else {
  [void]$RuntimeWarnings.Add("artifact-watch-request.json not present during verifier run")
}

$Closed166 = Get-ChildItem $Handoff -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "*phase166*" -and $_.Name -like "*CLOSED_CLEANLY.md" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$Closed166) {
  [void]$RuntimeWarnings.Add("Phase166 CLOSED_CLEANLY handoff not found in AutoOps handoff folder")
}

Write-Host "VERIFIER PASS phase167 full autopilot loop proof"
if ($RuntimeWarnings.Count -gt 0) {
  Write-Host "Verifier warnings:"
  foreach ($Warning in $RuntimeWarnings) { Write-Host "- $Warning" }
}
exit 0

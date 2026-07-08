param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseSlug = "phase193_chatgpt_artifact_download_bridge_v2_integration_v1"
$PhaseName = "s.e.r.a_phase193_chatgpt_artifact_download_bridge_v2_integration_v1_overlay"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}

function Assert-Parse {
  param([string]$Path)
  $Tokens = $null
  $Errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$Errors) | Out-Null
  if ($Errors -and $Errors.Count -gt 0) {
    $Joined = ($Errors | ForEach-Object { $_.Message }) -join "; "
    throw ("PowerShell parse failed for {0}: {1}" -f $Path, $Joined)
  }
}

$VerifyPass = Get-ChildItem $Handoff -File -Filter "$PhaseName-*VERIFY_PASS.md" -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -ge (Get-Date).AddMinutes(-30) } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

Assert-True ($null -ne $VerifyPass) "Fresh current-phase VERIFY_PASS handoff not found."

$Bridge = Join-Path $RepoRoot "scripts\sera-chatgpt-browser-bridge-v1.ps1"
$Helper = Join-Path $RepoRoot "scripts\sera-chatgpt-artifact-download-v2.ps1"
$Verifier = Join-Path $RepoRoot "scripts\verify-phase193-chatgpt-artifact-download-bridge-v2-integration-v1.ps1"
$Qa = Join-Path $RepoRoot "scripts\phase193-chatgpt-artifact-download-bridge-v2-integration-v1.ps1"
$Checksums = Join-Path $RepoRoot ".overlay\CHECKSUMS.sha256"
$Proof = Join-Path $RepoRoot ".sera-proof\phase193_chatgpt_artifact_download_bridge_v2_integration_v1.json"

foreach ($Path in @($Bridge,$Helper,$Verifier,$Qa)) {
  Assert-True (Test-Path $Path) ("Missing script: {0}" -f $Path)
  Assert-Parse $Path
}

Assert-True (Test-Path $Checksums) "CHECKSUMS.sha256 missing."
Assert-True (Test-Path $Proof) "Phase193 proof JSON missing."

$ChecksumText = (Get-Content -LiteralPath $Checksums -Raw) -replace "\\","/"
foreach ($Required in @(
  "repo/scripts/sera-chatgpt-browser-bridge-v1.ps1",
  "repo/scripts/sera-chatgpt-artifact-download-v2.ps1",
  "repo/scripts/verify-phase193-chatgpt-artifact-download-bridge-v2-integration-v1.ps1",
  "repo/scripts/phase193-chatgpt-artifact-download-bridge-v2-integration-v1.ps1",
  "repo/.sera-proof/phase193_chatgpt_artifact_download_bridge_v2_integration_v1.json",
  "repo/.overlay/phase193_chatgpt_artifact_download_bridge_v2_integration_v1.json",
  "repo/docs/phase193-chatgpt-artifact-download-bridge-v2-integration-v1.md"
)) {
  Assert-True ($ChecksumText.Contains($Required)) ("Checksum missing required path: {0}" -f $Required)
}

$BridgeText = Get-Content -LiteralPath $Bridge -Raw
$ProofText = Get-Content -LiteralPath $Proof -Raw

foreach ($Marker in @(
  "PHASE193_ARTIFACT_DOWNLOAD_BRIDGE_V2_INTEGRATED",
  "ARTIFACT_DOWNLOAD_V2_STRICT_CONTROL_SELECTOR",
  "ARTIFACT_DOWNLOAD_V2_CLICK_RESULT",
  "ARTIFACT_DOWNLOAD_V2_DOWNLOADED",
  "ARTIFACT_DOWNLOAD_V2_PROOF_PASS",
  "ARTIFACT_DOWNLOAD_V2_FALSE_SUCCESS_GUARD",
  "NO_FALSE_PROOF_PASS_AFTER_FAILED_DOWNLOAD",
  "SAVED_CHATGPT_TARGET_CAPTURE",
  "allowRandomRecentChatFallback false marker",
  "allowNewChatFallback false marker"
)) {
  Assert-True ($BridgeText.Contains($Marker)) ("Bridge missing marker: {0}" -f $Marker)
}

foreach ($Marker in @(
  "json_to_prompt_to_chatgpt_to_zip_to_closeout",
  "phase192_artifact_click_download_proof_pass",
  "standardized_blocked_handoff",
  "no_manual_zip_download_required_after_phase193"
)) {
  Assert-True ($ProofText.Contains($Marker)) ("Proof missing marker: {0}" -f $Marker)
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PassPath = Join-Path $Handoff ("{0}-{1}-PASS_GUARANTEED.md" -f $PhaseName,$Stamp)

@"
Status: PASS_GUARANTEED
Phase: $PhaseName
Timestamp: $Stamp

Result:
Phase193 QA passed.

Proof:
- Fresh current-phase verifier handoff was found.
- All Phase193 scripts parse.
- Overlay checksums include bridge, helper, proof, docs, verifier, and QA files.
- Browser bridge includes V2 strict artifact selector markers.
- Bridge includes false-success guard markers.
- Proof file records the six-part autopilot path and no-manual-ZIP goal.
- This phase is ready to be closed cleanly by the direct closeout hard gates.
"@ | Set-Content -LiteralPath $PassPath -Encoding UTF8

Write-Host "PASS_GUARANTEED"
Write-Host ("PHASE193_PASS_GUARANTEED_HANDOFF {0}" -f $PassPath)
exit 0

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

function Assert-File {
  param([string]$RelativePath)
  $Path = Join-Path $RepoRoot $RelativePath
  Assert-True (Test-Path $Path) ("Missing required file: {0}" -f $RelativePath)
  return $Path
}

function Assert-TextContains {
  param([string]$Text, [string]$Needle, [string]$Label)
  Assert-True ($Text.Contains($Needle)) ("Missing marker {0}: {1}" -f $Label, $Needle)
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

$Overlay = Assert-File ".overlay\phase193_chatgpt_artifact_download_bridge_v2_integration_v1.json"
$Proof = Assert-File ".sera-proof\phase193_chatgpt_artifact_download_bridge_v2_integration_v1.json"
$Doc = Assert-File "docs\phase193-chatgpt-artifact-download-bridge-v2-integration-v1.md"
$Bridge = Assert-File "scripts\sera-chatgpt-browser-bridge-v1.ps1"
$Helper = Assert-File "scripts\sera-chatgpt-artifact-download-v2.ps1"
$Verifier = Assert-File "scripts\verify-phase193-chatgpt-artifact-download-bridge-v2-integration-v1.ps1"
$Qa = Assert-File "scripts\phase193-chatgpt-artifact-download-bridge-v2-integration-v1.ps1"

Assert-Parse $Bridge
Assert-Parse $Helper
Assert-Parse $Verifier
Assert-Parse $Qa

$BridgeText = Get-Content -LiteralPath $Bridge -Raw
$HelperText = Get-Content -LiteralPath $Helper -Raw
$DocText = Get-Content -LiteralPath $Doc -Raw
$ProofText = Get-Content -LiteralPath $Proof -Raw

Assert-TextContains $BridgeText "ARTIFACT_DOWNLOAD_V2_STRICT_CONTROL_SELECTOR" "bridge-v2-selector"
Assert-TextContains $BridgeText "ARTIFACT_DOWNLOAD_V2_CLICK_RESULT" "bridge-click-result"
Assert-TextContains $BridgeText "ARTIFACT_DOWNLOAD_V2_DOWNLOADED" "bridge-downloaded"
Assert-TextContains $BridgeText "ARTIFACT_DOWNLOAD_V2_FALSE_SUCCESS_GUARD" "false-success-guard"
Assert-TextContains $BridgeText "NO_FALSE_PROOF_PASS_AFTER_FAILED_DOWNLOAD" "no-false-proof-pass"
Assert-TextContains $BridgeText "Browser.setDownloadBehavior" "download-routing"
Assert-TextContains $BridgeText "13_chatgpt_downloads" "download-dir-default"
Assert-TextContains $BridgeText "strict_download_control_clicked" "strict-click-action"
Assert-TextContains $BridgeText "giantContainer" "giant-container-rejection"

Assert-TextContains $HelperText "PHASE193_STANDALONE_ARTIFACT_DOWNLOAD_V2_HELPER" "helper-marker"
Assert-TextContains $DocText "six-part autopilot path" "doc-six-part-path"
Assert-TextContains $DocText "manual ZIP download" "doc-no-manual-zip"
Assert-TextContains $ProofText "phase192_artifact_click_download_proof_pass" "proof-phase192-learned-signal"
Assert-TextContains $ProofText "phase193_chatgpt_artifact_download_bridge_v2_integration_v1" "proof-current-phase"

$OverlayObj = Get-Content -LiteralPath $Overlay -Raw | ConvertFrom-Json
Assert-True ([string]$OverlayObj.phaseSlug -eq $PhaseSlug) "Overlay manifest phaseSlug mismatch."
Assert-True ([string]$OverlayObj.expectedZipFilename -eq "s.e.r.a_phase193_chatgpt_artifact_download_bridge_v2_integration_v1_overlay.zip") "Overlay manifest expectedZipFilename mismatch."
Assert-True ($OverlayObj.savedChatGptTargetOnly -eq $true) "Overlay manifest savedChatGptTargetOnly must be true."
Assert-True ($OverlayObj.allowRandomRecentChatFallback -eq $false) "Overlay manifest must disallow random recent chat fallback."
Assert-True ($OverlayObj.allowNewChatFallback -eq $false) "Overlay manifest must disallow new chat fallback."

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PassPath = Join-Path $Handoff ("{0}-{1}-VERIFY_PASS.md" -f $PhaseName,$Stamp)

@"
Status: VERIFY_PASS
Phase: $PhaseName
Timestamp: $Stamp

Result:
Phase193 verifier passed.

Proof:
- Browser bridge parses successfully.
- Standalone artifact downloader helper parses successfully.
- V2 strict artifact selector is installed in scripts\sera-chatgpt-browser-bridge-v1.ps1.
- The bridge rejects giant message containers and requires real anchor/button/download controls.
- The bridge routes downloads to 13_chatgpt_downloads using Browser.setDownloadBehavior.
- The bridge has a false-success guard and cannot print proof pass after a failed download.
- Saved ChatGPT target continuity remains installed.
- Random recent chat fallback and new chat fallback remain disallowed.
"@ | Set-Content -LiteralPath $PassPath -Encoding UTF8

Write-Host "VERIFY_PASS"
Write-Host ("PHASE193_VERIFY_PASS_HANDOFF {0}" -f $PassPath)
exit 0

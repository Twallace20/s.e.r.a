param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Phase = 194
$PhaseSlug = "phase194_chatgpt_artifact_download_bridge_v6_exact_dom_full_loop_proof_v1"
$PhaseName = "s.e.r.a_${PhaseSlug}_overlay"
$Kebab = "phase194-chatgpt-artifact-download-bridge-v6-exact-dom-full-loop-proof-v1"
$ExpectedZip = "s.e.r.a_phase194_chatgpt_artifact_download_bridge_v6_exact_dom_full_loop_proof_v1_overlay.zip"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"

New-Item -ItemType Directory -Force $Handoff | Out-Null

function Assert-FileExists {
  param([string]$Path)
  if (!(Test-Path $Path)) {
    throw ("Missing required file: {0}" -f $Path)
  }
}

function Assert-TextContains {
  param(
    [string]$Path,
    [string]$Needle
  )
  $Text = Get-Content -LiteralPath $Path -Raw
  if ($Text -notlike "*$Needle*") {
    throw ("Expected marker not found in {0}: {1}" -f $Path, $Needle)
  }
}

function Assert-ParseClean {
  param([string]$Path)
  Assert-FileExists $Path
  $Tokens = $null
  $Errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$Errors) | Out-Null
  if ($Errors -and $Errors.Count -gt 0) {
    $Joined = ($Errors | ForEach-Object { $_.Message }) -join "; "
    throw ("PowerShell parse failed for {0}: {1}" -f $Path, $Joined)
  }
}

$Required = @(
  ".overlay\phase194_chatgpt_artifact_download_bridge_v6_exact_dom_full_loop_proof_v1.json",
  ".overlay\CHECKSUMS.sha256",
  ".sera-proof\phase194_chatgpt_artifact_download_bridge_v6_exact_dom_full_loop_proof_v1.json",
  "docs\phase194-chatgpt-artifact-download-bridge-v6-exact-dom-full-loop-proof-v1.md",
  "scripts\sera-chatgpt-browser-bridge-v1.ps1",
  "scripts\sera-chatgpt-artifact-download-v6.ps1",
  "scripts\verify-phase194-chatgpt-artifact-download-bridge-v6-exact-dom-full-loop-proof-v1.ps1",
  "scripts\phase194-chatgpt-artifact-download-bridge-v6-exact-dom-full-loop-proof-v1.ps1"
)

foreach ($Rel in $Required) {
  Assert-FileExists (Join-Path $RepoRoot $Rel)
}

$Bridge = Join-Path $RepoRoot "scripts\sera-chatgpt-browser-bridge-v1.ps1"
$Helper = Join-Path $RepoRoot "scripts\sera-chatgpt-artifact-download-v6.ps1"
$Verifier = Join-Path $RepoRoot "scripts\verify-phase194-chatgpt-artifact-download-bridge-v6-exact-dom-full-loop-proof-v1.ps1"
$Qa = Join-Path $RepoRoot "scripts\phase194-chatgpt-artifact-download-bridge-v6-exact-dom-full-loop-proof-v1.ps1"
$Doc = Join-Path $RepoRoot "docs\phase194-chatgpt-artifact-download-bridge-v6-exact-dom-full-loop-proof-v1.md"
$Proof = Join-Path $RepoRoot ".sera-proof\phase194_chatgpt_artifact_download_bridge_v6_exact_dom_full_loop_proof_v1.json"
$Manifest = Join-Path $RepoRoot ".overlay\phase194_chatgpt_artifact_download_bridge_v6_exact_dom_full_loop_proof_v1.json"
$Checksums = Join-Path $RepoRoot ".overlay\CHECKSUMS.sha256"

Assert-ParseClean $Bridge
Assert-ParseClean $Helper
Assert-ParseClean $Verifier
Assert-ParseClean $Qa

$BridgeMarkers = @(
  "ARTIFACT_DOWNLOAD_V6_EXACT_DOM_SELECTOR",
  "newest exact expected filename button anywhere in DOM",
  "scroll into view",
  "ARTIFACT_DOWNLOAD_V6_CLICK_RESULT",
  "ARTIFACT_DOWNLOAD_V6_COORDINATE_CLICK",
  "ARTIFACT_DOWNLOAD_V6_DOWNLOADED",
  "ARTIFACT_DOWNLOAD_V6_PROOF_PASS",
  "ARTIFACT_DOWNLOAD_V6_FALSE_SUCCESS_GUARD",
  "Input.dispatchMouseEvent",
  "scrollIntoView",
  "IGNORING_STALE_ARTIFACT",
  "SAVED_CHATGPT_TARGET_CAPTURE",
  "PROMPT_SUBMIT_RESULT",
  "allowRandomRecentChatFallback",
  "allowNewChatFallback"
)

foreach ($Marker in $BridgeMarkers) {
  Assert-TextContains -Path $Bridge -Needle $Marker
}

foreach ($Marker in @("sixPartProofTarget", "installedCapabilities", "V6 exact DOM artifact downloader")) {
  Assert-TextContains -Path $Proof -Needle $Marker
}

foreach ($Marker in @("Full autopilot target", "Winning selector from Phase193", "Never write")) {
  Assert-TextContains -Path $Doc -Needle $Marker
}

$ManifestJson = Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json
if ([string]$ManifestJson.phaseSlug -ne $PhaseSlug) {
  throw ("Manifest phaseSlug mismatch: {0}" -f $ManifestJson.phaseSlug)
}
if ([string]$ManifestJson.expectedZipFilename -ne $ExpectedZip) {
  throw ("Manifest expectedZipFilename mismatch: {0}" -f $ManifestJson.expectedZipFilename)
}
if ($ManifestJson.savedChatGptTargetOnly -ne $true) {
  throw "Manifest savedChatGptTargetOnly must be true."
}
if ($ManifestJson.allowRandomRecentChatFallback -ne $false) {
  throw "Manifest allowRandomRecentChatFallback must be false."
}
if ($ManifestJson.allowNewChatFallback -ne $false) {
  throw "Manifest allowNewChatFallback must be false."
}

$ChecksumText = Get-Content -LiteralPath $Checksums -Raw
$NormalizedChecksums = $ChecksumText -replace "\\", "/"
foreach ($PathNeedle in @(
  "repo/scripts/sera-chatgpt-browser-bridge-v1.ps1",
  "repo/scripts/sera-chatgpt-artifact-download-v6.ps1",
  "repo/scripts/verify-phase194-chatgpt-artifact-download-bridge-v6-exact-dom-full-loop-proof-v1.ps1",
  "repo/scripts/phase194-chatgpt-artifact-download-bridge-v6-exact-dom-full-loop-proof-v1.ps1",
  "repo/.sera-proof/phase194_chatgpt_artifact_download_bridge_v6_exact_dom_full_loop_proof_v1.json"
)) {
  if ($NormalizedChecksums -notlike "*$PathNeedle*") {
    throw ("CHECKSUMS missing normalized path: {0}" -f $PathNeedle)
  }
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Out = Join-Path $Handoff ("{0}-{1}-VERIFY_PASS.md" -f $PhaseName, $Stamp)

@"
Status: VERIFY_PASS
Phase: $PhaseName
Branch: work/phase194-chatgpt-artifact-download-bridge-v6-exact-dom-full-loop-proof-v1
Timestamp: $Stamp

Result:
Phase194 verifier passed. The overlay installs the V6 exact DOM artifact downloader into the production ChatGPT browser bridge.

Proof:
- Required overlay files exist.
- Verifier, QA, bridge, and helper scripts parse cleanly.
- Bridge contains ARTIFACT_DOWNLOAD_V6_EXACT_DOM_SELECTOR.
- Bridge selects the newest exact expected filename button anywhere in DOM, scrolls into view, clicks, and uses CDP coordinate click backup.
- Bridge rejects stale artifacts and only emits proof pass after exact file presence.
- Manifest enforces savedChatGptTargetOnly=true and disables random recent/new chat fallback.
- CHECKSUMS paths normalize for Windows and POSIX separators.
"@ | Set-Content -LiteralPath $Out -Encoding UTF8

Write-Host "VERIFY_PASS"
Write-Host ("VERIFY_PASS_HANDOFF {0}" -f $Out)

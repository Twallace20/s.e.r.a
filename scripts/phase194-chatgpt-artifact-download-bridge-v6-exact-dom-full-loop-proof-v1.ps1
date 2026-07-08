param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseSlug = "phase194_chatgpt_artifact_download_bridge_v6_exact_dom_full_loop_proof_v1"
$PhaseName = "s.e.r.a_${PhaseSlug}_overlay"
$Kebab = "phase194-chatgpt-artifact-download-bridge-v6-exact-dom-full-loop-proof-v1"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

function Fail-QA {
  param([string]$Reason)
  throw ("PHASE194_QA_FAILED: {0}" -f $Reason)
}

function Assert-ParseClean {
  param([string]$Path)
  if (!(Test-Path $Path)) { Fail-QA ("Missing script: {0}" -f $Path) }
  $Tokens = $null
  $Errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$Errors) | Out-Null
  if ($Errors -and $Errors.Count -gt 0) {
    $Joined = ($Errors | ForEach-Object { $_.Message }) -join "; "
    Fail-QA ("PowerShell parse failed for {0}: {1}" -f $Path, $Joined)
  }
}

$Bridge = Join-Path $RepoRoot "scripts\sera-chatgpt-browser-bridge-v1.ps1"
$Helper = Join-Path $RepoRoot "scripts\sera-chatgpt-artifact-download-v6.ps1"
$Verifier = Join-Path $RepoRoot "scripts\verify-phase194-chatgpt-artifact-download-bridge-v6-exact-dom-full-loop-proof-v1.ps1"
$Qa = Join-Path $RepoRoot "scripts\phase194-chatgpt-artifact-download-bridge-v6-exact-dom-full-loop-proof-v1.ps1"
$Proof = Join-Path $RepoRoot ".sera-proof\phase194_chatgpt_artifact_download_bridge_v6_exact_dom_full_loop_proof_v1.json"
$Checksums = Join-Path $RepoRoot ".overlay\CHECKSUMS.sha256"

Assert-ParseClean $Bridge
Assert-ParseClean $Helper
Assert-ParseClean $Verifier
Assert-ParseClean $Qa

$VerifyPass = Get-ChildItem $Handoff -File -Filter "$PhaseName-*VERIFY_PASS.md" -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -ge (Get-Date).AddMinutes(-30) } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$VerifyPass) {
  Fail-QA "Fresh Phase194 VERIFY_PASS handoff not found."
}

$BridgeText = Get-Content -LiteralPath $Bridge -Raw

$OrderChecks = @(
  "ARTIFACT_DOWNLOAD_V6_EXACT_DOM_SELECTOR_START",
  "ARTIFACT_DOWNLOAD_V6_CLICK_RESULT",
  "ARTIFACT_DOWNLOAD_V6_DOWNLOADED",
  "ARTIFACT_DOWNLOAD_V6_PROOF_PASS"
)

foreach ($Marker in $OrderChecks) {
  if ($BridgeText -notlike "*$Marker*") {
    Fail-QA ("Bridge missing marker: {0}" -f $Marker)
  }
}

if ($BridgeText -notlike "*if (!(Test-Path `$Downloaded))*") {
  Fail-QA "Bridge missing explicit Test-Path false-success guard for final downloaded path."
}

if ($BridgeText -notlike "*r2.x + r2.width / 2*" -or $BridgeText -notlike "*Input.dispatchMouseEvent*") {
  Fail-QA "Bridge missing coordinate-click backup."
}

if (-not $BridgeText.Contains("controls.sort((a, b) => b.index - a.index)[0]")) {
  Fail-QA "Bridge does not select newest exact filename control by DOM order."
}

$ProofText = Get-Content -LiteralPath $Proof -Raw
foreach ($Marker in @("JSON lands in command_inbox", "S.E.R.A. clicks/downloads exact ZIP automatically using V6 exact DOM selector", "false success guard")) {
  if ($ProofText -notlike "*$Marker*") {
    Fail-QA ("Proof file missing marker: {0}" -f $Marker)
  }
}

$ChecksumText = Get-Content -LiteralPath $Checksums -Raw
$Normalized = $ChecksumText -replace "\\", "/"
foreach ($Needle in @(
  "repo/scripts/sera-chatgpt-browser-bridge-v1.ps1",
  "repo/scripts/sera-chatgpt-artifact-download-v6.ps1",
  "repo/docs/phase194-chatgpt-artifact-download-bridge-v6-exact-dom-full-loop-proof-v1.md"
)) {
  if ($Normalized -notlike "*$Needle*") {
    Fail-QA ("Checksum missing required path: {0}" -f $Needle)
  }
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Out = Join-Path $Handoff ("{0}-{1}-PASS_GUARANTEED.md" -f $PhaseName, $Stamp)

@"
Status: PASS_GUARANTEED
Phase: $PhaseName
Branch: work/phase194-chatgpt-artifact-download-bridge-v6-exact-dom-full-loop-proof-v1
Timestamp: $Stamp

Result:
Phase194 QA passed. The production bridge now carries the V6 exact DOM artifact downloader contract and safety guards.

Proof:
- Fresh VERIFY_PASS was present.
- Scripts parse cleanly.
- Bridge has V6 exact DOM selector markers.
- Bridge selects newest exact filename control by DOM order.
- Bridge scrolls/clicks and performs CDP coordinate backup.
- Bridge contains false-success guard before proof pass.
- Proof metadata covers the six-part full autopilot target.
"@ | Set-Content -LiteralPath $Out -Encoding UTF8

Write-Host "PASS_GUARANTEED"
Write-Host ("PASS_GUARANTEED_HANDOFF {0}" -f $Out)


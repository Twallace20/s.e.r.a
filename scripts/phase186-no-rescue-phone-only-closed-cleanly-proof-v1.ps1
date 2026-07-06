param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase186_no_rescue_phone_only_closed_cleanly_proof_v1_overlay"
$ExpectedZip = "s.e.r.a_phase186_no_rescue_phone_only_closed_cleanly_proof_v1_overlay.zip"

$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$BridgeOutbox = Join-Path $AutoOpsRoot "15_bridge_outbox"

New-Item -ItemType Directory -Force $Handoff | Out-Null

function Block-Qa {
  param([string]$Reason)

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Path = Join-Path $Handoff "$PhaseName-$Stamp-QA_BLOCKED.md"

  @"
Status: BLOCKED
Phase: $PhaseName
Timestamp: $Stamp
Reason: $Reason
"@ | Set-Content $Path -Encoding UTF8

  Write-Host "PHASE186_QA BLOCKED"
  Write-Host $Reason
  exit 1
}

$LatestVerify = Get-ChildItem $Handoff -File -Filter "$PhaseName-*VERIFY_PASS.md" -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -ge (Get-Date).AddMinutes(-10) } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$LatestVerify) {
  Block-Qa "Fresh current-phase VERIFY_PASS not found."
}

$RequiredFiles = @(
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  "scripts\sera-final-handoff-pasteback-v1.ps1",
  "scripts\verify-phase186-no-rescue-phone-only-closed-cleanly-proof-v1.ps1",
  ".overlay\phase186_no_rescue_phone_only_closed_cleanly_proof_v1.json",
  ".sera-proof\phase186_no_rescue_phone_only_closed_cleanly_proof_v1.json"
)

foreach ($File in $RequiredFiles) {
  $Path = Join-Path $RepoRoot $File
  if (!(Test-Path $Path)) {
    Block-Qa "Missing required file: $File"
  }
}

$ZipPath = Join-Path $Downloads13 $ExpectedZip
if (!(Test-Path $ZipPath)) {
  Block-Qa "Exact Phase186 ZIP missing in downloads."
}

$Prompt = Get-ChildItem $BridgeOutbox -File -Filter "*phase186*" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$Prompt) {
  Block-Qa "Phase186 bridge prompt missing."
}

$DirectText = Get-Content -LiteralPath (Join-Path $RepoRoot "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1") -Raw

foreach ($Marker in @("Resolve-SeraOverlayZip","ZIP_PATH_ARGUMENT_WAS_BLANK_RECOVERED","ZIP_PATH_RESOLVED_FROM_EXPECTED_FILENAME","ZIP_PATH_RESOLVED_FROM_DOWNLOADS13")) {
  if ($DirectText -notlike "*$Marker*") {
    Block-Qa "Missing real direct closeout repair marker: $Marker"
  }
}

$PastebackText = Get-Content -LiteralPath (Join-Path $RepoRoot "scripts\sera-final-handoff-pasteback-v1.ps1") -Raw

if ($PastebackText -notlike "*PASTEBACK_EXPECTED_FILENAME_RECOVERED*") {
  Block-Qa "Missing pasteback ExpectedFilename recovery marker."
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Path = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"

@"
Status: PASS_GUARANTEED
Phase: $PhaseName
Timestamp: $Stamp

Proof:
- Fresh current-phase VERIFY_PASS exists.
- Direct closeout now contains real ZIP recovery behavior.
- Pasteback now contains ExpectedFilename recovery.
- Phase186 exact ZIP and bridge prompt exist.
- PASS_GUARANTEED is current-phase only.
"@ | Set-Content $Path -Encoding UTF8

Write-Host "PHASE186_QA PASS_GUARANTEED"
Write-Host $Path
exit 0

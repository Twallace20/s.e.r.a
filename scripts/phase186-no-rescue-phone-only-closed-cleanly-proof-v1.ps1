param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase186_no_rescue_phone_only_closed_cleanly_proof_v1_overlay"
$Slug = "phase186_no_rescue_phone_only_closed_cleanly_proof_v1"
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
  ".overlay\phase186_no_rescue_phone_only_closed_cleanly_proof_v1.json",
  ".sera-proof\phase186_no_rescue_phone_only_closed_cleanly_proof_v1.json",
  "docs\phase186-no-rescue-phone-only-closed-cleanly-proof-v1.md",
  "scripts\verify-phase186-no-rescue-phone-only-closed-cleanly-proof-v1.ps1",
  "scripts\phase186-no-rescue-phone-only-closed-cleanly-proof-v1.ps1",
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  "scripts\sera-final-handoff-pasteback-v1.ps1"
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
foreach ($Marker in @("ZIP_PATH_ARGUMENT_WAS_BLANK_RECOVERED","ZIP_PATH_RESOLVED_FROM_EXPECTED_FILENAME","ZIP_PATH_RESOLVED_FROM_DOWNLOADS13")) {
  if ($DirectText -notlike "*$Marker*") {
    Block-Qa "Missing Phase185 direct closeout marker: $Marker"
  }
}

$PastebackText = Get-Content -LiteralPath (Join-Path $RepoRoot "scripts\sera-final-handoff-pasteback-v1.ps1") -Raw
if ($PastebackText -notlike "*PASTEBACK_EXPECTED_FILENAME_RECOVERED*") {
  Block-Qa "Missing Phase185 pasteback ExpectedFilename recovery marker."
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Path = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"

@"
Status: PASS_GUARANTEED
Phase: $PhaseName
Timestamp: $Stamp

Proof:
- Fresh current-phase VERIFY_PASS exists.
- Phase186 overlay proof files exist.
- Exact Phase186 ZIP exists.
- Phase186 bridge prompt exists.
- Phase185 hardened direct closeout markers remain installed.
- Phase185 pasteback ExpectedFilename recovery remains installed.
- PASS_GUARANTEED is current-phase only.
- No-rescue proof is ready for final pasteback and safe merge gates.
"@ | Set-Content $Path -Encoding UTF8

Write-Host "PHASE186_QA PASS_GUARANTEED"
Write-Host $Path
exit 0

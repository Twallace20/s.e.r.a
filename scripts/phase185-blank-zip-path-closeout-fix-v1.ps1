param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase185_blank_zip_path_closeout_fix_v1_overlay"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"

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

  Write-Host "PHASE185_QA BLOCKED"
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
  "scripts\verify-phase185-blank-zip-path-closeout-fix-v1.ps1",
  ".overlay\phase185_blank_zip_path_closeout_fix_v1.json",
  ".sera-proof\phase185_blank_zip_path_closeout_fix_v1.json"
)

foreach ($File in $RequiredFiles) {
  $Path = Join-Path $RepoRoot $File
  if (!(Test-Path $Path)) {
    Block-Qa "Missing required file: $File"
  }
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Path = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"

@"
Status: PASS_GUARANTEED
Phase: $PhaseName
Timestamp: $Stamp

Proof:
- Fresh current-phase VERIFY_PASS exists.
- Direct closeout wrapper exists.
- Pasteback ExpectedFilename fallback wrapper exists.
- PASS_GUARANTEED is current-phase only.
"@ | Set-Content $Path -Encoding UTF8

Write-Host "PHASE185_QA PASS_GUARANTEED"
Write-Host $Path
exit 0

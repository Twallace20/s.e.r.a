param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase184_phone_only_auto_watcher_drop_proof_v1_overlay"
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

  Write-Host "PHASE184_QA BLOCKED"
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
  ".overlay\phase184_phone_only_auto_watcher_drop_proof_v1.json",
  ".sera-proof\phase184_phone_only_auto_watcher_drop_proof_v1.json",
  "docs\phase184-phone-only-auto-watcher-drop-proof-v1.md",
  "scripts\verify-phase184-phone-only-auto-watcher-drop-proof-v1.ps1",
  "SERA_AUTO_WATCHER_RUNNER.ps1"
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
- Phase184 proof files exist.
- Auto-watcher runner exists.
- PASS_GUARANTEED is current-phase only.
"@ | Set-Content $Path -Encoding UTF8

Write-Host "PHASE184_QA PASS_GUARANTEED"
Write-Host $Path
exit 0

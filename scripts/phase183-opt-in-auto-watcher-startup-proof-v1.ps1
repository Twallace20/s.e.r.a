param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase183_opt_in_auto_watcher_startup_proof_v1_overlay"
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

  Write-Host "PHASE183_QA BLOCKED"
  Write-Host $Reason
  exit 1
}

$RequiredFiles = @(
  "SERA_ENABLE_AUTO_WATCHER.ps1",
  "SERA_DISABLE_AUTO_WATCHER.ps1",
  "SERA_AUTO_WATCHER_STATUS.ps1",
  "SERA_START_WATCHER_NOW.ps1",
  "scripts\sera-auto-watcher-scheduled-task-v1.ps1",
  "scripts\verify-phase183-opt-in-auto-watcher-startup-proof-v1.ps1"
)

foreach ($File in $RequiredFiles) {
  $Path = Join-Path $RepoRoot $File
  if (!(Test-Path $Path)) {
    Block-Qa "Missing required file: $File"
  }
}

$LatestVerify = Get-ChildItem $Handoff -File -Filter "$PhaseName-*VERIFY_PASS.md" -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -ge (Get-Date).AddMinutes(-10) } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$LatestVerify) {
  Block-Qa "Fresh current-phase VERIFY_PASS not found."
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Path = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"

@"
Status: PASS_GUARANTEED
Phase: $PhaseName
Timestamp: $Stamp

Proof:
- Fresh current-phase VERIFY_PASS exists.
- Phase183 auto-watcher scripts exist.
- Enable, disable, status, and start-now scripts are present.
- Current-user scheduled task helper is present.
- This PASS_GUARANTEED is current-phase only.
"@ | Set-Content $Path -Encoding UTF8

Write-Host "PHASE183_QA PASS_GUARANTEED"
Write-Host $Path
exit 0

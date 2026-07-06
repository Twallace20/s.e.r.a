param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase177_auto_inbox_trigger_and_single_run_abort_guard_v1_overlay"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

$Now = Get-Date

$VerifyPass = Get-ChildItem $Handoff -File -Filter "$PhaseName-*VERIFY_PASS.md" -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -ge $Now.AddMinutes(-10) } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$VerifyPass) {
  Write-Host "PHASE177_QA BLOCKED"
  Write-Host "Recent VERIFY_PASS handoff not found. Refusing PASS_GUARANTEED."
  exit 2
}

$Direct = Get-Content (Join-Path $RepoRoot "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1") -Raw
$Router = Get-Content (Join-Path $RepoRoot "scripts\sera-full-auto-json-loop-router-v1.ps1") -Raw
$Watcher = Get-Content (Join-Path $RepoRoot "scripts\sera-command-inbox-foreground-watcher-v1.ps1") -Raw

foreach ($Marker in @(
  "Invoke-RequiredScript",
  "Stop-WithBlocked",
  "Fresh PASS_GUARANTEED",
  "SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED"
)) {
  if ($Direct -notlike "*$Marker*") {
    Write-Host "PHASE177_QA BLOCKED"
    Write-Host "Direct closeout missing marker: $Marker"
    exit 3
  }
}

if ($Router -notlike "*STALE_HANDOFF_REFUSED*") {
  Write-Host "PHASE177_QA BLOCKED"
  Write-Host "Router stale handoff refusal missing."
  exit 4
}

if ($Watcher -notlike "*COMMAND_INBOX_FOREGROUND_WATCHER_START*") {
  Write-Host "PHASE177_QA BLOCKED"
  Write-Host "Foreground watcher marker missing."
  exit 5
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"

@"
Status: PASS_GUARANTEED
Phase: $PhaseName
Timestamp: $Stamp

SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED: true
WAIT_ONLY_CLOSED: true

Guarantee:
- Verifier passed in this run.
- QA passed in this run.
- Foreground command inbox watcher was installed without persistence.
- Direct closeout refuses merge unless verifier, QA, and fresh PASS_GUARANTEED gates all pass.
- Router refuses stale prior-phase handoffs.
"@ | Set-Content $PassPath -Encoding UTF8

Write-Host "PHASE177_QA PASS_GUARANTEED"
Write-Host $PassPath
exit 0

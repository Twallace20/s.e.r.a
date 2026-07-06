param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase187_pasteback_reliability_watcher_continuity_v1_overlay"
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

  Write-Host "PHASE187_QA BLOCKED"
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
  "SERA_WATCH_COMMAND_INBOX.ps1",
  "scripts\sera-command-json-route-downloads13-to-inbox-v1.ps1",
  "scripts\sera-final-handoff-pasteback-v1.ps1",
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  ".overlay\phase187_pasteback_reliability_watcher_continuity_v1.json",
  ".sera-proof\phase187_pasteback_reliability_watcher_continuity_v1.json"
)

foreach ($File in $RequiredFiles) {
  $Path = Join-Path $RepoRoot $File
  if (!(Test-Path $Path)) {
    Block-Qa "Missing required file: $File"
  }
}

$WatcherText = Get-Content -LiteralPath (Join-Path $RepoRoot "SERA_WATCH_COMMAND_INBOX.ps1") -Raw
foreach ($Marker in @("COMMAND_INBOX_BACKLOG_SCAN_START","WATCHER_RETURN_TO_WATCH_AFTER_RUN","NEW_COMMAND_JSON_DETECTED")) {
  if ($WatcherText -notlike "*$Marker*") {
    Block-Qa "Missing watcher marker: $Marker"
  }
}

$PastebackText = Get-Content -LiteralPath (Join-Path $RepoRoot "scripts\sera-final-handoff-pasteback-v1.ps1") -Raw
foreach ($Marker in @("PASTEBACK_INTERNAL_RETRY_START","PASTEBACK_RETRYABLE_BLOCKED","send_button_not_found","Promise was collected")) {
  if ($PastebackText -notlike "*$Marker*") {
    Block-Qa "Missing pasteback reliability marker: $Marker"
  }
}

$RouterText = Get-Content -LiteralPath (Join-Path $RepoRoot "scripts\sera-command-json-route-downloads13-to-inbox-v1.ps1") -Raw
foreach ($Marker in @("COMMAND_JSON_ROUTED_FROM_DOWNLOADS13","ROUTED_COMMAND_JSON_TO_INBOX","COMMAND_JSON_ROUTE_REJECTED_NOT_COMMAND")) {
  if ($RouterText -notlike "*$Marker*") {
    Block-Qa "Missing command JSON router marker: $Marker"
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
- Watcher continuity patch exists.
- Watcher startup backlog scan patch exists.
- Command JSON routing from 13_chatgpt_downloads to command_inbox exists.
- Pasteback internal retry patch exists.
- PASS_GUARANTEED is current-phase only.

Next:
Phase188 should be the true no-rescue proof.
"@ | Set-Content $Path -Encoding UTF8

Write-Host "PHASE187_QA PASS_GUARANTEED"
Write-Host $Path
exit 0

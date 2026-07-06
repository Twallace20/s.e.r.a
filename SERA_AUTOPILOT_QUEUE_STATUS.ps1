param(
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [switch]$AsJson
)

$ErrorActionPreference = "Stop"

$StateDir = Join-Path $AutoOpsRoot "00_control_center\state"
$QueueStatePath = Join-Path $StateDir "autopilot-sequential-phase-queue-v1.json"
$QueueEventsPath = Join-Path $StateDir "autopilot-sequential-phase-queue-events-v1.jsonl"
$RunLockPath = Join-Path $StateDir "autopilot-sequential-phase-run-lock-v1.json"
$BlockedPausePath = Join-Path $StateDir "autopilot-sequence-paused-after-block-v1.json"
$CommandInbox = Join-Path $AutoOpsRoot "00_control_center\command_inbox"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"

function Read-JsonOrNull {
  param([string]$Path)
  if (!(Test-Path $Path)) { return $null }
  try { return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json) } catch { return $null }
}

$QueueState = Read-JsonOrNull -Path $QueueStatePath
$RunLock = Read-JsonOrNull -Path $RunLockPath
$BlockedPause = Read-JsonOrNull -Path $BlockedPausePath
$PendingCommands = @(Get-ChildItem $CommandInbox -File -Filter "autopilot-command-*.json" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime | Select-Object Name, LastWriteTime, Length)
$DownloadedJson = @(Get-ChildItem $Downloads13 -File -Filter "autopilot-command-*.json" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime | Select-Object Name, LastWriteTime, Length)
$RecentFinals = @(Get-ChildItem $Handoff -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*CLOSED_CLEANLY.md" -or $_.Name -like "*BLOCKED.md" } | Sort-Object LastWriteTime -Descending | Select-Object -First 10 Name, LastWriteTime, Length)
$RecentEvents = @()
if (Test-Path $QueueEventsPath) {
  $RecentEvents = @(Get-Content -LiteralPath $QueueEventsPath -Tail 25)
}

$Report = [ordered]@{
  schema = "autopilot-sequential-phase-queue-status-v1"
  generatedAt = (Get-Date).ToString("o")
  autoOpsRoot = $AutoOpsRoot
  queueStatePath = $QueueStatePath
  queueState = $QueueState
  runLock = $RunLock
  blockedPause = $BlockedPause
  pendingCommandInboxCount = $PendingCommands.Count
  downloadedCommandJsonCount = $DownloadedJson.Count
  pendingCommandInbox = $PendingCommands
  downloadedCommandJson = $DownloadedJson
  recentFinalHandoffs = $RecentFinals
  recentQueueEvents = $RecentEvents
}

if ($AsJson) {
  $Report | ConvertTo-Json -Depth 12
} else {
  "SERA_AUTOPILOT_QUEUE_STATUS"
  "Status=$($QueueState.status)"
  "PhaseSlug=$($QueueState.phaseSlug)"
  "BlockedPhaseSlug=$($BlockedPause.blockedPhaseSlug)"
  "RunLockPid=$($RunLock.pid)"
  "PendingCommandInboxCount=$($PendingCommands.Count)"
  "DownloadedCommandJsonCount=$($DownloadedJson.Count)"
  "QueueStatePath=$QueueStatePath"
  "BlockedPausePath=$BlockedPausePath"
}

# PHASE188_QUEUE_STATUS: surfaces queue state, lock state, blocked pause, pending command JSON, and recent final handoffs.

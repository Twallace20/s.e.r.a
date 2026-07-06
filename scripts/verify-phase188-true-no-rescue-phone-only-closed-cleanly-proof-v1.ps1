param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$PhaseName = "s.e.r.a_phase188_true_no_rescue_phone_only_closed_cleanly_proof_v1_overlay",
  [string]$PhaseSlug = "phase188_true_no_rescue_phone_only_closed_cleanly_proof_v1",
  [string]$PhaseToken = "phase188-true-no-rescue-phone-only-closed-cleanly-proof-v1",
  [int]$Phase = 188
)

$ErrorActionPreference = "Stop"

$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

function Assert-File {
  param([string]$Path)
  if (!(Test-Path $Path)) { throw "Missing required file: $Path" }
  Write-Host "PHASE188_FILE_OK $Path"
}

function Assert-ParseOk {
  param([string]$Path)
  Assert-File $Path
  $Tokens = $null
  $Errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$Errors) | Out-Null
  if ($Errors -and $Errors.Count -gt 0) { throw "Parse failed: $Path :: $($Errors[0].Message)" }
  Write-Host "PHASE188_PARSE_OK $Path"
}

function Assert-Contains {
  param([string]$Path, [string]$Needle)
  $Text = Get-Content -LiteralPath $Path -Raw
  if ($Text -notlike "*$Needle*") { throw "Missing marker '$Needle' in $Path" }
  Write-Host "PHASE188_MARKER_OK $Needle"
}

$Watcher = Join-Path $RepoRoot "SERA_WATCH_COMMAND_INBOX.ps1"
$Status = Join-Path $RepoRoot "SERA_AUTOPILOT_QUEUE_STATUS.ps1"
$Router = Join-Path $RepoRoot "scripts\sera-command-json-route-downloads13-to-inbox-v1.ps1"
$Direct = Join-Path $RepoRoot "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1"
$Pasteback = Join-Path $RepoRoot "scripts\sera-final-handoff-pasteback-v1.ps1"
$Qa = Join-Path $RepoRoot "scripts\phase188-true-no-rescue-phone-only-closed-cleanly-proof-v1.ps1"
$VerifierAlias = Join-Path $RepoRoot "scripts\verify-true-no-rescue-phone-only-closed-cleanly-proof-v1.ps1"
$QaAlias = Join-Path $RepoRoot "scripts\true-no-rescue-phone-only-closed-cleanly-proof-v1.ps1"

Assert-ParseOk $VerifierAlias
Assert-ParseOk $QaAlias
Assert-ParseOk $Watcher
Assert-ParseOk $Status
Assert-ParseOk $Router
Assert-ParseOk $Direct
Assert-ParseOk $Pasteback
Assert-ParseOk $Qa

$WatcherMarkers = @(
  "PHASE188_QUEUE_CONTROLLER",
  "PHASE188_FIX_SKIP_BROWSER_WHEN_EXACT_ZIP_PRESENT",
  "EXACT_ZIP_ALREADY_PRESENT_SKIP_BROWSER_BRIDGE",
  "AUTOPILOT_RUN_LOCK_ACQUIRED",
  "AUTOPILOT_SEQUENCE_HALTED_ON_BLOCKED",
  "PHASE188_BLOCKED_HANDOFF_WRITTEN",
  "COMMAND_JSON_ROUTED_FROM_DOWNLOADS13",
  "NEW_COMMAND_JSON_DETECTED",
  "REQUEST_READY",
  "ZIP_READY",
  "RUN_DIRECT_ZIP_CLOSEOUT",
  "CLOSED_CLEANLY",
  "BLOCKED"
)
foreach ($Marker in $WatcherMarkers) { Assert-Contains $Watcher $Marker }

Assert-Contains $Status "PHASE188_QUEUE_STATUS"
Assert-Contains $Router "ROUTED_COMMAND_JSON_TO_INBOX"
Assert-Contains $Router "COMMAND_JSON_ROUTED_FROM_DOWNLOADS13"
Assert-Contains $Direct "PHASE187_COMPAT_FIX"
Assert-Contains $Direct "ZIP_PATH_RESOLVED_FROM_EXPECTED_FILENAME"
Assert-Contains $Pasteback "PASTEBACK_INTERNAL_RETRY_START"
Assert-Contains $Pasteback "PASTEBACK_POSTED_TEXT_MATCH"
Assert-Contains $Pasteback "Promise was collected"
Assert-Contains $Pasteback "send_button_not_found"
Assert-Contains $VerifierAlias "PHASE188_VERIFIER_ALIAS_COMPAT"
Assert-Contains $QaAlias "PHASE188_QA_ALIAS_COMPAT"

$WatcherText = Get-Content -LiteralPath $Watcher -Raw
if ($WatcherText -match "Register-ScheduledTask|New-Service|schtasks|Startup\SERA_AutoOps_Command_Inbox_Watcher") {
  throw "Phase188 watcher must not add new persistence, scheduled tasks, or services."
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$VerifyHandoffPath = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"
@"
# S.E.R.A. AutoOps Packet

Status: VERIFY_PASS
Phase: $PhaseName
Timestamp: $Stamp

## Summary
Phase188 verifier passed. Required watcher, router, direct closeout, pasteback, queue status, verifier alias, and QA alias files are present, parseable, and contain the required Phase188/Phase187 carry-forward markers.

## Proof
- PHASE188_VERIFY PASS
- PHASE188_VERIFY_HANDOFF_WRITTEN
- PHASE188_FIX_SKIP_BROWSER_WHEN_EXACT_ZIP_PRESENT
- EXACT_ZIP_ALREADY_PRESENT_SKIP_BROWSER_BRIDGE
- PHASE188_VERIFIER_ALIAS_COMPAT
- PHASE188_QA_ALIAS_COMPAT
"@ | Set-Content -LiteralPath $VerifyHandoffPath -Encoding UTF8

Write-Host "PHASE188_VERIFY_HANDOFF_WRITTEN $VerifyHandoffPath"
Write-Host "PHASE188_VERIFY PASS"
exit 0

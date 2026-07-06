param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$PhaseName = "s.e.r.a_phase189_final_handoff_identity_integrity_true_no_rescue_v1_overlay",
  [string]$PhaseSlug = "phase189_final_handoff_identity_integrity_true_no_rescue_v1",
  [string]$PhaseToken = "phase189-final-handoff-identity-integrity-true-no-rescue-v1",
  [int]$Phase = 189
)

$ErrorActionPreference = "Stop"

$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

function Assert-File {
  param([string]$Path)
  if (!(Test-Path $Path)) { throw "Missing required file: $Path" }
  Write-Host "PHASE189_FILE_OK $Path"
}

function Assert-ParseOk {
  param([string]$Path)
  Assert-File $Path
  $Tokens = $null
  $Errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$Errors) | Out-Null
  if ($Errors -and $Errors.Count -gt 0) { throw "Parse failed: $Path :: $($Errors[0].Message)" }
  Write-Host "PHASE189_PARSE_OK $Path"
}

function Assert-Contains {
  param([string]$Path, [string]$Needle)
  $Text = Get-Content -LiteralPath $Path -Raw
  if ($Text -notlike "*$Needle*") { throw "Missing marker '$Needle' in $Path" }
  Write-Host "PHASE189_MARKER_OK $Needle"
}

$Watcher = Join-Path $RepoRoot "SERA_WATCH_COMMAND_INBOX.ps1"
$Direct = Join-Path $RepoRoot "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1"
$Pasteback = Join-Path $RepoRoot "scripts\sera-final-handoff-pasteback-v1.ps1"
$Verifier = Join-Path $RepoRoot "scripts\verify-phase189-final-handoff-identity-integrity-true-no-rescue-v1.ps1"
$Qa = Join-Path $RepoRoot "scripts\phase189-final-handoff-identity-integrity-true-no-rescue-v1.ps1"
$VerifierAlias = Join-Path $RepoRoot "scripts\verify-final-handoff-identity-integrity-true-no-rescue-v1.ps1"
$QaAlias = Join-Path $RepoRoot "scripts\final-handoff-identity-integrity-true-no-rescue-v1.ps1"

foreach ($File in @($Watcher, $Direct, $Pasteback, $Verifier, $Qa, $VerifierAlias, $QaAlias)) { Assert-ParseOk $File }

$WatcherMarkers = @(
  "PHASE188_QUEUE_CONTROLLER",
  "PHASE188_FIX_SKIP_BROWSER_WHEN_EXACT_ZIP_PRESENT",
  "EXACT_ZIP_ALREADY_PRESENT_SKIP_BROWSER_BRIDGE",
  "RUN_DIRECT_ZIP_CLOSEOUT",
  "WATCHER_RETURN_TO_WATCH_AFTER_RUN",
  "PHASE189_FINAL_HANDOFF_IDENTITY_INTEGRITY_GUARD",
  "FINAL_HANDOFF_IDENTITY_VALIDATED",
  "STALE_HANDOFF_REJECTED"
)
foreach ($Marker in $WatcherMarkers) { Assert-Contains $Watcher $Marker }

$DirectMarkers = @(
  "PHASE187_COMPAT_FIX",
  "ZIP_PATH_RESOLVED_FROM_EXPECTED_FILENAME",
  "PHASE189_FINAL_HANDOFF_IDENTITY_INTEGRITY_GUARD",
  "FINAL_HANDOFF_IDENTITY_VALIDATED",
  "STALE_HANDOFF_REJECTED"
)
foreach ($Marker in $DirectMarkers) { Assert-Contains $Direct $Marker }

$PastebackMarkers = @(
  "PASTEBACK_POSTED_TEXT_MATCH",
  "PASTEBACK_INTERNAL_RETRY_START"
)
foreach ($Marker in $PastebackMarkers) { Assert-Contains $Pasteback $Marker }

Assert-Contains $VerifierAlias "PHASE189_VERIFIER_ALIAS_COMPAT"
Assert-Contains $QaAlias "PHASE189_QA_ALIAS_COMPAT"
Assert-Contains $Qa "PHASE189_CURRENT_PHASE_FINAL_HANDOFF_SEED"
Assert-Contains $Qa "FINAL_HANDOFF_IDENTITY_VALIDATED"

$WatcherText = Get-Content -LiteralPath $Watcher -Raw
$DirectText = Get-Content -LiteralPath $Direct -Raw
if (($WatcherText + $DirectText) -match "Register-ScheduledTask|New-Service|schtasks /create|New-LocalUser|Set-ExecutionPolicy") {
  throw "Phase189 must not add new persistence, services, security changes, or policy changes."
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$VerifyHandoffPath = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"
@"
# S.E.R.A. AutoOps Packet

Status: VERIFY_PASS
Phase: $PhaseName
Timestamp: $Stamp

## Summary
Phase189 verifier passed. The installed files include final handoff identity integrity guards, current-phase verifier/QA aliases, pasteback carry-forward checks, and Phase188 pre-seeded ZIP bridge bypass markers.

## Proof
- PHASE189_VERIFY PASS
- PHASE189_VERIFY_HANDOFF_WRITTEN
- PHASE189_FINAL_HANDOFF_IDENTITY_INTEGRITY_GUARD
- FINAL_HANDOFF_IDENTITY_VALIDATED
- STALE_HANDOFF_REJECTED
- EXACT_ZIP_ALREADY_PRESENT_SKIP_BROWSER_BRIDGE
- RUN_DIRECT_ZIP_CLOSEOUT
- PASTEBACK_POSTED_TEXT_MATCH
"@ | Set-Content -LiteralPath $VerifyHandoffPath -Encoding UTF8

Write-Host "PHASE189_VERIFY_HANDOFF_WRITTEN $VerifyHandoffPath"
Write-Host "PHASE189_VERIFY PASS"
exit 0

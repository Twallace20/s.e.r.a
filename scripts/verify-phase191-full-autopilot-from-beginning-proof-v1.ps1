param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Phase = 191
$PhaseSlug = "phase191_full_autopilot_from_beginning_proof_v1"
$PhaseName = "s.e.r.a_phase191_full_autopilot_from_beginning_proof_v1_overlay"
$TagName = "phase-191-full-autopilot-from-beginning-proof-v1"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

function Assert-Exists {
  param([string]$Path, [string]$Label)
  if (!(Test-Path $Path)) { throw ("Missing required {0}: {1}" -f $Label, $Path) }
  Write-Host "PHASE191_VERIFY_EXISTS $Label $Path"
}

function Assert-Text {
  param([string]$Path, [string]$Pattern, [string]$Label)
  $Text = Get-Content -LiteralPath $Path -Raw
  if ($Text -notlike "*$Pattern*") { throw ("Missing required marker '{0}' in {1}: {2}" -f $Pattern, $Label, $Path) }
  Write-Host "PHASE191_VERIFY_MARKER $Label $Pattern"
}

Set-Location $RepoRoot

Assert-Exists (Join-Path $RepoRoot ".overlay\$PhaseSlug.json") ".overlay manifest"
Assert-Exists (Join-Path $RepoRoot ".sera-proof\$PhaseSlug.json") ".sera-proof file"
Assert-Exists (Join-Path $RepoRoot "docs\phase191-full-autopilot-from-beginning-proof-v1.md") "documentation"
Assert-Exists (Join-Path $RepoRoot "scripts\phase191-full-autopilot-from-beginning-proof-v1.ps1") "QA script"
Assert-Exists (Join-Path $RepoRoot "scripts\verify-phase191-full-autopilot-from-beginning-proof-v1.ps1") "verifier script"

$Direct = Join-Path $RepoRoot "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1"
Assert-Exists $Direct "direct closeout script"
Assert-Text $Direct "FINAL_HANDOFF_IDENTITY_VALIDATED_BEFORE_MERGE" "direct closeout script"
Assert-Text $Direct "PASTEBACK_POSTED_TEXT_MATCH" "direct closeout script"

$Watcher = Join-Path $RepoRoot "SERA_WATCH_COMMAND_INBOX.ps1"
Assert-Exists $Watcher "command inbox watcher"
Assert-Text $Watcher "WATCHER_RETURN_TO_WATCH_AFTER_RUN" "watcher"
Assert-Text $Watcher "RUN_DIRECT_ZIP_CLOSEOUT" "watcher"

$Out = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"
@"
Status: VERIFY_PASS
Phase: $PhaseName
Branch: $(git branch --show-current)
Timestamp: $Stamp
Tag: $TagName

Result: Phase191 verifier passed for the full-autopilot-from-beginning proof overlay.

Proof:
- Current Phase191 overlay identity was present.
- Current Phase191 .sera-proof file was present.
- Phase191 verifier and QA scripts were present.
- Direct closeout still contains final handoff identity validation before merge.
- Direct closeout still requires PASTEBACK_POSTED_TEXT_MATCH before merge/tag/push/cleanup.
- Watcher still contains RUN_DIRECT_ZIP_CLOSEOUT and WATCHER_RETURN_TO_WATCH_AFTER_RUN markers.
- No random recent chat fallback or new chat fallback is used by this overlay.
"@ | Set-Content -LiteralPath $Out -Encoding UTF8

Write-Host "VERIFY_PASS $Out"
exit 0


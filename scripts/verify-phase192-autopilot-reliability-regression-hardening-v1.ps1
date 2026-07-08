param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Phase = 192
$PhaseSlug = "phase192_autopilot_reliability_regression_hardening_v1"
$PhaseName = "s.e.r.a_phase192_autopilot_reliability_regression_hardening_v1_overlay"
$TagName = "phase-192-autopilot-reliability-regression-hardening-v1"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

function Assert-Exists {
  param([string]$Path, [string]$Label)
  if (!(Test-Path $Path)) { throw ("Missing required {0}: {1}" -f $Label, $Path) }
}

function Assert-Contains {
  param([string]$Path, [string]$Pattern, [string]$Label)
  Assert-Exists -Path $Path -Label $Label
  $Text = Get-Content -LiteralPath $Path -Raw
  if ($Text -notlike "*$Pattern*") { throw ("Missing required marker '{0}' in {1}: {2}" -f $Pattern, $Label, $Path) }
}

function Assert-PowerShellParses {
  param([string]$Path)
  Assert-Exists -Path $Path -Label "PowerShell script"
  $Tokens = $null
  $Errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$Errors) | Out-Null
  if ($Errors -and $Errors.Count -gt 0) { throw ("PowerShell parse failed for {0}: {1}" -f $Path, $Errors[0].Message) }
}

Set-Location $RepoRoot

$Required = @(
  ".overlay\phase192_autopilot_reliability_regression_hardening_v1.json",
  ".sera-proof\phase192_autopilot_reliability_regression_hardening_v1.json",
  "docs\phase192-autopilot-reliability-regression-hardening-v1.md",
  "scripts\sera-autopilot-reliability-regression-hardening-v1.ps1",
  "scripts\verify-phase192-autopilot-reliability-regression-hardening-v1.ps1",
  "scripts\phase192-autopilot-reliability-regression-hardening-v1.ps1"
)

foreach ($Rel in $Required) {
  Assert-Exists -Path (Join-Path $RepoRoot $Rel) -Label $Rel
}

$ReliabilityScript = Join-Path $RepoRoot "scripts\sera-autopilot-reliability-regression-hardening-v1.ps1"
$VerifierScript = Join-Path $RepoRoot "scripts\verify-phase192-autopilot-reliability-regression-hardening-v1.ps1"
$QaScript = Join-Path $RepoRoot "scripts\phase192-autopilot-reliability-regression-hardening-v1.ps1"
$DirectCloseout = Join-Path $RepoRoot "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1"
$Watcher = Join-Path $RepoRoot "SERA_WATCH_COMMAND_INBOX.ps1"

foreach ($Script in @($ReliabilityScript, $VerifierScript, $QaScript, $DirectCloseout, $Watcher)) {
  Assert-PowerShellParses -Path $Script
}

foreach ($Marker in @(
  "PHASE192_AUTOPILOT_RELIABILITY_REGRESSION_HARDENING",
  "PHASE192_DIRTY_WORKTREE_PREFLIGHT",
  "PHASE192_SCRIPT_PARSE_PRECHECK",
  "PHASE192_CHECKSUM_PATH_NORMALIZATION",
  "PHASE192_ZIP_HASH_CHANGE_ASSERTION",
  "PHASE192_DUPLICATE_COMMAND_AFTER_SUCCESS_GUARD",
  "PHASE192_FRESH_HANDOFF_GATES",
  "PHASE192_PASTEBACK_BEFORE_MERGE_GUARD",
  "PHASE192_WATCHER_RETURN_PROOF"
)) {
  Assert-Contains -Path $ReliabilityScript -Pattern $Marker -Label "Phase192 reliability hardening script"
}

Assert-Contains -Path $DirectCloseout -Pattern "FINAL_HANDOFF_IDENTITY_VALIDATED_BEFORE_MERGE" -Label "direct closeout final handoff identity hard gate"
Assert-Contains -Path $DirectCloseout -Pattern "PASTEBACK_POSTED_TEXT_MATCH_REQUIRED_BEFORE_MERGE" -Label "direct closeout pasteback-before-merge hard gate"
Assert-Contains -Path $DirectCloseout -Pattern "Fresh current-phase VERIFY_PASS" -Label "fresh verifier gate"
Assert-Contains -Path $DirectCloseout -Pattern "Fresh current-phase PASS_GUARANTEED" -Label "fresh QA gate"
Assert-Contains -Path $Watcher -Pattern "AUTOPILOT_QUEUE_PAUSED_SKIPPING_DOWNSTREAM" -Label "blocked queue downstream guard"
Assert-Contains -Path $Watcher -Pattern "WATCHER_RETURN_TO_WATCH_AFTER_RUN" -Label "watcher return proof"

$OverlayJson = Get-Content -LiteralPath (Join-Path $RepoRoot ".overlay\phase192_autopilot_reliability_regression_hardening_v1.json") -Raw | ConvertFrom-Json
if ([string]$OverlayJson.phaseSlug -ne $PhaseSlug) { throw "Overlay phaseSlug mismatch." }
if ([int]$OverlayJson.phase -ne $Phase) { throw "Overlay phase number mismatch." }
if ([string]$OverlayJson.expectedZipFilename -ne "s.e.r.a_phase192_autopilot_reliability_regression_hardening_v1_overlay.zip") { throw "Overlay expected ZIP mismatch." }
if ($OverlayJson.commandContract.allowRandomRecentChatFallback -ne $false) { throw "Random recent chat fallback must remain false." }
if ($OverlayJson.commandContract.allowNewChatFallback -ne $false) { throw "New chat fallback must remain false." }

$Out = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"
@"
Status: VERIFY_PASS
Phase: $PhaseName
Branch: $(git branch --show-current)
Timestamp: $Stamp
Tag: $TagName

Result: Phase192 verifier passed for autopilot reliability regression hardening.

Proof:
- Phase192 overlay identity and .sera-proof files are present.
- Phase192 reliability hardening script is present and parse-valid.
- Phase192 verifier and QA scripts are parse-valid.
- Direct closeout still contains final handoff identity validation before merge.
- Direct closeout still requires PASTEBACK_POSTED_TEXT_MATCH before merge/tag/push/cleanup.
- Fresh current-phase VERIFY_PASS and PASS_GUARANTEED gates remain present.
- Watcher still contains blocked queue downstream guard and watcher-return proof.
- No random recent chat fallback or new chat fallback is allowed by this overlay.
"@ | Set-Content -LiteralPath $Out -Encoding UTF8

Write-Host "VERIFY_PASS $Out"
exit 0

[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)
$ErrorActionPreference = "Stop"
$Phase = "197"
$PhaseSlug = "phase197_full_autopilot_json_to_remote_truth_closeout_proof_v1"
$PhaseName = "s.e.r.a_${PhaseSlug}_overlay"
$ExpectedZipFilename = "s.e.r.a_phase197_full_autopilot_json_to_remote_truth_closeout_proof_v1_overlay.zip"
$Phase196Baseline = "7a060e9eb81af79b37b581ca9147b36869866e17"
$Phase196Tag = "phase-196-closeout-integrity-remote-truth-gate-v1"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force -Path $Handoff | Out-Null
Set-Location $RepoRoot
function Fail-Verify([string]$Reason) {
  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Path = Join-Path $Handoff "$PhaseName-$Stamp-BLOCKED.md"
@"
Status: BLOCKED
Phase: $PhaseName
PhaseSlug: $PhaseSlug
Timestamp: $Stamp
Reason: $Reason

Gate result:
Verifier failed. QA, merge, tag, push, cleanup, pasteback, and CLOSED_CLEANLY must not run after this failure.
"@ | Set-Content -LiteralPath $Path -Encoding UTF8
  Write-Host "VERIFY_BLOCKED phase=197 handoff=$Path reason=$Reason"
  throw $Reason
}
function Require-File([string]$Path, [string]$Label) { if (!(Test-Path -LiteralPath $Path)) { Fail-Verify "Missing required ${Label}: $Path" } }
function Require-Text([string]$Path, [string]$Text, [string]$Label) { Require-File $Path $Label; $Raw = Get-Content -LiteralPath $Path -Raw; if ($Raw -notlike "*$Text*") { Fail-Verify "Missing marker '$Text' in ${Label}: $Path" } }
function Require-Parse([string]$Path, [string]$Label) { Require-File $Path $Label; try { [scriptblock]::Create((Get-Content -LiteralPath $Path -Raw)) | Out-Null } catch { Fail-Verify "PowerShell parse failure in ${Label}: $($_.Exception.Message)" } }
$Gate = Join-Path $RepoRoot "scripts\sera-full-autopilot-json-to-remote-truth-closeout-proof-v1.ps1"
$Fixtures = Join-Path $RepoRoot "scripts\phase197-full-autopilot-json-to-remote-truth-closeout-proof-fixtures-v1.ps1"
$Qa = Join-Path $RepoRoot "scripts\qa-phase197-full-autopilot-json-to-remote-truth-closeout-proof-v1.ps1"
$Alias = Join-Path $RepoRoot "scripts\phase197-full-autopilot-json-to-remote-truth-closeout-proof-v1.ps1"
$Doc = Join-Path $RepoRoot "docs\phases\PHASE_197_FULL_AUTOPILOT_JSON_TO_REMOTE_TRUTH_CLOSEOUT_PROOF_V1.md"
$Manifest = Join-Path $RepoRoot ".overlay\manifest.json"
$Proof = Join-Path $RepoRoot ".sera-proof\phase197_full_autopilot_json_to_remote_truth_closeout_proof_v1_overlay_proof.json"
$Command = Join-Path $RepoRoot "commands\phase197-full-autopilot-json-to-remote-truth-closeout-proof-v1.command.json"
$Watcher = Join-Path $RepoRoot "SERA_WATCH_COMMAND_INBOX.ps1"
Require-Parse $Gate "Phase197 remote truth full autopilot gate"
Require-Parse $Fixtures "Phase197 fixture proof runner"
Require-Parse $Qa "Phase197 QA"
Require-Parse $Alias "Phase197 QA alias"
Require-Text $Gate "PHASE197_FULL_AUTOPILOT_REMOTE_TRUTH_CLOSEOUT_PROOF" "Phase197 gate"
Require-Text $Gate "PHASE197_NO_MANUAL_RESCUE_CLOSED_CLEANLY" "Phase197 gate"
Require-Text $Gate "Manual rescue was used" "Phase197 gate"
Require-Text $Gate "Remote main is not at verified local HEAD" "Phase197 gate"
Require-Text $Gate "Exact ZIP SHA256 missing or malformed" "Phase197 gate"
Require-Text $Fixtures "PHASE197_FULL_AUTOPILOT_FIXTURE_PROOF_PASS" "Phase197 fixture proof runner"
Require-Text $Doc "Phase196 trusted baseline" "Phase197 documentation"
Require-Text $Doc $Phase196Baseline "Phase197 documentation"
Require-Text $Manifest '"phaseSlug": "phase197_full_autopilot_json_to_remote_truth_closeout_proof_v1"' "overlay manifest"
Require-Text $Manifest '"expectedZipFilename": "s.e.r.a_phase197_full_autopilot_json_to_remote_truth_closeout_proof_v1_overlay.zip"' "overlay manifest"
Require-Text $Manifest $Phase196Baseline "overlay manifest"
Require-Text $Proof '"phaseSlug": "phase197_full_autopilot_json_to_remote_truth_closeout_proof_v1"' "overlay proof"
Require-Text $Proof $Phase196Baseline "overlay proof"
Require-Text $Command '"savedChatGptTargetOnly": true' "command contract"
Require-Text $Command '"allowNewChatFallback": false' "command contract"
Require-Text $Command '"allowRandomRecentChatFallback": false' "command contract"
if (Test-Path -LiteralPath $Watcher) {
  Require-Text $Watcher "PHASE196_ACTIVE_COMMAND_IDENTITY_GUARD" "watcher active command identity guard baseline"
  Require-Text $Watcher "PHASE196_ACTIVE_COMMAND_IDENTITY_CHANGED_SKIP" "watcher active command identity guard baseline"
  Require-Text $Watcher "SKIPPED_STALE" "watcher active command identity guard baseline"
}
if (Test-Path -LiteralPath (Join-Path $RepoRoot ".git")) {
  $OriginMain = (& git rev-parse origin/main).Trim()
  if ($OriginMain -ne $Phase196Baseline) { Fail-Verify "Phase196 trusted baseline mismatch for origin/main. expected=$Phase196Baseline actual=$OriginMain" }
  $LocalPhase196Tag = (& git rev-list -n 1 $Phase196Tag).Trim()
  if ($LocalPhase196Tag -ne $Phase196Baseline) { Fail-Verify "Phase196 trusted baseline local tag mismatch. expected=$Phase196Baseline actual=$LocalPhase196Tag" }
  & git merge-base --is-ancestor $Phase196Baseline HEAD
  if ($LASTEXITCODE -ne 0) { Fail-Verify "Current HEAD does not descend from Phase196 trusted baseline $Phase196Baseline" }
}
$FixtureOut = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Fixtures -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot | Out-String
if ($FixtureOut -notlike "*PHASE197_FULL_AUTOPILOT_FIXTURE_PROOF_PASS*") { Fail-Verify "Fixture proof did not pass: $FixtureOut" }
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Path = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"
@"
Status: VERIFY_PASS
Phase: $PhaseName
PhaseSlug: $PhaseSlug
Branch: $(git branch --show-current)
Timestamp: $Stamp
Result: Phase197 verifier passed. Full autopilot proof contract, Phase196 trusted baseline, exact ZIP filename contract, manifest, overlay proof, active command identity baseline, fixture runner, gate, QA, and alias are present and parse-safe.
Proof:
- Phase196 trusted baseline is $Phase196Baseline.
- Verifier blocks before QA/merge/tag/push/CLOSED_CLEANLY on failure.
- Gate requires fresh command JSON, saved ChatGPT target, prompt submission, exact ZIP download, exact ZIP SHA, verifier, QA, merge, push main, push tag, remote main, remote tag, final handoff identity, and no manual rescue before CLOSED_CLEANLY.
- Fixture proof passed using test data.
- Active command identity guard baseline was checked when watcher file existed.
"@ | Set-Content -LiteralPath $Path -Encoding UTF8
Write-Host "VERIFY_PASS phase=197 handoff=$Path"

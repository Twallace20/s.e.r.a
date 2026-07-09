[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)
$ErrorActionPreference = "Stop"
$Phase = "196"
$PhaseSlug = "phase196_closeout_integrity_remote_truth_gate_v1"
$PhaseName = "s.e.r.a_${PhaseSlug}_overlay"
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
  Write-Host "VERIFY_BLOCKED phase=196 handoff=$Path reason=$Reason"
  throw $Reason
}
function Require-File([string]$Path, [string]$Label) { if (!(Test-Path -LiteralPath $Path)) { Fail-Verify "Missing required ${Label}: $Path" } }
function Require-Text([string]$Path, [string]$Text, [string]$Label) { Require-File $Path $Label; $Raw = Get-Content -LiteralPath $Path -Raw; if ($Raw -notlike "*$Text*") { Fail-Verify "Missing marker '$Text' in ${Label}: $Path" } }
function Require-Parse([string]$Path, [string]$Label) { Require-File $Path $Label; try { [scriptblock]::Create((Get-Content -LiteralPath $Path -Raw)) | Out-Null } catch { Fail-Verify "PowerShell parse failure in ${Label}: $($_.Exception.Message)" } }
$Gate = Join-Path $RepoRoot "scripts\sera-closeout-integrity-remote-truth-gate-v1.ps1"
$Fixtures = Join-Path $RepoRoot "scripts\phase196-closeout-integrity-remote-truth-gate-fixtures-v1.ps1"
$Qa = Join-Path $RepoRoot "scripts\qa-phase196-closeout-integrity-remote-truth-gate-v1.ps1"
$Alias = Join-Path $RepoRoot "scripts\phase196-closeout-integrity-remote-truth-gate-v1.ps1"
$Doc = Join-Path $RepoRoot "docs\phases\PHASE_196_CLOSEOUT_INTEGRITY_REMOTE_TRUTH_GATE_V1.md"
$Manifest = Join-Path $RepoRoot ".overlay\manifest.json"
$Proof = Join-Path $RepoRoot ".sera-proof\phase196_closeout_integrity_remote_truth_gate_v1_overlay_proof.json"
$Command = Join-Path $RepoRoot "commands\phase196-closeout-integrity-remote-truth-gate-v1.command.json"
$Watcher = Join-Path $RepoRoot "SERA_WATCH_COMMAND_INBOX.ps1"
Require-Parse $Gate "remote truth gate"
Require-Parse $Fixtures "fixture proof runner"
Require-Parse $Qa "Phase196 QA"
Require-Parse $Alias "Phase196 QA alias"
Require-Text $Gate "PHASE196_NO_FALSE_CLOSED_CLEANLY" "remote truth gate"
Require-Text $Gate "Remote main is not at verified local HEAD" "remote truth gate"
Require-Text $Gate "QA ran or was marked pass after verifier failure" "remote truth gate"
Require-Text $Fixtures "PHASE196_FIXTURE_PROOF_PASS" "fixture proof runner"
Require-Text $Doc "Active command identity baseline" "Phase196 documentation"
Require-Text $Manifest '"phaseSlug": "phase196_closeout_integrity_remote_truth_gate_v1"' "overlay manifest"
Require-Text $Proof '"phaseSlug": "phase196_closeout_integrity_remote_truth_gate_v1"' "overlay proof"
Require-Text $Command '"savedChatGptTargetOnly": true' "command contract"
if (Test-Path -LiteralPath $Watcher) {
  Require-Text $Watcher "PHASE196_ACTIVE_COMMAND_IDENTITY_GUARD" "watcher active command guard baseline"
  Require-Text $Watcher "PHASE196_ACTIVE_COMMAND_IDENTITY_CHANGED_SKIP" "watcher active command guard baseline"
  Require-Text $Watcher "SKIPPED_STALE" "watcher active command guard baseline"
}
$FixtureOut = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Fixtures -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot | Out-String
if ($FixtureOut -notlike "*PHASE196_FIXTURE_PROOF_PASS*") { Fail-Verify "Fixture proof did not pass: $FixtureOut" }
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Path = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"
@"
Status: VERIFY_PASS
Phase: $PhaseName
PhaseSlug: $PhaseSlug
Branch: $(git branch --show-current)
Timestamp: $Stamp
Result: Phase196 verifier passed. Closeout integrity gate, remote truth gate, active command identity baseline check, command contract, manifest, proof, fixtures, documentation, and QA alias are present and parse-safe.
Proof:
- Verifier blocks before QA/merge/tag/push/CLOSED_CLEANLY on failure.
- Gate requires verifier, QA, merge, push main, push tag, remote main, remote tag, final handoff identity, and exact ZIP SHA.
- Fixture proof passed using test data.
- Active command identity guard baseline was checked when watcher file existed.
"@ | Set-Content -LiteralPath $Path -Encoding UTF8
Write-Host "VERIFY_PASS phase=196 handoff=$Path"

[CmdletBinding()]
param([string]$RepoRoot = (Get-Location).Path,[string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps")
$ErrorActionPreference = "Stop"
$Phase="198"; $PhaseSlug="phase198_second_consecutive_full_autopilot_production_stability_proof_v1"; $PhaseName="s.e.r.a_${PhaseSlug}_overlay"; $ExpectedZipFilename="s.e.r.a_phase198_second_consecutive_full_autopilot_production_stability_proof_v1_overlay.zip"; $TrustedBaseline="8fb5e0d160f953a518ac1d3757d9fec66a35afc2"; $TrustedTag="phase-197-full-autopilot-json-to-remote-truth-closeout-proof-v1"
$Handoff=Join-Path $AutoOpsRoot "06_handoff"; New-Item -ItemType Directory -Force -Path $Handoff | Out-Null; Set-Location $RepoRoot
function Fail-Verify([string]$Reason){$Stamp=Get-Date -Format "yyyyMMdd_HHmmss";$Path=Join-Path $Handoff "$PhaseName-$Stamp-BLOCKED.md";@"
Status: BLOCKED
Phase: $PhaseName
PhaseSlug: $PhaseSlug
Timestamp: $Stamp
Reason: $Reason

Gate result:
Verifier failed. QA, merge, tag, push, cleanup, pasteback, and CLOSED_CLEANLY must not run after this failure.
"@|Set-Content -LiteralPath $Path -Encoding UTF8;Write-Host "VERIFY_BLOCKED phase=198 handoff=$Path reason=$Reason";throw $Reason}
function Require-File([string]$Path,[string]$Label){if(!(Test-Path -LiteralPath $Path)){Fail-Verify "Missing required ${Label}: $Path"}}
function Require-Text([string]$Path,[string]$Text,[string]$Label){Require-File $Path $Label;$Raw=Get-Content -LiteralPath $Path -Raw;if($Raw -notlike "*$Text*"){Fail-Verify "Missing marker '$Text' in ${Label}: $Path"}}
function Require-Parse([string]$Path,[string]$Label){Require-File $Path $Label;try{[scriptblock]::Create((Get-Content -LiteralPath $Path -Raw))|Out-Null}catch{Fail-Verify "PowerShell parse failure in ${Label}: $($_.Exception.Message)"}}
$Gate=Join-Path $RepoRoot "scripts\sera-second-consecutive-full-autopilot-production-stability-proof-v1.ps1"
$Fixtures=Join-Path $RepoRoot "scripts\phase198-second-consecutive-full-autopilot-production-stability-proof-fixtures-v1.ps1"
$Qa=Join-Path $RepoRoot "scripts\qa-phase198-second-consecutive-full-autopilot-production-stability-proof-v1.ps1"
$Alias=Join-Path $RepoRoot "scripts\phase198-second-consecutive-full-autopilot-production-stability-proof-v1.ps1"
$Cleanup=Join-Path $RepoRoot "scripts\sera-phase198-current-phase-pointer-cleanup-proof-v1.ps1"
$Doc=Join-Path $RepoRoot "docs\phases\PHASE_198_SECOND_CONSECUTIVE_FULL_AUTOPILOT_PRODUCTION_STABILITY_PROOF_V1.md"
$Manifest=Join-Path $RepoRoot ".overlay\manifest.json";$Proof=Join-Path $RepoRoot ".sera-proof\phase198_second_consecutive_full_autopilot_production_stability_proof_v1_overlay_proof.json";$Command=Join-Path $RepoRoot "commands\phase198-second-consecutive-full-autopilot-production-stability-proof-v1.command.json";$Watcher=Join-Path $RepoRoot "SERA_WATCH_COMMAND_INBOX.ps1"
foreach($Pair in @(@($Gate,'Phase198 gate'),@($Fixtures,'fixture proof runner'),@($Qa,'Phase198 QA'),@($Alias,'Phase198 QA alias'),@($Cleanup,'pointer cleanup proof'))){Require-Parse $Pair[0] $Pair[1]}
Require-Text $Gate "PHASE198_SECOND_CONSECUTIVE_FULL_AUTOPILOT_PROOF" "Phase198 gate";Require-Text $Gate "PHASE198_NO_MANUAL_RESCUE_CLOSED_CLEANLY" "Phase198 gate";Require-Text $Gate "PHASE198_POINTER_DIFF_CLEANUP_VERIFIED" "Phase198 gate";Require-Text $Gate "Manual rescue was used" "Phase198 gate";Require-Text $Fixtures "PHASE198_SECOND_FULL_AUTOPILOT_FIXTURE_PROOF_PASS" "fixtures";Require-Text $Cleanup "PHASE198_POINTER_DIFF_CLEANUP_VERIFIED" "pointer cleanup proof"
Require-Text $Doc "Phase197 trusted baseline" "Phase198 documentation";Require-Text $Doc $TrustedBaseline "Phase198 documentation";Require-Text $Manifest '"phaseSlug": "phase198_second_consecutive_full_autopilot_production_stability_proof_v1"' "overlay manifest";Require-Text $Manifest '"expectedZipFilename": "s.e.r.a_phase198_second_consecutive_full_autopilot_production_stability_proof_v1_overlay.zip"' "overlay manifest";Require-Text $Manifest $TrustedBaseline "overlay manifest";Require-Text $Proof '"phaseSlug": "phase198_second_consecutive_full_autopilot_production_stability_proof_v1"' "overlay proof";Require-Text $Proof $TrustedBaseline "overlay proof";Require-Text $Command '"savedChatGptTargetOnly": true' "command contract";Require-Text $Command '"allowNewChatFallback": false' "command contract";Require-Text $Command '"allowRandomRecentChatFallback": false' "command contract"
if(Test-Path -LiteralPath $Watcher){Require-Text $Watcher "PHASE196_ACTIVE_COMMAND_IDENTITY_GUARD" "watcher guard baseline";Require-Text $Watcher "PHASE196_ACTIVE_COMMAND_IDENTITY_CHANGED_SKIP" "watcher guard baseline";Require-Text $Watcher "SKIPPED_STALE" "watcher guard baseline"}
if(Test-Path -LiteralPath (Join-Path $RepoRoot ".git")){$OriginMain=(& git rev-parse origin/main).Trim();if($OriginMain -ne $TrustedBaseline){Fail-Verify "Phase197 trusted baseline mismatch for origin/main. expected=$TrustedBaseline actual=$OriginMain"};$LocalTag=(& git rev-list -n 1 $TrustedTag).Trim();if($LocalTag -ne $TrustedBaseline){Fail-Verify "Phase197 trusted baseline local tag mismatch. expected=$TrustedBaseline actual=$LocalTag"};& git merge-base --is-ancestor $TrustedBaseline HEAD;if($LASTEXITCODE -ne 0){Fail-Verify "Current HEAD does not descend from Phase197 trusted baseline $TrustedBaseline"}}
$FixtureOut=& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Fixtures -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot|Out-String;if($FixtureOut -notlike "*PHASE198_SECOND_FULL_AUTOPILOT_FIXTURE_PROOF_PASS*"){Fail-Verify "Fixture proof did not pass: $FixtureOut"}
$CleanupOut=& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Cleanup -RepoRoot $RepoRoot|Out-String;if($CleanupOut -notlike "*PHASE198_POINTER_DIFF_CLEANUP_VERIFIED*"){Fail-Verify "Pointer cleanup proof did not emit marker: $CleanupOut"}
$Stamp=Get-Date -Format "yyyyMMdd_HHmmss";$Path=Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md";@"
Status: VERIFY_PASS
Phase: $PhaseName
PhaseSlug: $PhaseSlug
Branch: $(git branch --show-current)
Timestamp: $Stamp
Result: Phase198 verifier passed. Second consecutive full-autopilot proof contract, Phase197 trusted baseline, exact ZIP filename contract, manifest, overlay proof, active command identity baseline, fixture runner, cleanup proof, gate, QA, and alias are present and parse-safe.
Proof:
- Phase197 trusted baseline is $TrustedBaseline.
- Gate requires no manual rescue and pointer diff cleanup before CLOSED_CLEANLY.
- Fixture proof passed using test data.
- Pointer cleanup proof script is present and executable.
"@|Set-Content -LiteralPath $Path -Encoding UTF8;Write-Host "VERIFY_PASS phase=198 handoff=$Path"

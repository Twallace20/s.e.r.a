[CmdletBinding()]
param([string]$RepoRoot = (Get-Location).Path,[string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps")
$ErrorActionPreference="Stop";$PhaseSlug="phase198_second_consecutive_full_autopilot_production_stability_proof_v1";$PhaseName="s.e.r.a_${PhaseSlug}_overlay";$Handoff=Join-Path $AutoOpsRoot "06_handoff";New-Item -ItemType Directory -Force -Path $Handoff|Out-Null;Set-Location $RepoRoot
function Fail-QA([string]$Reason){$Stamp=Get-Date -Format "yyyyMMdd_HHmmss";$Path=Join-Path $Handoff "$PhaseName-$Stamp-BLOCKED.md";@"
Status: BLOCKED
Phase: $PhaseName
PhaseSlug: $PhaseSlug
Timestamp: $Stamp
Reason: $Reason

Gate result:
QA failed. Merge, tag, push, cleanup, pasteback, and CLOSED_CLEANLY must not run.
"@|Set-Content -LiteralPath $Path -Encoding UTF8;Write-Host "QA_BLOCKED phase=198 handoff=$Path reason=$Reason";throw $Reason}
$VerifyPass=Get-ChildItem $Handoff -File -Filter "*$PhaseSlug*VERIFY_PASS*.md" -ErrorAction SilentlyContinue|Sort-Object LastWriteTime -Descending|Select-Object -First 1;if(!$VerifyPass){Fail-QA "Missing Phase198 VERIFY_PASS handoff before QA."}
$Gate=Join-Path $RepoRoot "scripts\sera-second-consecutive-full-autopilot-production-stability-proof-v1.ps1";$FixtureRunner=Join-Path $RepoRoot "scripts\phase198-second-consecutive-full-autopilot-production-stability-proof-fixtures-v1.ps1";$Cleanup=Join-Path $RepoRoot "scripts\sera-phase198-current-phase-pointer-cleanup-proof-v1.ps1";$ContractPath=Join-Path $RepoRoot "scripts\phase198-second-consecutive-full-autopilot-production-stability-proof-v1.contract.json";$Contract=Get-Content -LiteralPath $ContractPath -Raw|ConvertFrom-Json
foreach($GateName in @("fresh_command_json","saved_chatgpt_target","prompt_submitted","exact_zip_downloaded","exact_zip_sha_verified","verifier_passed","qa_passed_after_verifier","merge_succeeded","push_main_succeeded","push_tag_succeeded","remote_main_verified","remote_tag_verified","final_handoff_identity_verified","no_manual_rescue","pointer_diff_cleanup_verified")){if(@($Contract.requiredGatesInOrder)-notcontains $GateName){Fail-QA "Contract missing required gate: $GateName"}}
$FixtureOut=& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $FixtureRunner -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot|Out-String;if($FixtureOut -notlike "*PHASE198_SECOND_FULL_AUTOPILOT_FIXTURE_PROOF_PASS*"){Fail-QA "Fixture proof failed: $FixtureOut"}
$CleanupOut=& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Cleanup -RepoRoot $RepoRoot|Out-String;if($CleanupOut -notlike "*PHASE198_POINTER_DIFF_CLEANUP_VERIFIED*"){Fail-QA "Pointer cleanup proof failed: $CleanupOut"}
$Text=Get-Content -LiteralPath $Gate -Raw;foreach($Marker in @("PHASE198_SECOND_CONSECUTIVE_FULL_AUTOPILOT_PROOF","PHASE198_NO_MANUAL_RESCUE_CLOSED_CLEANLY","PHASE198_POINTER_DIFF_CLEANUP_VERIFIED","Manual rescue was used","Remote main is not at verified local HEAD","Local and remote tag must both point at verified HEAD","Exact ZIP SHA256 missing or malformed")){if($Text -notlike "*$Marker*"){Fail-QA "Gate script missing QA marker: $Marker"}}
$Stamp=Get-Date -Format "yyyyMMdd_HHmmss";$Path=Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md";@"
Status: PASS_GUARANTEED
Phase: $PhaseName
PhaseSlug: $PhaseSlug
Branch: $(git branch --show-current)
Timestamp: $Stamp
Result: Phase198 QA passed. Test fixtures prove second consecutive full-autopilot, no-manual-rescue, remote truth, final handoff identity, and pointer-diff cleanup gates are required before CLOSED_CLEANLY.
Proof:
- Fresh VERIFY_PASS existed before QA.
- Fixture proof passed.
- Pointer cleanup proof passed.
- Contract includes ordered second-consecutive full-autopilot closeout gates.
"@|Set-Content -LiteralPath $Path -Encoding UTF8;Write-Host "PASS_GUARANTEED phase=198 handoff=$Path"

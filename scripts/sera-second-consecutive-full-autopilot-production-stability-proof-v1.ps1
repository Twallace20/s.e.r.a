[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$ContextJson,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [switch]$WriteHandoff
)
$ErrorActionPreference = "Stop"
$PhaseSlug = "phase198_second_consecutive_full_autopilot_production_stability_proof_v1"
$PhaseName = "s.e.r.a_${PhaseSlug}_overlay"
$ExpectedZipFilename = "s.e.r.a_phase198_second_consecutive_full_autopilot_production_stability_proof_v1_overlay.zip"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force -Path $Handoff | Out-Null
function Write-GateHandoff {
  param([string]$Status, [string]$Reason, [object]$Context)
  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Path = Join-Path $Handoff "$PhaseName-$Stamp-$Status.md"
@"
Status: $Status
Phase: $PhaseName
PhaseSlug: $PhaseSlug
Timestamp: $Stamp
Reason: $Reason

Remote truth:
- LocalHead: $($Context.localHead)
- RemoteMain: $($Context.remoteMain)
- LocalTagCommit: $($Context.localTagCommit)
- RemoteTagCommit: $($Context.remoteTagCommit)
- ZipSha256: $($Context.zipSha256)
- ManualRescueUsed: $($Context.manualRescueUsed)
- PointerDiffCleanupVerified: $($Context.pointerDiffCleanupVerified)

Markers:
PHASE198_SECOND_CONSECUTIVE_FULL_AUTOPILOT_PROOF
PHASE198_NO_MANUAL_RESCUE_CLOSED_CLEANLY
PHASE198_POINTER_DIFF_CLEANUP_VERIFIED
"@ | Set-Content -LiteralPath $Path -Encoding UTF8
  return $Path
}
function Result {
  param([string]$Status, [string]$Reason, [object]$Context)
  $Path = ""
  if ($WriteHandoff) { $Path = Write-GateHandoff -Status $Status -Reason $Reason -Context $Context }
  $Payload = [ordered]@{ status = $Status; reason = $Reason; handoffPath = $Path }
  Write-Output ($Payload | ConvertTo-Json -Compress)
}
function Is-ShaLike([string]$Value) { return ($Value -match '^[a-fA-F0-9]{40,64}$') }
function Has-Text([string]$Text, [string]$Needle) { if ($null -eq $Text) { return $false }; return $Text.Contains($Needle) }
if (Test-Path -LiteralPath $ContextJson) { $Context = Get-Content -LiteralPath $ContextJson -Raw | ConvertFrom-Json } else { $Context = $ContextJson | ConvertFrom-Json }
if ([string]$Context.phaseSlug -ne $PhaseSlug) { Result "BLOCKED" "Wrong phaseSlug for Phase198 gate. expected=$PhaseSlug actual=$($Context.phaseSlug)" $Context; exit 0 }
if ([string]$Context.expectedZipFilename -ne $ExpectedZipFilename) { Result "BLOCKED" "Wrong expected ZIP filename for Phase198. expected=$ExpectedZipFilename actual=$($Context.expectedZipFilename)" $Context; exit 0 }
if ($Context.manualRescueUsed -eq $true) { Result "BLOCKED" "Manual rescue was used. Phase198 cannot prove repeatable full autopilot if manual rescue was required." $Context; exit 0 }
foreach ($Step in @('freshCommandJsonAccepted','savedChatGptTargetUsed','promptSubmitted','exactZipDownloaded','exactZipShaVerified')) {
  if ($Context.$Step -ne $true) { Result "BLOCKED" "Full autopilot pre-closeout step missing or false: $Step" $Context; exit 0 }
}
if ($Context.verifierPassed -ne $true) {
  if ($Context.qaPassed -eq $true) { Result "BLOCKED" "QA ran or was marked pass after verifier failure. Hard-stop required." $Context } else { Result "BLOCKED" "Verifier did not pass. QA/merge/tag/push/CLOSED_CLEANLY must not run." $Context }
  exit 0
}
if ($Context.qaPassed -ne $true) { Result "BLOCKED" "QA did not pass after verifier. Merge/tag/push/CLOSED_CLEANLY must not run." $Context; exit 0 }
foreach ($Step in @('mergeSucceeded','pushMainSucceeded','pushTagSucceeded')) {
  if ($Context.$Step -ne $true) { Result "BLOCKED" "Required closeout step failed or did not run: $Step" $Context; exit 0 }
}
$LocalHead=[string]$Context.localHead; $RemoteMain=[string]$Context.remoteMain; $LocalTagCommit=[string]$Context.localTagCommit; $RemoteTagCommit=[string]$Context.remoteTagCommit; $ZipSha=[string]$Context.zipSha256
if (!(Is-ShaLike $LocalHead) -or !(Is-ShaLike $RemoteMain)) { Result "BLOCKED" "LocalHead/RemoteMain missing or malformed." $Context; exit 0 }
if ($LocalHead -ne $RemoteMain) { Result "BLOCKED" "Remote main is not at verified local HEAD. local=$LocalHead remote=$RemoteMain" $Context; exit 0 }
if (!(Is-ShaLike $LocalTagCommit) -or !(Is-ShaLike $RemoteTagCommit)) { Result "BLOCKED" "Local/remote tag commit missing or malformed." $Context; exit 0 }
if ($LocalTagCommit -ne $LocalHead -or $RemoteTagCommit -ne $LocalHead) { Result "BLOCKED" "Local and remote tag must both point at verified HEAD." $Context; exit 0 }
if (!(Is-ShaLike $ZipSha)) { Result "BLOCKED" "Exact ZIP SHA256 missing or malformed." $Context; exit 0 }
if ($Context.pointerDiffCleanupVerified -ne $true) { Result "BLOCKED" "Production cleanup proof failed: current phase pointer files may leave repo dirty after closeout." $Context; exit 0 }
$Text = [string]$Context.finalHandoffText
$RequiredText = @("Status: CLOSED_CLEANLY","Phase: $PhaseName","PhaseSlug: $PhaseSlug","ExpectedZipFilename: $ExpectedZipFilename","LocalHead: $LocalHead","RemoteMain: $RemoteMain","LocalTagCommit: $LocalTagCommit","RemoteTagCommit: $RemoteTagCommit","ZipSha256: $ZipSha","VerifierHandoff:","QaHandoff:","ManualRescueUsed: false","FreshCommandJson:","SavedChatGptTargetOnly: true","PointerDiffCleanupVerified: true")
foreach ($Needle in $RequiredText) { if (!(Has-Text $Text $Needle)) { Result "BLOCKED" "Final handoff identity missing required text: $Needle" $Context; exit 0 } }
Result "CLOSED_CLEANLY" "All Phase198 second consecutive full autopilot, cleanup, and remote truth gates passed." $Context
exit 0

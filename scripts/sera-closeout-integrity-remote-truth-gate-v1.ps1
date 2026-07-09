[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$ContextJson,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [switch]$WriteHandoff
)

$ErrorActionPreference = "Stop"
$PhaseSlug = "phase196_closeout_integrity_remote_truth_gate_v1"
$PhaseName = "s.e.r.a_${PhaseSlug}_overlay"
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

Markers:
PHASE196_CLOSEOUT_INTEGRITY_REMOTE_TRUTH_GATE
PHASE196_NO_FALSE_CLOSED_CLEANLY
"@ | Set-Content -LiteralPath $Path -Encoding UTF8
  return $Path
}

function Result {
  param([string]$Status, [string]$Reason, [object]$Context)
  $Path = ""
  if ($WriteHandoff) {
    $Path = Write-GateHandoff -Status $Status -Reason $Reason -Context $Context
  }

  $Payload = [ordered]@{
    status = $Status
    reason = $Reason
    handoffPath = $Path
  }

  Write-Output ($Payload | ConvertTo-Json -Compress)
}

function Is-Blank([string]$Value) { return [string]::IsNullOrWhiteSpace($Value) }
function Is-ShaLike([string]$Value) { return ($Value -match '^[a-fA-F0-9]{40,64}$') }
function Has-Text([string]$Text, [string]$Needle) {
  if ($null -eq $Text) { return $false }
  return $Text.Contains($Needle)
}

if (Test-Path -LiteralPath $ContextJson) {
  $Context = Get-Content -LiteralPath $ContextJson -Raw | ConvertFrom-Json
} else {
  $Context = $ContextJson | ConvertFrom-Json
}

$ExpectedPhaseSlug = [string]$Context.phaseSlug
if ($ExpectedPhaseSlug -ne $PhaseSlug) {
  Result "BLOCKED" "Wrong phaseSlug for Phase196 gate. expected=$PhaseSlug actual=$ExpectedPhaseSlug" $Context
  exit 0
}

if ($Context.verifierPassed -ne $true) {
  if ($Context.qaPassed -eq $true) {
    Result "BLOCKED" "QA ran or was marked pass after verifier failure. Hard-stop required." $Context
  } else {
    Result "BLOCKED" "Verifier did not pass. QA/merge/tag/push/CLOSED_CLEANLY must not run." $Context
  }
  exit 0
}

if ($Context.qaPassed -ne $true) {
  Result "BLOCKED" "QA did not pass after verifier. Merge/tag/push/CLOSED_CLEANLY must not run." $Context
  exit 0
}

foreach ($Step in @('mergeSucceeded','pushMainSucceeded','pushTagSucceeded')) {
  if ($Context.$Step -ne $true) {
    Result "BLOCKED" "Required step failed or did not run: $Step" $Context
    exit 0
  }
}

$LocalHead = [string]$Context.localHead
$RemoteMain = [string]$Context.remoteMain
$LocalTagCommit = [string]$Context.localTagCommit
$RemoteTagCommit = [string]$Context.remoteTagCommit
$ZipSha = [string]$Context.zipSha256

if (!(Is-ShaLike $LocalHead) -or !(Is-ShaLike $RemoteMain)) {
  Result "BLOCKED" "LocalHead/RemoteMain missing or malformed." $Context
  exit 0
}
if ($LocalHead -ne $RemoteMain) {
  Result "BLOCKED" "Remote main is not at verified local HEAD. local=$LocalHead remote=$RemoteMain" $Context
  exit 0
}
if (!(Is-ShaLike $LocalTagCommit) -or !(Is-ShaLike $RemoteTagCommit)) {
  Result "BLOCKED" "Local/remote tag commit missing or malformed." $Context
  exit 0
}
if ($LocalTagCommit -ne $LocalHead -or $RemoteTagCommit -ne $LocalHead) {
  Result "BLOCKED" "Local and remote tag must both point at verified HEAD." $Context
  exit 0
}
if (!(Is-ShaLike $ZipSha)) {
  Result "BLOCKED" "Exact ZIP SHA256 missing or malformed." $Context
  exit 0
}

$Text = [string]$Context.finalHandoffText
$RequiredText = @(
  "Status: CLOSED_CLEANLY",
  "Phase: $PhaseName",
  "PhaseSlug: $PhaseSlug",
  "LocalHead: $LocalHead",
  "RemoteMain: $RemoteMain",
  "LocalTagCommit: $LocalTagCommit",
  "RemoteTagCommit: $RemoteTagCommit",
  "ZipSha256: $ZipSha",
  "VerifierHandoff:",
  "QaHandoff:"
)
foreach ($Needle in $RequiredText) {
  if (!(Has-Text $Text $Needle)) {
    Result "BLOCKED" "Final handoff identity missing required text: $Needle" $Context
    exit 0
  }
}

Result "CLOSED_CLEANLY" "All Phase196 closeout integrity and remote truth gates passed." $Context
exit 0



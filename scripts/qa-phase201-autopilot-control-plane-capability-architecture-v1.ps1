[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$ContractPath = ""
)
$ErrorActionPreference = "Stop"
Import-Module (Join-Path $RepoRoot "scripts\lib\SeraPhaseGate.psm1") -Force
$Contract = Read-SeraPhaseContract -RepoRoot $RepoRoot -ContractPath $ContractPath
function Assert-GatePass { param([object]$Gate) if (!$Gate.Ok) { throw "$($Gate.Name) blocked: $($Gate.Reason)" } }
try {
  $Verify = Get-SeraLatestHandoff -AutoOpsRoot $AutoOpsRoot -Pattern "*phase201*VERIFY_PASS.md"
  if (!$Verify) { throw "No Phase201 VERIFY_PASS handoff found before QA PASS." }
  $VerifyText = Get-Content -LiteralPath $Verify.FullName -Raw
  if ($VerifyText -notlike "*SharedContract*") { throw "Phase201 VERIFY_PASS handoff does not prove shared contract use." }
  $CaptureFixture = Join-Path $RepoRoot "tests\fixtures\phase201-autopilot-control-plane\phase201-child-process-capture-fixture.ps1"
  $Capture = Invoke-SeraChildProcess -FilePath "powershell.exe" -ArgumentList @("-NoProfile","-ExecutionPolicy","Bypass","-File",$CaptureFixture,"-RepoRoot",$RepoRoot) -WorkingDirectory $RepoRoot
  if ($Capture.ExitCode -ne 0) { throw "QA child process capture fixture failed.`n$($Capture.Stdout)`n$($Capture.Stderr)" }
  Assert-GatePass (Test-SeraRepoClean -RepoRoot $RepoRoot)
  $ZipGate = Test-SeraZip -Contract $Contract -AutoOpsRoot $AutoOpsRoot
  Assert-GatePass $ZipGate
  Assert-GatePass (Test-SeraBaseline -Contract $Contract -RepoRoot $RepoRoot)
  Assert-GatePass (Test-SeraBrowserMarkers -Contract $Contract -RepoRoot $RepoRoot)
  Assert-GatePass (Test-SeraPointerCleanup -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot)
  Assert-GatePass (Test-SeraRepeatability -Contract $Contract -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot)
  Assert-GatePass (Test-SeraRepoClean -RepoRoot $RepoRoot)
  $Evidence = @{ zipPath = $ZipGate.Evidence.zipPath; zipSha256 = $ZipGate.Evidence.zipSha256; verifierHandoffPath = $Verify.FullName }
  $Proof = @"
PASS_GUARANTEED phase=201
VerifierHandoff=$($Verify.FullName)
SharedContract=$($Contract.__ContractPath)
SharedModule=scripts/lib/SeraPhaseGate.psm1
ChildProcessCaptureFixture=PASS
BlockedHandoffStandard=PASS
PassHandoffEvidenceStandard=PASS
NoBooleanSoupContract=PASS
RepoStatus=clean
Phase201Purpose=Autopilot Control Plane and Capability Architecture pivot
CloseoutRule=Only close Phase201 if verifier and QA pass through the shared contract system with no mid-run script repair.
"@
  $Out = Write-SeraHandoff -Contract $Contract -Status "PASS_GUARANTEED" -Reason "All Phase201 QA gates passed through shared contract system." -Proof $Proof -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot -Evidence $Evidence
  Write-Host "PASS_GUARANTEED phase=201 zip=$($Evidence.zipPath) sha256=$($Evidence.zipSha256) handoff=$($Out.Path)"
  exit 0
} catch {
  $Out = Write-SeraHandoff -Contract $Contract -Status "BLOCKED" -Reason $_.Exception.Message -Proof "QA_BLOCKED phase=201" -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot -ErrorRecord $_
  Write-Host "BLOCKED phase=201 reason=$($_.Exception.Message) handoff=$($Out.Path)"
  exit 1
}

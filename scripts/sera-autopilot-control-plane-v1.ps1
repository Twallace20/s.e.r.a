[CmdletBinding()]
param(
  [ValidateSet("Verify","QA","CloseoutReady")][string]$Mode = "Verify",
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$ContractPath = ""
)
$ErrorActionPreference = "Stop"
Import-Module (Join-Path $RepoRoot "scripts\lib\SeraPhaseGate.psm1") -Force
$Contract = Read-SeraPhaseContract -RepoRoot $RepoRoot -ContractPath $ContractPath

function Assert-GatePass {
  param([object]$Gate)
  if (!$Gate.Ok) { throw "$($Gate.Name) blocked: $($Gate.Reason)" }
}

try {
  $RepoClean = Test-SeraRepoClean -RepoRoot $RepoRoot
  Assert-GatePass $RepoClean
  $Zip = Test-SeraZip -Contract $Contract -AutoOpsRoot $AutoOpsRoot
  Assert-GatePass $Zip
  $Baseline = Test-SeraBaseline -Contract $Contract -RepoRoot $RepoRoot
  Assert-GatePass $Baseline
  $Bridge = Test-SeraBrowserMarkers -Contract $Contract -RepoRoot $RepoRoot
  Assert-GatePass $Bridge
  $Pointer = Test-SeraPointerCleanup -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
  Assert-GatePass $Pointer
  $Repeatability = Test-SeraRepeatability -Contract $Contract -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
  Assert-GatePass $Repeatability

  if ($Mode -eq "QA") {
    $Verify = Get-SeraLatestHandoff -AutoOpsRoot $AutoOpsRoot -Pattern "*phase201*VERIFY_PASS.md"
    if (!$Verify) { throw "QA requires a Phase201 VERIFY_PASS handoff first." }
    $Evidence = @{ zipPath = $Zip.Evidence.zipPath; zipSha256 = $Zip.Evidence.zipSha256; verifierHandoffPath = $Verify.FullName }
    $Out = Write-SeraHandoff -Contract $Contract -Status "PASS_GUARANTEED" -Reason "Phase201 QA gates passed through Autopilot Control Plane v1." -Proof "PASS_GUARANTEED phase=201`nControlPlaneMode=QA`nSharedContract=$($Contract.__ContractPath)" -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot -Evidence $Evidence
    Write-Host "PASS_GUARANTEED phase=201 handoff=$($Out.Path)"
    exit 0
  }

  if ($Mode -eq "CloseoutReady") {
    $Verify = Get-SeraLatestHandoff -AutoOpsRoot $AutoOpsRoot -Pattern "*phase201*VERIFY_PASS.md"
    $QA = Get-SeraLatestHandoff -AutoOpsRoot $AutoOpsRoot -Pattern "*phase201*PASS_GUARANTEED.md"
    if (!$Verify -or !$QA) { throw "CloseoutReady requires Phase201 VERIFY_PASS and PASS_GUARANTEED handoffs." }
    $Evidence = @{ zipPath = $Zip.Evidence.zipPath; zipSha256 = $Zip.Evidence.zipSha256; verifierHandoffPath = $Verify.FullName; qaHandoffPath = $QA.FullName }
    $Out = Write-SeraHandoff -Contract $Contract -Status "CLOSEOUT_READY" -Reason "Phase201 control plane confirms verifier and QA passed; closeout may proceed through existing merge/tag remote-truth process." -Proof "CLOSEOUT_READY phase=201`nSharedContract=$($Contract.__ContractPath)" -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot -Evidence $Evidence
    Write-Host "CLOSEOUT_READY phase=201 handoff=$($Out.Path)"
    exit 0
  }

  $Evidence = @{ zipPath = $Zip.Evidence.zipPath; zipSha256 = $Zip.Evidence.zipSha256 }
  $Out = Write-SeraHandoff -Contract $Contract -Status "VERIFY_PASS" -Reason "Phase201 verifier gates passed through Autopilot Control Plane v1." -Proof "VERIFY_PASS phase=201`nControlPlaneMode=Verify`nSharedContract=$($Contract.__ContractPath)" -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot -Evidence $Evidence
  Write-Host "VERIFY_PASS phase=201 handoff=$($Out.Path)"
  exit 0
} catch {
  $Out = Write-SeraHandoff -Contract $Contract -Status "BLOCKED" -Reason $_.Exception.Message -Proof "CONTROL_PLANE_BLOCKED phase=201 mode=$Mode" -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot -ErrorRecord $_
  Write-Host "BLOCKED phase=201 reason=$($_.Exception.Message) handoff=$($Out.Path)"
  exit 1
}

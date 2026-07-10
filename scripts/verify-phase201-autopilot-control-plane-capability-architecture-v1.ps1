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
function Assert-FileExists { param([string]$Rel) $P = Join-Path $RepoRoot $Rel; if (!(Test-Path -LiteralPath $P)) { throw "Missing required deliverable: $Rel" } }
function Test-NoParameterSoup {
  param([string[]]$RelativePaths)
  $Suffixes = @($Contract.forbiddenParameterSuffixes)
  $Forbidden = @($Suffixes | ForEach-Object { '-' + $_ })
  $Hits = @()
  foreach ($Rel in $RelativePaths) {
    $P = Join-Path $RepoRoot $Rel
    if (!(Test-Path -LiteralPath $P)) { continue }
    $Text = Get-Content -LiteralPath $P -Raw
    foreach ($Needle in $Forbidden) {
      if ($Text -like "*$Needle*") { $Hits += "$Rel contains $Needle" }
    }
  }
  if ($Hits.Count -gt 0) { throw "Forbidden repeatability parameter soup found: $($Hits -join '; ')" }
}
function Test-Manifest {
  $ManifestPath = Join-Path $RepoRoot ".overlay\manifest.json"
  if (!(Test-Path -LiteralPath $ManifestPath)) { throw "Missing overlay manifest." }
  $Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
  foreach ($Entry in @($Manifest.files)) {
    $Rel = ([string]$Entry.path) -replace '^[Rr][Ee][Pp][Oo][\/]', ''
    $Abs = Join-Path $RepoRoot $Rel
    if (!(Test-Path -LiteralPath $Abs)) { throw "Manifest file missing: $($Entry.path)" }
    $Bytes = (Get-Item -LiteralPath $Abs).Length
    $Sha = (Get-FileHash -LiteralPath $Abs -Algorithm SHA256).Hash.ToLowerInvariant()
    if ([int64]$Entry.bytes -ne [int64]$Bytes) { throw "Manifest byte mismatch for $($Entry.path)" }
    if ([string]$Entry.sha256 -ne $Sha) { throw "Manifest SHA mismatch for $($Entry.path)" }
  }
}
try {
  foreach ($Rel in @($Contract.deliverables.requiredFiles)) { Assert-FileExists ([string]$Rel) }
  Test-Manifest
  $ModulePath = Join-Path $RepoRoot "scripts\lib\SeraPhaseGate.psm1"
  $ModuleText = Get-Content -LiteralPath $ModulePath -Raw
  foreach ($Fn in @($Contract.requiredFunctions)) {
    if ($ModuleText -notlike "*function $Fn*") { throw "Shared module missing function: $Fn" }
  }
  foreach ($ScriptRel in @(
    "scripts/verify-phase201-autopilot-control-plane-capability-architecture-v1.ps1",
    "scripts/qa-phase201-autopilot-control-plane-capability-architecture-v1.ps1",
    "scripts/sera-autopilot-control-plane-v1.ps1"
  )) {
    $Text = Get-Content -LiteralPath (Join-Path $RepoRoot $ScriptRel) -Raw
    if ($Text -notlike "*SeraPhaseGate.psm1*") { throw "$ScriptRel does not import/use SeraPhaseGate.psm1" }
  }
  Test-NoParameterSoup -RelativePaths @(
    "scripts/verify-phase201-autopilot-control-plane-capability-architecture-v1.ps1",
    "scripts/qa-phase201-autopilot-control-plane-capability-architecture-v1.ps1",
    "scripts/sera-autopilot-control-plane-v1.ps1"
  )
  $CaptureFixture = Join-Path $RepoRoot "tests\fixtures\phase201-autopilot-control-plane\phase201-child-process-capture-fixture.ps1"
  $Capture = Invoke-SeraChildProcess -FilePath "powershell.exe" -ArgumentList @("-NoProfile","-ExecutionPolicy","Bypass","-File",$CaptureFixture,"-RepoRoot",$RepoRoot) -WorkingDirectory $RepoRoot
  if ($Capture.ExitCode -ne 0) { throw "Child process capture fixture failed.`n$($Capture.Stdout)`n$($Capture.Stderr)" }
  Assert-GatePass (Test-SeraRepoClean -RepoRoot $RepoRoot)
  Assert-GatePass (Test-SeraZip -Contract $Contract -AutoOpsRoot $AutoOpsRoot)
  Assert-GatePass (Test-SeraBaseline -Contract $Contract -RepoRoot $RepoRoot)
  Assert-GatePass (Test-SeraBrowserMarkers -Contract $Contract -RepoRoot $RepoRoot)
  Assert-GatePass (Test-SeraPointerCleanup -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot)
  Assert-GatePass (Test-SeraRepeatability -Contract $Contract -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot)
  $ZipGate = Test-SeraZip -Contract $Contract -AutoOpsRoot $AutoOpsRoot
  $Evidence = @{ zipPath = $ZipGate.Evidence.zipPath; zipSha256 = $ZipGate.Evidence.zipSha256 }
  $Proof = @"
VERIFY_PASS phase=201
SharedContract=$($Contract.__ContractPath)
SharedModule=scripts/lib/SeraPhaseGate.psm1
ControlPlane=scripts/sera-autopilot-control-plane-v1.ps1
CapabilityArchitecture=docs/architecture/SERA_CAPABILITY_ARCHITECTURE_V1.md
ChildProcessCaptureFixture=PASS
BlockedHandoffDiagnosticStandard=PASS
PassHandoffEvidenceStandard=PASS
NoParameterSoupProof=PASS
ManifestValidation=PASS
RepoStatus=clean
Phase201Purpose=Autopilot Control Plane and Capability Architecture pivot
"@
  $Out = Write-SeraHandoff -Contract $Contract -Status "VERIFY_PASS" -Reason "All Phase201 verifier gates passed through shared contract system." -Proof $Proof -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot -Evidence $Evidence
  Write-Host "VERIFY_PASS phase=201 zip=$($Evidence.zipPath) sha256=$($Evidence.zipSha256) handoff=$($Out.Path)"
  exit 0
} catch {
  $Out = Write-SeraHandoff -Contract $Contract -Status "BLOCKED" -Reason $_.Exception.Message -Proof "VERIFY_BLOCKED phase=201" -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot -ErrorRecord $_
  Write-Host "BLOCKED phase=201 reason=$($_.Exception.Message) handoff=$($Out.Path)"
  exit 1
}

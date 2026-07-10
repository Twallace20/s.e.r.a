[CmdletBinding()]
param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path)
$ErrorActionPreference = "Stop"
Import-Module (Join-Path $RepoRoot "scripts\lib\SeraPhaseGate.psm1") -Force
$Success = Join-Path $PSScriptRoot "child-success-with-stderr.ps1"
$Failure = Join-Path $PSScriptRoot "child-failure-with-stderr.ps1"
$SuccessResult = Invoke-SeraChildProcess -FilePath "powershell.exe" -ArgumentList @("-NoProfile","-ExecutionPolicy","Bypass","-File",$Success) -WorkingDirectory $RepoRoot
if ($SuccessResult.ExitCode -ne 0) { throw "Expected success child exit 0." }
if ($SuccessResult.Stderr -notlike "*PHASE201_CHILD_STDERR_SUCCESS_SHOULD_NOT_BLOCK*") { throw "Success stderr was not captured." }
$FailureResult = Invoke-SeraChildProcess -FilePath "powershell.exe" -ArgumentList @("-NoProfile","-ExecutionPolicy","Bypass","-File",$Failure) -WorkingDirectory $RepoRoot
if ($FailureResult.ExitCode -eq 0) { throw "Expected failure child nonzero exit." }
if ($FailureResult.Stdout -notlike "*PHASE201_CHILD_STDOUT_FAILURE_CAPTURE*") { throw "Failure stdout was not captured." }
if ($FailureResult.Stderr -notlike "*PHASE201_CHILD_STDERR_FAILURE_CAPTURE*") { throw "Failure stderr was not captured." }
Write-Host "PHASE201_CHILD_PROCESS_CAPTURE_FIXTURE_PASS successExit=$($SuccessResult.ExitCode) failureExit=$($FailureResult.ExitCode)"
exit 0

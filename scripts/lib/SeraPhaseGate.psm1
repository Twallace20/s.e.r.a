# S.E.R.A. Phase Gate Shared Module v1
# Phase201: Autopilot Control Plane + Capability Architecture
Set-StrictMode -Version Latest

function New-SeraGateResult {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][bool]$Ok,
    [string]$Reason = "",
    [object]$Evidence = $null
  )
  [pscustomobject]@{
    Type = "GateResult"
    Name = $Name
    Ok = $Ok
    Status = $(if ($Ok) { "PASS" } else { "BLOCKED" })
    Reason = $Reason
    Evidence = $Evidence
    Timestamp = (Get-Date).ToString("o")
  }
}

function Read-SeraPhaseContract {
  [CmdletBinding()]
  param(
    [string]$ContractPath = "",
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
  )
  if ([string]::IsNullOrWhiteSpace($ContractPath)) {
    $ContractPath = Join-Path $RepoRoot "scripts\phase-contracts\phase201.contract.json"
  }
  if (!(Test-Path -LiteralPath $ContractPath)) {
    throw "Phase contract not found: $ContractPath"
  }
  $Contract = Get-Content -LiteralPath $ContractPath -Raw | ConvertFrom-Json
  $Contract | Add-Member -NotePropertyName __ContractPath -NotePropertyValue $ContractPath -Force
  return $Contract
}

function Quote-SeraArg {
  param([AllowNull()][string]$Value)
  if ($null -eq $Value) { return '""' }
  return '"' + ($Value -replace '"','\"') + '"'
}

function Invoke-SeraChildProcess {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [string[]]$ArgumentList = @(),
    [string]$WorkingDirectory = "",
    [int]$TimeoutSeconds = 600
  )
  if ([string]::IsNullOrWhiteSpace($WorkingDirectory)) {
    $WorkingDirectory = (Get-Location).Path
  }
  $Psi = [System.Diagnostics.ProcessStartInfo]::new()
  $Psi.FileName = $FilePath
  $Psi.Arguments = (($ArgumentList | ForEach-Object { Quote-SeraArg ([string]$_) }) -join " ")
  $Psi.WorkingDirectory = $WorkingDirectory
  $Psi.UseShellExecute = $false
  $Psi.RedirectStandardOutput = $true
  $Psi.RedirectStandardError = $true
  $Psi.CreateNoWindow = $true
  $Process = [System.Diagnostics.Process]::new()
  $Process.StartInfo = $Psi
  $Started = $Process.Start()
  if (!$Started) { throw "Failed to start child process: $FilePath" }
  $StdOut = $Process.StandardOutput.ReadToEnd()
  $StdErr = $Process.StandardError.ReadToEnd()
  if (!$Process.WaitForExit($TimeoutSeconds * 1000)) {
    try { $Process.Kill() } catch {}
    return [pscustomobject]@{
      Type = "ChildProcessResult"
      Ok = $false
      TimedOut = $true
      ExitCode = -999
      CommandLine = "$FilePath $($Psi.Arguments)"
      WorkingDirectory = $WorkingDirectory
      Stdout = $StdOut
      Stderr = $StdErr
      Timestamp = (Get-Date).ToString("o")
    }
  }
  [pscustomobject]@{
    Type = "ChildProcessResult"
    Ok = ($Process.ExitCode -eq 0)
    TimedOut = $false
    ExitCode = $Process.ExitCode
    CommandLine = "$FilePath $($Psi.Arguments)"
    WorkingDirectory = $WorkingDirectory
    Stdout = $StdOut
    Stderr = $StdErr
    Timestamp = (Get-Date).ToString("o")
  }
}

function Invoke-SeraGit {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [Parameter(ValueFromRemainingArguments=$true)][string[]]$Args
  )
  Push-Location $RepoRoot
  try { return @(git @Args) } finally { Pop-Location }
}

function Test-SeraRepoClean {
  [CmdletBinding()]
  param([Parameter(Mandatory=$true)][string]$RepoRoot)
  $Status = @(Invoke-SeraGit -RepoRoot $RepoRoot status --short --untracked-files=all)
  return New-SeraGateResult -Name "RepoClean" -Ok ($Status.Count -eq 0) -Reason $(if ($Status.Count -eq 0) { "Repo clean." } else { "Repo dirty: $($Status -join '; ')" }) -Evidence @{ repoStatus = @($Status) }
}

function Test-SeraZip {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory=$true)]$Contract,
    [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
  )
  $ZipName = [string]$Contract.expectedZipFilename
  $ZipPath = Join-Path $AutoOpsRoot "13_chatgpt_downloads\$ZipName"
  if (!(Test-Path -LiteralPath $ZipPath)) {
    return New-SeraGateResult -Name "Zip" -Ok $false -Reason "Expected ZIP not found: $ZipPath" -Evidence @{ zipPath = $ZipPath }
  }
  $Item = Get-Item -LiteralPath $ZipPath
  $Hash = (Get-FileHash -LiteralPath $ZipPath -Algorithm SHA256).Hash.ToLowerInvariant()
  return New-SeraGateResult -Name "Zip" -Ok $true -Reason "Expected ZIP exists and SHA was computed." -Evidence @{ zipPath = $ZipPath; zipSha256 = $Hash; bytes = $Item.Length; lastWriteTime = $Item.LastWriteTime.ToString("o") }
}

function Test-SeraBaseline {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory=$true)]$Contract,
    [Parameter(Mandatory=$true)][string]$RepoRoot
  )
  $Expected = [string]$Contract.baseline.phase199Commit
  $Tag = [string]$Contract.baseline.phase199Tag
  $Head = (Invoke-SeraGit -RepoRoot $RepoRoot rev-parse HEAD | Select-Object -First 1).Trim()
  Invoke-SeraGit -RepoRoot $RepoRoot merge-base --is-ancestor $Expected HEAD | Out-Null
  $InAncestry = ($LASTEXITCODE -eq 0)
  $TagCommit = ""
  try { $TagCommit = (Invoke-SeraGit -RepoRoot $RepoRoot rev-parse "$Tag^{commit}" | Select-Object -First 1).Trim() } catch { $TagCommit = "missing" }
  $Ok = ($InAncestry -and $TagCommit -eq $Expected)
  return New-SeraGateResult -Name "Baseline" -Ok $Ok -Reason $(if ($Ok) { "Baseline evidence passed." } else { "Baseline evidence failed." }) -Evidence @{ head = $Head; expectedCommit = $Expected; tag = $Tag; tagCommit = $TagCommit; inAncestry = $InAncestry }
}

function Test-SeraBrowserMarkers {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory=$true)]$Contract,
    [Parameter(Mandatory=$true)][string]$RepoRoot
  )
  $Bridge = Join-Path $RepoRoot "scripts\sera-chatgpt-browser-bridge-v1.ps1"
  if (!(Test-Path -LiteralPath $Bridge)) {
    return New-SeraGateResult -Name "BrowserMarkers" -Ok $false -Reason "Bridge file missing: $Bridge" -Evidence @{ path = $Bridge }
  }
  $Text = Get-Content -LiteralPath $Bridge -Raw
  $Missing = @()
  foreach ($Needle in @($Contract.requiredEvidence.browserMarkers)) {
    if ($Text -notlike "*$Needle*") { $Missing += [string]$Needle }
  }
  return New-SeraGateResult -Name "BrowserMarkers" -Ok ($Missing.Count -eq 0) -Reason $(if ($Missing.Count -eq 0) { "Browser markers present." } else { "Missing browser markers." }) -Evidence @{ path = $Bridge; missing = @($Missing) }
}

function Test-SeraPointerCleanup {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
  )
  $Before = Test-SeraRepoClean -RepoRoot $RepoRoot
  if (!$Before.Ok) { return New-SeraGateResult -Name "PointerCleanup" -Ok $false -Reason "Repo not clean before pointer cleanup proof." -Evidence $Before }
  $Archive = Join-Path $AutoOpsRoot ("00_control_center\archive\phase201_pointer_cleanup_probe_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
  New-Item -ItemType Directory -Force $Archive | Out-Null
  $Probe = Join-Path $Archive "pointer-cleanup-proof.txt"
  "phase201 pointer cleanup proof $(Get-Date -Format o)" | Set-Content -LiteralPath $Probe -Encoding UTF8
  Remove-Item -LiteralPath $Probe -Force
  $After = Test-SeraRepoClean -RepoRoot $RepoRoot
  return New-SeraGateResult -Name "PointerCleanup" -Ok ($After.Ok) -Reason $(if ($After.Ok) { "Pointer cleanup proof preserved clean repo." } else { "Pointer cleanup proof left repo dirty." }) -Evidence @{ archive = $Archive; before = $Before; after = $After }
}

function Get-SeraLatestHandoff {
  [CmdletBinding()]
  param(
    [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
    [string]$Pattern = "*phase201*.*"
  )
  $Dir = Join-Path $AutoOpsRoot "06_handoff"
  if (!(Test-Path -LiteralPath $Dir)) { return $null }
  return Get-ChildItem -LiteralPath $Dir -File -Filter $Pattern -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}

function Test-SeraRepeatability {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory=$true)]$Contract,
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
  )
  $Missing = [System.Collections.Generic.List[string]]::new()
  $Zip = Test-SeraZip -Contract $Contract -AutoOpsRoot $AutoOpsRoot
  if (!$Zip.Ok) { $Missing.Add("zip") | Out-Null }
  $Repo = Test-SeraRepoClean -RepoRoot $RepoRoot
  if (!$Repo.Ok) { $Missing.Add("repo_clean") | Out-Null }
  $LogDir = Join-Path $AutoOpsRoot "00_control_center\logs"
  $LogText = ""
  if (Test-Path -LiteralPath $LogDir) {
    foreach ($Log in @(Get-ChildItem -LiteralPath $LogDir -File -Filter "*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 12)) {
      $LogText += "`n--- LOG: $($Log.FullName) ---`n"
      $LogText += Get-Content -LiteralPath $Log.FullName -Raw
    }
  }
  foreach ($Needle in @($Contract.requiredEvidence.autopilotMarkers)) {
    if ($LogText -notlike "*$Needle*") { $Missing.Add("log_marker:$Needle") | Out-Null }
  }
  $Ok = ($Missing.Count -eq 0)
  return New-SeraGateResult -Name "Repeatability" -Ok $Ok -Reason $(if ($Ok) { "Repeatability evidence passed." } else { "Repeatability evidence missing." }) -Evidence @{ missing = @($Missing); zip = $Zip; repo = $Repo; logDirectory = $LogDir }
}

function Test-SeraRemoteTruth {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory=$true)]$Contract,
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [switch]$RequirePhaseTag
  )
  Invoke-SeraGit -RepoRoot $RepoRoot fetch origin main --tags | Out-Null
  $LocalHead = (Invoke-SeraGit -RepoRoot $RepoRoot rev-parse HEAD | Select-Object -First 1).Trim()
  $OriginMain = (Invoke-SeraGit -RepoRoot $RepoRoot rev-parse origin/main | Select-Object -First 1).Trim()
  $LocalTagCommit = "not_checked"
  $RemoteTagCommit = "not_checked"
  $Tag = [string]$Contract.expectedTag
  if ($RequirePhaseTag) {
    try { $LocalTagCommit = (Invoke-SeraGit -RepoRoot $RepoRoot rev-parse "$Tag^{commit}" | Select-Object -First 1).Trim() } catch { $LocalTagCommit = "missing" }
    try { $RemoteTagCommit = (Invoke-SeraGit -RepoRoot $RepoRoot ls-remote --tags origin "refs/tags/$Tag" | ForEach-Object { ($_ -split "\s+")[0] } | Select-Object -First 1).Trim() } catch { $RemoteTagCommit = "missing" }
  }
  $Ok = if ($RequirePhaseTag) { ($LocalHead -eq $OriginMain -and $LocalTagCommit -eq $LocalHead -and $RemoteTagCommit -eq $LocalHead) } else { $true }
  return New-SeraGateResult -Name "RemoteTruth" -Ok $Ok -Reason $(if ($Ok) { "Remote truth evidence captured." } else { "Remote truth mismatch." }) -Evidence @{ localHead = $LocalHead; originMain = $OriginMain; tag = $Tag; localTagCommit = $LocalTagCommit; remoteTagCommit = $RemoteTagCommit }
}

function Write-SeraHandoff {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory=$true)]$Contract,
    [Parameter(Mandatory=$true)][string]$Status,
    [Parameter(Mandatory=$true)][string]$Reason,
    [string]$Proof = "",
    [string]$RepoRoot = (Get-Location).Path,
    [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
    [object]$ErrorRecord = $null,
    [object]$ChildResult = $null,
    [object]$Evidence = $null
  )
  $HandoffDir = Join-Path $AutoOpsRoot "06_handoff"
  New-Item -ItemType Directory -Force $HandoffDir | Out-Null
  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $PhaseName = "s.e.r.a_$($Contract.phaseSlug)_overlay"
  $Path = Join-Path $HandoffDir "$PhaseName-$Stamp-$Status.md"
  $Branch = "unknown"; $RepoStatus = @(); $Head = "unknown"; $OriginMain = "unknown"
  try { $Branch = (Invoke-SeraGit -RepoRoot $RepoRoot branch --show-current | Select-Object -First 1).Trim() } catch {}
  try { $RepoStatus = @(Invoke-SeraGit -RepoRoot $RepoRoot status --short --untracked-files=all) } catch {}
  try { $Head = (Invoke-SeraGit -RepoRoot $RepoRoot rev-parse HEAD | Select-Object -First 1).Trim() } catch {}
  try { $OriginMain = (Invoke-SeraGit -RepoRoot $RepoRoot rev-parse origin/main | Select-Object -First 1).Trim() } catch {}
  $Latest = Get-SeraLatestHandoff -AutoOpsRoot $AutoOpsRoot -Pattern "*phase201*.*"
  $FullErrorRecord = ""; $Invocation = ""; $Position = ""; $Stack = ""
  if ($null -ne $ErrorRecord) {
    try { $FullErrorRecord = ($ErrorRecord | Format-List * -Force | Out-String) } catch {}
    try { $Invocation = ($ErrorRecord.InvocationInfo | Format-List * -Force | Out-String) } catch {}
    try { $Position = [string]$ErrorRecord.InvocationInfo.PositionMessage } catch {}
    try { $Stack = [string]$ErrorRecord.ScriptStackTrace } catch {}
  }
  $ChildCommandLine = ""; $ChildStdout = ""; $ChildStderr = ""; $ChildExitCode = ""
  if ($null -ne $ChildResult) {
    $ChildCommandLine = [string]$ChildResult.CommandLine
    $ChildStdout = [string]$ChildResult.Stdout
    $ChildStderr = [string]$ChildResult.Stderr
    $ChildExitCode = [string]$ChildResult.ExitCode
  }
  $EvidenceJson = ""
  if ($null -ne $Evidence) { try { $EvidenceJson = ($Evidence | ConvertTo-Json -Depth 20) } catch { $EvidenceJson = [string]$Evidence } }
  @"
Status: $Status
Phase: $PhaseName
PhaseNumber: $($Contract.phaseNumber)
PhaseSlug: $($Contract.phaseSlug)
Branch: $Branch
Timestamp: $Stamp

Reason:
$Reason

Proof:
$Proof

RequiredPassFields:
ZipPath: $(if ($Evidence -and $Evidence.zipPath) { $Evidence.zipPath } else { "not_available" })
ZipSha256: $(if ($Evidence -and $Evidence.zipSha256) { $Evidence.zipSha256 } else { "not_available" })
Head: $Head
OriginMain: $OriginMain
LocalTagCommit: $(if ($Evidence -and $Evidence.localTagCommit) { $Evidence.localTagCommit } else { "not_applicable_pre_closeout" })
RemoteTagCommit: $(if ($Evidence -and $Evidence.remoteTagCommit) { $Evidence.remoteTagCommit } else { "not_applicable_pre_closeout" })
VerifierHandoffPath: $(if ($Evidence -and $Evidence.verifierHandoffPath) { $Evidence.verifierHandoffPath } else { "not_available" })
QaHandoffPath: $(if ($Evidence -and $Evidence.qaHandoffPath) { $Evidence.qaHandoffPath } else { "not_available" })
RepoStatus: $(if ($RepoStatus.Count -eq 0) { "clean" } else { $RepoStatus -join '; ' })

BlockedDiagnosticFields:
InnerFailure:
$Reason

FullErrorRecord:
$FullErrorRecord

InvocationInfo:
$Invocation

PositionMessage:
$Position

ScriptStackTrace:
$Stack

ChildCommandLine:
$ChildCommandLine

ChildExitCode:
$ChildExitCode

ChildStdout:
$ChildStdout

ChildStderr:
$ChildStderr

CurrentBranch:
$Branch

RepoStatus:
$(if ($RepoStatus.Count -eq 0) { "clean" } else { $RepoStatus -join "`n" })

LatestRelevantHandoff:
$(if ($Latest) { $Latest.FullName } else { "none" })

EvidenceJson:
$EvidenceJson
"@ | Set-Content -LiteralPath $Path -Encoding UTF8
  return [pscustomobject]@{ Type = "HandoffResult"; Status = $Status; Path = $Path; Reason = $Reason; Timestamp = $Stamp }
}

Export-ModuleMember -Function Read-SeraPhaseContract, Invoke-SeraChildProcess, Test-SeraZip, Test-SeraBaseline, Test-SeraBrowserMarkers, Test-SeraPointerCleanup, Test-SeraRepeatability, Write-SeraHandoff, Test-SeraRemoteTruth, Test-SeraRepoClean, New-SeraGateResult, Get-SeraLatestHandoff

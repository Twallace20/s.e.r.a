
param(
  [string]$AutoOps = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [switch]$Install,
  [switch]$DryRun,
  [switch]$SelfTest,
  [int]$StaleRunningMinutes = 10,
  [string]$OriginalExecute,
  [string]$OriginalArguments
)

$ErrorActionPreference = "Stop"

function New-Dir([string]$Path) {
  New-Item -ItemType Directory -Force $Path | Out-Null
}

function Write-JsonNoBom([string]$Path, $Obj) {
  $json = $Obj | ConvertTo-Json -Depth 20
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $json, $utf8NoBom)
}

function NowIso() {
  return (Get-Date).ToUniversalTime().ToString("o")
}

function Paths([string]$Root) {
  return [pscustomobject]@{
    Control = Join-Path $Root "00_control_center"
    Inbox = Join-Path $Root "00_control_center\command_inbox"
    Evidence = Join-Path $Root "00_control_center\evidence"
    NeedsAttention = Join-Path $Root "17_needs_attention"
    BridgeOutbox = Join-Path $Root "15_bridge_outbox"
    Downloads = Join-Path $Root "13_chatgpt_downloads"
    ApplyApproved = Join-Path $Root "01_apply_approved"
    Handoff = Join-Path $Root "06_handoff"
    Lease = Join-Path $Root "00_control_center\generation-lease.json"
    PhoneState = Join-Path $Root "00_control_center\phone-control-watcher-state.json"
    CommandState = Join-Path $Root "00_control_center\autopilot-command-state.json"
    CommandJson = Join-Path $Root "00_control_center\autopilot-command.json"
    LastResult = Join-Path $Root "00_control_center\autopilot-command-last-result.json"
    GuardDir = Join-Path $Root "00_control_center\runtime_guards\autoops-r146-phone-command-intake-handoff-stale-running-guard-v1"
  }
}

function Read-JsonFile([string]$Path) {
  if (!(Test-Path $Path)) { return $null }
  try {
    return Get-Content $Path -Raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Get-FileSnapshot([string]$Path) {
  if (!(Test-Path $Path)) {
    return [pscustomobject]@{ exists = $false; path = $Path; length = $null; sha256 = $null; attributes = $null; lastWriteTimeUtc = $null; readable = $false }
  }
  try {
    $item = Get-Item $Path -Force
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    $sha = (Get-FileHash $Path -Algorithm SHA256).Hash.ToUpperInvariant()
    return [pscustomobject]@{
      exists = $true
      path = $Path
      length = $item.Length
      sha256 = $sha
      attributes = [string]$item.Attributes
      lastWriteTimeUtc = $item.LastWriteTimeUtc.ToString("o")
      readable = $true
    }
  } catch {
    return [pscustomobject]@{ exists = $true; path = $Path; length = $null; sha256 = $null; attributes = $null; lastWriteTimeUtc = $null; readable = $false; error = $_.Exception.Message }
  }
}

function Test-StableFile([string]$Path, [int]$DelayMs = 1200) {
  $before = Get-FileSnapshot $Path
  Start-Sleep -Milliseconds $DelayMs
  $after = Get-FileSnapshot $Path
  $stable = $before.exists -and $after.exists -and $before.readable -and $after.readable -and ($before.length -eq $after.length) -and ($before.sha256 -eq $after.sha256)
  $reason = if ($stable) { "size_and_hash_stable" } elseif (!$before.exists -or !$after.exists) { "file_missing" } elseif (!$before.readable -or !$after.readable) { "file_not_readable_or_not_local" } else { "size_or_hash_changed" }
  return [pscustomobject]@{ stable = $stable; reason = $reason; before = $before; after = $after }
}

function Get-CandidateCommands($P) {
  if (!(Test-Path $P.Inbox)) { return @() }
  return @(Get-ChildItem $P.Inbox -File -Filter "*.json" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch "\.example\.json$" -and $_.Name -notmatch "example" } |
    Sort-Object LastWriteTime)
}

function Get-CommandProgress($P, [datetime]$SinceUtc) {
  $bridge = @()
  $download = @()
  $apply = @()
  $handoff = @()
  if (Test-Path $P.BridgeOutbox) { $bridge = @(Get-ChildItem $P.BridgeOutbox -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTimeUtc -ge $SinceUtc }) }
  if (Test-Path $P.Downloads) { $download = @(Get-ChildItem $P.Downloads -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTimeUtc -ge $SinceUtc }) }
  if (Test-Path $P.ApplyApproved) { $apply = @(Get-ChildItem $P.ApplyApproved -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTimeUtc -ge $SinceUtc }) }
  if (Test-Path $P.Handoff) { $handoff = @(Get-ChildItem $P.Handoff -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTimeUtc -ge $SinceUtc }) }
  $leasePresent = Test-Path $P.Lease
  return [pscustomobject]@{
    bridgeOutboxNewCount = $bridge.Count
    downloadsNewCount = $download.Count
    applyApprovedNewCount = $apply.Count
    handoffNewCount = $handoff.Count
    generationLeasePresent = $leasePresent
  }
}

function Get-LastRunStarted($Obj) {
  if ($null -eq $Obj) { return $null }
  $value = $null
  if ($Obj.PSObject.Properties.Name -contains "lastRunStartedAt") { $value = [string]$Obj.lastRunStartedAt }
  if (!$value -and ($Obj.PSObject.Properties.Name -contains "command") -and $Obj.command -and ($Obj.command.PSObject.Properties.Name -contains "lastRunStartedAt")) { $value = [string]$Obj.command.lastRunStartedAt }
  if (!$value) { return $null }
  try { return [datetime]::Parse($value).ToUniversalTime() } catch { return $null }
}

function Get-CommandStatus($Obj) {
  if ($null -eq $Obj) { return $null }
  if ($Obj.PSObject.Properties.Name -contains "status") { return [string]$Obj.status }
  if (($Obj.PSObject.Properties.Name -contains "command") -and $Obj.command -and ($Obj.command.PSObject.Properties.Name -contains "status")) { return [string]$Obj.command.status }
  return $null
}

function Write-Evidence($P, [string]$Kind, $Obj) {
  New-Dir $P.Evidence
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $path = Join-Path $P.Evidence "autoops-r146-$Kind-$stamp.json"
  Write-JsonNoBom $path $Obj
  return $path
}

function Write-NeedsAttention($P, [string]$Reason, $Details) {
  New-Dir $P.NeedsAttention
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $path = Join-Path $P.NeedsAttention "PHONE_CONTROL_WATCHER_NEEDS_ATTENTION-R146-$stamp.md"
  $body = @"
# S.E.R.A. Phone Control Watcher Needs Attention

Version: autoops-r146-phone-command-intake-handoff-stale-running-guard-v1

## Reason

$Reason

## Details

````json
$($Details | ConvertTo-Json -Depth 20)
````
"@
  Set-Content -Path $path -Value $body -Encoding UTF8
  return $path
}

function Inspect-Intake([string]$Root, [int]$StaleMinutes) {
  $P = Paths $Root
  New-Dir $P.Control
  New-Dir $P.Evidence
  $commands = Get-CandidateCommands $P
  $latest = if ($commands.Count -gt 0) { $commands[-1] } else { $null }
  $stable = $null
  $parsed = $null

  if ($latest) {
    $stable = Test-StableFile $latest.FullName
    if ($stable.stable) {
      try { $parsed = Get-Content $latest.FullName -Raw | ConvertFrom-Json } catch { $parsed = $null }
    }
  }

  $state = Read-JsonFile $P.CommandState
  $phoneState = Read-JsonFile $P.PhoneState
  $runStarted = Get-LastRunStarted $state
  if ($null -eq $runStarted) { $runStarted = Get-LastRunStarted $phoneState }
  $status = Get-CommandStatus $state
  if (!$status) { $status = Get-CommandStatus $phoneState }
  $now = (Get-Date).ToUniversalTime()
  $stale = $false
  $progress = $null

  if ($status -eq "running" -and $runStarted) {
    $age = ($now - $runStarted).TotalMinutes
    $progress = Get-CommandProgress $P $runStarted
    if ($age -ge $StaleMinutes -and !$progress.generationLeasePresent -and $progress.bridgeOutboxNewCount -eq 0 -and $progress.downloadsNewCount -eq 0 -and $progress.applyApprovedNewCount -eq 0 -and $progress.handoffNewCount -eq 0) {
      $stale = $true
    }
  }

  $result = [ordered]@{
    ok = $true
    version = "autoops-r146-phone-command-intake-handoff-stale-running-guard-v1"
    inspectedAt = NowIso
    commandCount = $commands.Count
    latestCommand = if ($latest) { $latest.FullName } else { $null }
    stableCheck = $stable
    parsedCommandId = if ($parsed -and ($parsed.PSObject.Properties.Name -contains "commandId")) { [string]$parsed.commandId } else { $null }
    phaseSlug = if ($parsed -and ($parsed.PSObject.Properties.Name -contains "phaseSlug")) { [string]$parsed.phaseSlug } else { $null }
    expectedZipFilename = if ($parsed -and ($parsed.PSObject.Properties.Name -contains "expectedZipFilename")) { [string]$parsed.expectedZipFilename } else { $null }
    runNonce = if ($parsed -and ($parsed.PSObject.Properties.Name -contains "runNonce")) { [string]$parsed.runNonce } else { $null }
    runningState = [ordered]@{
      status = $status
      lastRunStartedAt = if ($runStarted) { $runStarted.ToString("o") } else { $null }
      staleRunning = $stale
      progress = $progress
    }
    safety = [ordered]@{
      savedChatGptTargetOnly = $true
      allowRandomRecentChatFallback = $false
      allowNewChatFallback = $false
    }
  }

  $evidencePath = Write-Evidence $P "intake-inspection" $result
  $result.evidencePath = $evidencePath

  if ($stale) {
    $na = Write-NeedsAttention $P "Accepted command is stuck in running state without bridge, generation lease, download, apply, or handoff progress." $result
    $result.ok = $false
    $result.status = "needs_attention"
    $result.needsAttentionPath = $na
  } elseif ($latest -and (!$stable.stable -or !$parsed)) {
    $result.ok = $false
    $result.status = "waiting_for_stable_command"
  } else {
    $result.status = "ready_to_delegate"
  }

  return [pscustomobject]$result
}

function Install-Wrapper([string]$Root, [string]$Repo, [switch]$Dry) {
  $taskName = "SERA Phone Control Watcher"
  $P = Paths $Root
  New-Dir $P.GuardDir

  $task = Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
  $action = $task.Actions | Select-Object -First 1
  $guardScript = Join-Path $P.GuardDir "autoops-r146-phone-command-intake-handoff-stale-running-guard-v1.ps1"
  $wrapperVbs = Join-Path $P.GuardDir "SERA_Phone_Control_Watcher_R146_Guard.vbs"
  $originalJson = Join-Path $P.GuardDir "original-SERA_Phone_Control_Watcher-action.json"

  Copy-Item -LiteralPath $PSCommandPath -Destination $guardScript -Force

  $original = [ordered]@{
    taskName = $taskName
    execute = [string]$action.Execute
    arguments = [string]$action.Arguments
    capturedAt = NowIso
  }
  Write-JsonNoBom $originalJson $original

  $vbs = @"
Option Explicit

Dim shell
Dim cmd

Set shell = CreateObject("WScript.Shell")

cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass " & _
      "-File ""$guardScript"" " & _
      "-AutoOps ""$Root"" " & _
      "-RepoRoot ""$Repo"" " & _
      "-OriginalExecute ""$($original.execute.Replace("""",""""""))"" " & _
      "-OriginalArguments ""$($original.arguments.Replace("""",""""""))"""

shell.Run cmd, 0, False
"@
  Set-Content -Path $wrapperVbs -Value $vbs -Encoding ASCII

  $install = [ordered]@{
    taskName = $taskName
    originalExecute = $original.execute
    originalArguments = $original.arguments
    guardScript = $guardScript
    wrapperVbs = $wrapperVbs
    originalActionJson = $originalJson
    installedAt = NowIso
    dryRun = [bool]$Dry
  }
  Write-Evidence $P $(if ($Dry) { "install-dry-run" } else { "install-completed" }) $install | Out-Null

  if (!$Dry) {
    $newAction = New-ScheduledTaskAction -Execute "wscript.exe" -Argument ('"' + $wrapperVbs + '"')
    Set-ScheduledTask -TaskName $taskName -Action $newAction | Out-Null
  }

  return [pscustomobject]$install
}

if ($SelfTest) {
  $root = Join-Path ([System.IO.Path]::GetTempPath()) ("sera-r146-selftest-" + [guid]::NewGuid().ToString("N"))
  $P = Paths $root
  New-Dir $P.Inbox
  New-Dir $P.Evidence
  New-Dir $P.NeedsAttention
  $cmdPath = Join-Path $P.Inbox "autopilot-command-selftest.json"
  @{ schemaVersion=1; commandId="r146-selftest"; status="new"; expectedZipFilename="s.e.r.a_r146_selftest_overlay.zip"; runNonce="selftest"; phaseSlug="selftest" } | ConvertTo-Json | Set-Content $cmdPath -Encoding UTF8
  $inspection = Inspect-Intake $root 10
  $state = [ordered]@{ status="running"; lastRunStartedAt=(Get-Date).ToUniversalTime().AddMinutes(-30).ToString("o") }
  Write-JsonNoBom $P.CommandState $state
  $stale = Inspect-Intake $root 10
  [pscustomobject]@{
    ok = ($inspection.status -eq "ready_to_delegate" -and $stale.status -eq "needs_attention")
    selfTestRoot = $root
    stableIntakeReady = ($inspection.status -eq "ready_to_delegate")
    staleRunningEscalates = ($stale.status -eq "needs_attention")
    needsAttentionPath = $stale.needsAttentionPath
  } | ConvertTo-Json -Depth 20
  exit 0
}

if ($Install) {
  Install-Wrapper $AutoOps $RepoRoot -Dry:$DryRun | ConvertTo-Json -Depth 20
  exit 0
}

$P = Paths $AutoOps
$result = Inspect-Intake $AutoOps $StaleRunningMinutes

if ($result.status -ne "ready_to_delegate") {
  $result | ConvertTo-Json -Depth 20
  exit 0
}

# Delegate only after stable intake and no stale running lock.
if ([string]::IsNullOrWhiteSpace($OriginalExecute)) {
  $origPath = Join-Path $P.GuardDir "original-SERA_Phone_Control_Watcher-action.json"
  $orig = Read-JsonFile $origPath
  if ($orig) {
    $OriginalExecute = [string]$orig.execute
    $OriginalArguments = [string]$orig.arguments
  }
}

if ([string]::IsNullOrWhiteSpace($OriginalExecute)) {
  $details = [ordered]@{ reason="missing_original_phone_control_action"; inspectedAt=NowIso; result=$result }
  Write-NeedsAttention $P "R146 could not delegate because original Phone Control Watcher action is missing." $details | Out-Null
  exit 0
}

$argList = @()
if (![string]::IsNullOrWhiteSpace($OriginalArguments)) { $argList = @($OriginalArguments) }

$delegateEvidence = [ordered]@{
  delegatedAt = NowIso
  originalExecute = $OriginalExecute
  originalArguments = $OriginalArguments
  intakeEvidencePath = $result.evidencePath
}
Write-Evidence $P "delegating-phone-control" $delegateEvidence | Out-Null

Start-Process -FilePath $OriginalExecute -ArgumentList $argList -WindowStyle Hidden
exit 0

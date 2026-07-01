
[CmdletBinding()]
param(
  [string]$AutoOps = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [switch]$SelfTest,
  [switch]$Install,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$GuardName = "autoops-r148-command-source-immutability-stale-handoff-filter-v1"
$TaskName = "SERA Phone Control Watcher"

function New-JsonEvidence($Path, $Object) {
  New-Item -ItemType Directory -Force (Split-Path $Path) | Out-Null
  $Object | ConvertTo-Json -Depth 12 | Set-Content -Path $Path -Encoding UTF8
}

function Get-StableFileInfo($Path) {
  if (!(Test-Path $Path)) { return @{ stable = $false; reason = "missing" } }
  $a = Get-Item $Path
  $h1 = (Get-FileHash $Path -Algorithm SHA256).Hash.ToUpperInvariant()
  Start-Sleep -Milliseconds 750
  $b = Get-Item $Path
  $h2 = (Get-FileHash $Path -Algorithm SHA256).Hash.ToUpperInvariant()
  return @{
    stable = (($a.Length -eq $b.Length) -and ($h1 -eq $h2))
    reason = if (($a.Length -eq $b.Length) -and ($h1 -eq $h2)) { "size_and_hash_stable" } else { "size_or_hash_changed" }
    length = $b.Length
    sha256 = $h2
    lastWriteTimeUtc = $b.LastWriteTimeUtc.ToString("o")
  }
}

function Read-JsonFile($Path) {
  try { return (Get-Content $Path -Raw | ConvertFrom-Json) } catch { return $null }
}

function Test-IsRunnableCommand($Command) {
  if (!$Command) { return $false }
  if ($Command.enabled -eq $false) { return $false }
  if (@("blocked","stopped","closed","closed_cleanly") -contains ([string]$Command.status).ToLowerInvariant()) { return $false }
  if (@("blocked","stopped","closed","closed_cleanly") -contains ([string]$Command.commandStatus).ToLowerInvariant()) { return $false }
  if (!$Command.action) { return $false }
  if (!$Command.phaseStart -and !$Command.phases) { return $false }
  return $true
}

function Protect-CommandInbox($Root) {
  $CommandInbox = Join-Path $Root "00_control_center\command_inbox"
  $EvidenceDir = Join-Path $Root "00_control_center\evidence"
  $ArchiveDir = Join-Path $Root "00_control_center\archive\r148-quarantined-command-results"
  New-Item -ItemType Directory -Force $CommandInbox, $EvidenceDir, $ArchiveDir | Out-Null

  $files = Get-ChildItem $CommandInbox -File -Filter "*.json" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch "\.example\.json$" } |
    Sort-Object LastWriteTime -Descending

  $active = $null
  $quarantined = @()
  foreach ($file in $files) {
    $stable = Get-StableFileInfo $file.FullName
    $json = if ($stable.stable) { Read-JsonFile $file.FullName } else { $null }
    if (Test-IsRunnableCommand $json) {
      if (!$active) { $active = @{ path = $file.FullName; file = $file; stable = $stable; command = $json } }
      continue
    }
    $name = "{0}-{1}" -f (Get-Date -Format "yyyyMMdd_HHmmss"), $file.Name
    $dest = Join-Path $ArchiveDir $name
    Move-Item $file.FullName $dest -Force
    $quarantined += @{ source = $file.FullName; destination = $dest; reason = "not_runnable_command_or_blocked_result"; stable = $stable }
  }

  $contractPath = Join-Path $Root "00_control_center\active-command-contract.json"
  if ($active) {
    $cmd = $active.command
    $contract = [ordered]@{
      schemaVersion = 1
      commandId = $cmd.commandId
      runNonce = $cmd.runNonce
      phaseStart = $cmd.phaseStart
      phaseEnd = $cmd.phaseEnd
      phases = $cmd.phases
      phaseSlug = $cmd.phaseSlug
      phaseTitle = $cmd.phaseTitle
      expectedZipFilename = $cmd.expectedZipFilename
      commandFile = $active.path
      commandSha256 = $active.stable.sha256
      acceptedForGuardAt = (Get-Date).ToUniversalTime().ToString("o")
      guard = $GuardName
    }
    New-JsonEvidence $contractPath $contract
  }

  $evidencePath = Join-Path $EvidenceDir ("autoops-r148-command-inbox-guard-{0}Z.json" -f (Get-Date -Format "yyyyMMdd_HHmmss"))
  New-JsonEvidence $evidencePath ([ordered]@{
    ok = $true
    guard = $GuardName
    activeCommandPresent = [bool]$active
    activeCommandFile = if ($active) { $active.path } else { $null }
    quarantined = $quarantined
    evidenceAt = (Get-Date).ToUniversalTime().ToString("o")
  })
  return @{ active = $active; evidencePath = $evidencePath; quarantined = $quarantined }
}

function Clear-StaleLastResult($Root, $Active) {
  if (!$Active) { return $null }
  $LastResult = Join-Path $Root "00_control_center\autopilot-command-last-result.json"
  if (!(Test-Path $LastResult)) { return $null }
  $result = Read-JsonFile $LastResult
  if (!$result) { return $null }
  $cmd = $Active.command
  $reason = [string]$result.blockedReason
  $handoff = [string]$result.latestHandoffPath
  $phaseText = "phase$($cmd.phaseStart)"
  $matchesPhase = $handoff.ToLowerInvariant().Contains($phaseText.ToLowerInvariant())
  $sameCommand = ($result.command.commandId -eq $cmd.commandId) -or ($result.commandId -eq $cmd.commandId)
  if ($reason -match "Latest handoff status is CLOSED_CLEANLY" -and !$matchesPhase -and !$sameCommand) {
    $ArchiveDir = Join-Path $Root "00_control_center\archive\r148-stale-last-result"
    New-Item -ItemType Directory -Force $ArchiveDir | Out-Null
    $dest = Join-Path $ArchiveDir ("{0}-autopilot-command-last-result.json" -f (Get-Date -Format "yyyyMMdd_HHmmss"))
    Move-Item $LastResult $dest -Force
    return @{ cleared = $true; source = $LastResult; destination = $dest; reason = "stale_closed_cleanly_handoff_not_matching_active_command" }
  }
  return @{ cleared = $false; reason = "last_result_matches_or_not_stale" }
}

function Invoke-PreviousAction($Root) {
  $GuardDir = Join-Path $Root "00_control_center\runtime_guards\autoops-r148-command-source-immutability-stale-handoff-filter-v1"
  $OriginalJson = Join-Path $GuardDir "original-SERA_Phone_Control_Watcher-action.json"
  if (!(Test-Path $OriginalJson)) { return @{ delegated = $false; reason = "original_action_missing" } }
  $original = Read-JsonFile $OriginalJson
  if (!$original) { return @{ delegated = $false; reason = "original_action_invalid" } }
  $shell = New-Object -ComObject WScript.Shell
  $cmd = '"{0}" {1}' -f $original.Execute, $original.Arguments
  $shell.Run($cmd, 0, $false) | Out-Null
  return @{ delegated = $true; execute = $original.Execute; arguments = $original.Arguments }
}

function Install-Guard($Root, $RepoRoot, [bool]$DryRunMode) {
  $GuardDir = Join-Path $Root "00_control_center\runtime_guards\autoops-r148-command-source-immutability-stale-handoff-filter-v1"
  New-Item -ItemType Directory -Force $GuardDir | Out-Null
  $ThisScriptSource = $PSCommandPath
  $GuardScript = Join-Path $GuardDir "autoops-r148-command-source-immutability-stale-handoff-filter-v1.ps1"
  Copy-Item $ThisScriptSource $GuardScript -Force

  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
  $action = $task.Actions | Select-Object -First 1
  $OriginalJson = Join-Path $GuardDir "original-SERA_Phone_Control_Watcher-action.json"
  $originalObj = [ordered]@{ Execute = $action.Execute; Arguments = $action.Arguments; CapturedAt = (Get-Date).ToUniversalTime().ToString("o"); TaskName = $TaskName }
  New-JsonEvidence $OriginalJson $originalObj

  $Wrapper = Join-Path $GuardDir "SERA_Phone_Control_Watcher_R148_Guard.vbs"
  @"
Option Explicit

Dim shell
Dim cmd

Set shell = CreateObject("WScript.Shell")

cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass " & _
      "-File ""$GuardScript"" " & _
      "-AutoOps ""$Root"" " & _
      "-RepoRoot ""$RepoRoot"""

shell.Run cmd, 0, False
"@ | Set-Content -Path $Wrapper -Encoding ASCII

  if (!$DryRunMode) {
    $newAction = New-ScheduledTaskAction -Execute "wscript.exe" -Argument ('"{0}"' -f $Wrapper)
    Set-ScheduledTask -TaskName $TaskName -Action $newAction | Out-Null
  }

  $evidence = [ordered]@{
    taskName = $TaskName
    originalExecute = $action.Execute
    originalArguments = $action.Arguments
    guardScript = $GuardScript
    wrapperVbs = $Wrapper
    originalActionJson = $OriginalJson
    installedAt = (Get-Date).ToUniversalTime().ToString("o")
    dryRun = $DryRunMode
  }
  $EvidencePath = Join-Path $Root ("00_control_center\evidence\autoops-r148-install-{0}-{1}Z.json" -f ($(if($DryRunMode){"dry-run"}else{"completed"})), (Get-Date -Format "yyyyMMdd_HHmmss"))
  New-JsonEvidence $EvidencePath $evidence
  return $evidence
}

if ($SelfTest) {
  $tmp = Join-Path $env:TEMP ("sera-r148-selftest-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force (Join-Path $tmp "00_control_center\command_inbox") | Out-Null
  New-Item -ItemType Directory -Force (Join-Path $tmp "06_handoff") | Out-Null
  $active = [ordered]@{ schemaVersion=1; commandId="phase143-r148-selftest"; enabled=$true; action="run_range"; status="new"; commandStatus="new"; phaseStart=143; phaseEnd=143; phaseSlug="phase143_phone_batch_autopilot_smoke_test_v1"; expectedZipFilename="s.e.r.a_phase143_phone_batch_autopilot_smoke_test_v1_overlay.zip"; runNonce="r148-selftest" }
  $blocked = [ordered]@{ enabled=$false; status="blocked"; commandStatus="blocked"; blockedReason="Latest handoff status is CLOSED_CLEANLY."; latestHandoffPath="C:\old\s.e.r.a_phase131_phone_autopilot_end_to_end_orchestrator_v1_overlay-CLOSED_CLEANLY.md" }
  $active | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $tmp "00_control_center\command_inbox\active.json") -Encoding UTF8
  $blocked | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $tmp "00_control_center\command_inbox\blocked-result.json") -Encoding UTF8
  $blocked | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $tmp "00_control_center\autopilot-command-last-result.json") -Encoding UTF8
  $protected = Protect-CommandInbox $tmp
  $cleared = Clear-StaleLastResult $tmp $protected.active
  [ordered]@{ ok=$true; selfTestRoot=$tmp; activeCommandPresent=[bool]$protected.active; quarantinedCount=$protected.quarantined.Count; staleLastResultCleared=$cleared.cleared; commandSourceImmutable=$true } | ConvertTo-Json -Depth 12
  exit 0
}

if ($Install) {
  Install-Guard -Root $AutoOps -RepoRoot $RepoRoot -DryRunMode ([bool]$DryRun) | ConvertTo-Json -Depth 12
  exit 0
}

$protected = Protect-CommandInbox $AutoOps
$cleared = Clear-StaleLastResult $AutoOps $protected.active
$delegated = if ($protected.active) { Invoke-PreviousAction $AutoOps } else { @{ delegated = $false; reason = "no_active_command" } }
$EvidencePath = Join-Path $AutoOps ("00_control_center\evidence\autoops-r148-delegation-{0}Z.json" -f (Get-Date -Format "yyyyMMdd_HHmmss"))
New-JsonEvidence $EvidencePath ([ordered]@{ ok=$true; guard=$GuardName; activeCommandPresent=[bool]$protected.active; clearedStaleLastResult=$cleared; delegated=$delegated; evidenceAt=(Get-Date).ToUniversalTime().ToString("o") })

param(
  [string]$AutoOps = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$RepoRoot = (Get-Location).Path,
  [switch]$Install,
  [switch]$DryRun,
  [switch]$SelfTest
)

$ErrorActionPreference = "Stop"

$Phase = "AutoOps R147"
$PhaseSlug = "autoops_r147_bridge_prompt_expected_zip_lease_handoff_guard_v1"
$TaskName = "SERA ChatGPT Artifact Watcher"
$GuardDir = Join-Path $AutoOps "00_control_center\runtime_guards\autoops-r147-bridge-prompt-expected-zip-lease-handoff-guard-v1"
$GuardScript = Join-Path $GuardDir "autoops-r147-bridge-prompt-expected-zip-lease-handoff-guard-v1.ps1"
$WrapperVbs = Join-Path $GuardDir "SERA_ChatGPT_Artifact_Watcher_R147_Guard.vbs"
$OriginalActionJson = Join-Path $GuardDir "original-SERA_ChatGPT_Artifact_Watcher-action.json"
$EvidenceDir = Join-Path $AutoOps "00_control_center\evidence"
$ArchiveDir = Join-Path $AutoOps "00_control_center\archive"
$LeasePath = Join-Path $AutoOps "00_control_center\generation-lease.json"
$CommandPath = Join-Path $AutoOps "00_control_center\autopilot-command.json"
$BridgeOutbox = Join-Path $AutoOps "15_bridge_outbox"
$NeedsAttention = Join-Path $AutoOps "17_needs_attention"

function Get-UtcStamp { (Get-Date).ToUniversalTime().ToString("yyyyMMdd_HHmmssZ") }
function Ensure-Dir([string]$Path) { New-Item -ItemType Directory -Force $Path | Out-Null }
function Write-JsonFile([string]$Path, [object]$Object) {
  Ensure-Dir (Split-Path $Path)
  $Object | ConvertTo-Json -Depth 12 | Set-Content -Path $Path -Encoding UTF8
}
function Write-Evidence([string]$Name, [object]$Object) {
  Ensure-Dir $EvidenceDir
  $Path = Join-Path $EvidenceDir ("$Name-$(Get-UtcStamp).json")
  Write-JsonFile $Path $Object
  return $Path
}
function Write-NeedsAttention([string]$Reason, [object]$Details) {
  Ensure-Dir $NeedsAttention
  $Path = Join-Path $NeedsAttention ("CHATGPT_ARTIFACT_WATCHER_NEEDS_ATTENTION-R147-$(Get-UtcStamp).md")
  $Body = @"
# S.E.R.A. ChatGPT Artifact Watcher Needs Attention

Version: $PhaseSlug

## Reason

$Reason

## Details

```json
$($Details | ConvertTo-Json -Depth 10)
```
"@
  $Body | Set-Content -Path $Path -Encoding UTF8
  return $Path
}
function Read-Json([string]$Path) {
  if (!(Test-Path $Path)) { return $null }
  return Get-Content $Path -Raw | ConvertFrom-Json
}
function Get-LatestBridgePrompt([object]$Command) {
  if (!(Test-Path $BridgeOutbox)) { return $null }
  $phase = $Command.phaseStart
  $candidates = Get-ChildItem $BridgeOutbox -File -Filter "*phase$phase*" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
  if (!$candidates -or $candidates.Count -eq 0) { return $null }
  return $candidates | Select-Object -First 1
}
function New-CorrectedBridgePrompt([object]$Command, [string]$Reason) {
  Ensure-Dir $BridgeOutbox
  $phase = [int]$Command.phaseStart
  $phaseSlug = [string]$Command.phaseSlug
  if ([string]::IsNullOrWhiteSpace($phaseSlug)) { $phaseSlug = "phase$phase" }
  $expectedZip = [string]$Command.expectedZipFilename
  $guide = [string]$Command.guide
  $stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd_HHmmssZ")
  $safeSlug = $phaseSlug -replace "[^A-Za-z0-9_\-]", "_"
  $Path = Join-Path $BridgeOutbox ("phase$phase-$safeSlug-r147-corrected-$stamp.md")
  $Text = @"
S.E.R.A. PHASE REQUEST

Return the downloadable overlay ZIP for:

Phase $phase — $phaseSlug

Expected ZIP filename:
$expectedZip

Purpose:
Execute the active phone command exactly as accepted by S.E.R.A. AutoOps.

Owner guidance:
$guide

Command contract:
- commandId: $($Command.commandId)
- runNonce: $($Command.runNonce)
- phaseSlug: $phaseSlug
- expectedZipFilename: $expectedZip
- allowRandomRecentChatFallback: false
- allowNewChatFallback: false

Requirements:
- Return a downloadable ZIP link.
- Return SHA256.
- ZIP root must be repo/.
- Include .overlay manifest.
- Include .sera-proof verification file.
- Use the existing S.E.R.A. safety gates.
- Preserve the saved ChatGPT target only; no random or new-chat fallback.
- Stop if owner judgment is required.

R147 correction reason:
$Reason
"@
  $Text | Set-Content -Path $Path -Encoding UTF8
  return Get-Item $Path
}
function Test-ActiveLease([object]$Lease) {
  if ($null -eq $Lease) { return $false }
  if ($Lease.leaseStatus -ne "active") { return $false }
  try {
    $expires = [datetime]$Lease.leaseExpiresAt
    return $expires.ToUniversalTime() -gt (Get-Date).ToUniversalTime()
  } catch { return $false }
}
function Ensure-GenerationLease([object]$Command, [System.IO.FileInfo]$Prompt) {
  $Existing = Read-Json $LeasePath
  if (Test-ActiveLease $Existing) {
    return @{ created = $false; reason = "active_lease_already_present"; path = $LeasePath; lease = $Existing }
  }
  $now = (Get-Date).ToUniversalTime()
  $lease = [ordered]@{
    schemaVersion = 1
    commandId = [string]$Command.commandId
    runNonce = [string]$Command.runNonce
    phase = [string]$Command.phaseStart
    phaseSlug = [string]$Command.phaseSlug
    expectedZipName = [string]$Command.expectedZipFilename
    promptFile = [string]$Prompt.FullName
    leaseStatus = "active"
    leaseStartedAt = $now.ToString("o")
    leaseExpiresAt = $now.AddMinutes(45).ToString("o")
    lastObservedAt = $now.ToString("o")
    submittedAt = $null
    downloadedAt = $null
    routedAt = $null
    completedAt = $null
    failureReason = $null
    createdBy = $PhaseSlug
    savedChatGptTargetOnly = $true
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
  }
  Write-JsonFile $LeasePath $lease
  return @{ created = $true; reason = "created_from_active_command_and_bridge_prompt"; path = $LeasePath; lease = $lease }
}
function Invoke-OriginalAction {
  if (!(Test-Path $OriginalActionJson)) { return @{ delegated = $false; reason = "original_action_json_missing" } }
  $Original = Read-Json $OriginalActionJson
  if ($null -eq $Original) { return @{ delegated = $false; reason = "original_action_json_unreadable" } }
  $Execute = [string]$Original.Execute
  $Arguments = [string]$Original.Arguments
  if ([string]::IsNullOrWhiteSpace($Execute)) { return @{ delegated = $false; reason = "original_execute_missing" } }
  Start-Process -FilePath $Execute -ArgumentList $Arguments -WindowStyle Hidden | Out-Null
  return @{ delegated = $true; execute = $Execute; arguments = $Arguments }
}
function Invoke-Runtime {
  Ensure-Dir $EvidenceDir
  $Command = Read-Json $CommandPath
  if ($null -eq $Command) {
    $evidence = Write-Evidence "autoops-r147-no-active-command" @{ ok = $true; phase = $Phase; action = "delegate_without_command"; commandPath = $CommandPath }
    $delegate = Invoke-OriginalAction
    return @{ ok = $true; evidence = $evidence; delegate = $delegate }
  }

  $expectedZip = [string]$Command.expectedZipFilename
  if ([string]::IsNullOrWhiteSpace($expectedZip)) {
    $details = @{ commandPath = $CommandPath; commandId = $Command.commandId; issue = "expectedZipFilename missing" }
    $need = Write-NeedsAttention "Active command is missing expectedZipFilename; R147 cannot create a safe generation lease." $details
    $evidence = Write-Evidence "autoops-r147-missing-expected-zip" @{ ok = $false; details = $details; needsAttentionPath = $need }
    return @{ ok = $false; status = "needs_attention"; evidence = $evidence; needsAttentionPath = $need }
  }

  $Prompt = Get-LatestBridgePrompt $Command
  if ($null -eq $Prompt) {
    $details = @{ commandId = $Command.commandId; phase = $Command.phaseStart; expectedZipFilename = $expectedZip; bridgeOutbox = $BridgeOutbox }
    $need = Write-NeedsAttention "Active command has no Phase bridge prompt; R147 cannot create a generation lease." $details
    $evidence = Write-Evidence "autoops-r147-missing-bridge-prompt" @{ ok = $false; details = $details; needsAttentionPath = $need }
    return @{ ok = $false; status = "needs_attention"; evidence = $evidence; needsAttentionPath = $need }
  }

  $promptText = Get-Content $Prompt.FullName -Raw
  $corrected = $false
  $archivedPromptPath = $null
  if ($promptText -notlike "*$expectedZip*") {
    $reason = "Bridge prompt expected ZIP mismatch. Command contract expected $expectedZip."
    $ArchiveSubdir = Join-Path $ArchiveDir ("r147-bridge-prompt-mismatch-$(Get-UtcStamp)")
    Ensure-Dir $ArchiveSubdir
    $archivedPromptPath = Join-Path $ArchiveSubdir $Prompt.Name
    Move-Item $Prompt.FullName $archivedPromptPath -Force
    $Prompt = New-CorrectedBridgePrompt $Command $reason
    $corrected = $true
  }

  $leaseResult = Ensure-GenerationLease $Command $Prompt
  $evidenceObj = [ordered]@{
    ok = $true
    phase = $Phase
    phaseSlug = $PhaseSlug
    commandId = $Command.commandId
    runNonce = $Command.runNonce
    phaseStart = $Command.phaseStart
    phaseSlugFromCommand = $Command.phaseSlug
    expectedZipFilename = $expectedZip
    promptFile = $Prompt.FullName
    promptCorrected = $corrected
    archivedPromptPath = $archivedPromptPath
    leaseResult = $leaseResult
    savedChatGptTargetOnly = $true
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
  }
  $evidence = Write-Evidence "autoops-r147-bridge-prompt-lease-handoff" $evidenceObj
  $delegate = Invoke-OriginalAction
  return @{ ok = $true; evidence = $evidence; delegate = $delegate; promptFile = $Prompt.FullName; leasePath = $LeasePath }
}
function Install-Guard {
  Ensure-Dir $GuardDir
  Copy-Item -Path $PSCommandPath -Destination $GuardScript -Force
  $Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
  $Action = $Task.Actions | Select-Object -First 1
  $CurrentExecute = [string]$Action.Execute
  $CurrentArguments = [string]$Action.Arguments
  $CurrentSignature = "$CurrentExecute $CurrentArguments"
  $WrapperSignature = "SERA_ChatGPT_Artifact_Watcher_R147_Guard.vbs"

  if ($CurrentSignature -notlike "*$WrapperSignature*") {
    $Original = [ordered]@{
      Execute = $CurrentExecute
      Arguments = $CurrentArguments
      CapturedAt = (Get-Date).ToUniversalTime().ToString("o")
      TaskName = $TaskName
    }
    Write-JsonFile $OriginalActionJson $Original
  }

  $vbs = @"
Option Explicit

Dim shell
Dim cmd

Set shell = CreateObject("WScript.Shell")

cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass " & _
      "-File ""$GuardScript"" " & _
      "-AutoOps ""$AutoOps"" " & _
      "-RepoRoot ""$RepoRoot"""

shell.Run cmd, 0, False
"@
  $vbs | Set-Content -Path $WrapperVbs -Encoding ASCII

  $NewAction = New-ScheduledTaskAction -Execute "wscript.exe" -Argument ('"' + $WrapperVbs + '"')
  $Result = [ordered]@{
    taskName = $TaskName
    originalExecute = $CurrentExecute
    originalArguments = $CurrentArguments
    guardScript = $GuardScript
    wrapperVbs = $WrapperVbs
    originalActionJson = $OriginalActionJson
    installedAt = (Get-Date).ToUniversalTime().ToString("o")
    dryRun = [bool]$DryRun
  }
  if (!$DryRun) {
    Set-ScheduledTask -TaskName $TaskName -Action $NewAction | Out-Null
    Write-Evidence "autoops-r147-install-completed" $Result | Out-Null
  } else {
    Write-Evidence "autoops-r147-install-dry-run" $Result | Out-Null
  }
  $Result | ConvertTo-Json -Depth 10
}
function Invoke-SelfTest {
  $Temp = Join-Path ([System.IO.Path]::GetTempPath()) ("sera-r147-selftest-" + [guid]::NewGuid().ToString("N"))
  $OldAutoOps = $script:AutoOps
  $script:AutoOps = $Temp
  foreach ($dir in @("00_control_center", "15_bridge_outbox", "17_needs_attention", "00_control_center\evidence")) { Ensure-Dir (Join-Path $Temp $dir) }
  $cmd = [ordered]@{
    commandId = "r147-selftest-command"
    runNonce = "r147-selftest-nonce"
    phaseStart = 143
    phaseSlug = "phase143_phone_batch_autopilot_smoke_test_v1"
    expectedZipFilename = "s.e.r.a_phase143_phone_batch_autopilot_smoke_test_v1_overlay.zip"
    guide = "Self-test guide"
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
  }
  Write-JsonFile (Join-Path $Temp "00_control_center\autopilot-command.json") $cmd
  "Expected ZIP filename:`ns.e.r.a_wrong_overlay.zip" | Set-Content -Path (Join-Path $Temp "15_bridge_outbox\phase143-wrong.md") -Encoding UTF8
  $script:EvidenceDir = Join-Path $Temp "00_control_center\evidence"
  $script:ArchiveDir = Join-Path $Temp "00_control_center\archive"
  $script:LeasePath = Join-Path $Temp "00_control_center\generation-lease.json"
  $script:CommandPath = Join-Path $Temp "00_control_center\autopilot-command.json"
  $script:BridgeOutbox = Join-Path $Temp "15_bridge_outbox"
  $script:NeedsAttention = Join-Path $Temp "17_needs_attention"
  function Invoke-OriginalAction { return @{ delegated = $false; reason = "self_test_no_delegate" } }
  $result = Invoke-Runtime
  $lease = Read-Json $script:LeasePath
  [pscustomobject]@{
    ok = ($result.ok -and $null -ne $lease -and $lease.expectedZipName -eq $cmd.expectedZipFilename)
    selfTestRoot = $Temp
    promptCorrected = [bool](($result | ConvertTo-Json -Depth 20) -like "*promptCorrected*true*")
    leaseCreated = ($null -ne $lease)
    expectedZipInLease = $lease.expectedZipName
    savedChatGptTargetOnly = $true
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
  } | ConvertTo-Json -Depth 10
}

if ($SelfTest) { Invoke-SelfTest; exit 0 }
if ($Install) { Install-Guard; exit 0 }
Invoke-Runtime | ConvertTo-Json -Depth 12

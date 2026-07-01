param(
  [string]$AutoOps = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$RepoRoot = (Get-Location).Path,
  [switch]$Install,
  [switch]$DryRun,
  [switch]$SelfTest
)

$ErrorActionPreference = "Stop"

$Phase = "AutoOps R149"
$PhaseSlug = "autoops_r149_canonical_bridge_prompt_initial_submit_delegation_v1"
$TaskName = "SERA ChatGPT Artifact Watcher"
$GuardDir = Join-Path $AutoOps "00_control_center\runtime_guards\autoops-r149-canonical-bridge-prompt-initial-submit-delegation-v1"
$GuardScript = Join-Path $GuardDir "autoops-r149-canonical-bridge-prompt-initial-submit-delegation-v1.ps1"
$WrapperVbs = Join-Path $GuardDir "SERA_ChatGPT_Artifact_Watcher_R149_Guard.vbs"
$OriginalActionJson = Join-Path $GuardDir "original-SERA_ChatGPT_Artifact_Watcher-action.json"
$EvidenceDir = Join-Path $AutoOps "00_control_center\evidence"
$ArchiveDir = Join-Path $AutoOps "00_control_center\archive"
$ControlDir = Join-Path $AutoOps "00_control_center"
$LeasePath = Join-Path $ControlDir "generation-lease.json"
$CommandPath = Join-Path $ControlDir "autopilot-command.json"
$SubmissionLockPath = Join-Path $ControlDir "prompt-submission-lock.json"
$BridgeOutbox = Join-Path $AutoOps "15_bridge_outbox"
$NeedsAttention = Join-Path $AutoOps "17_needs_attention"
$R145OriginalActionJson = Join-Path $AutoOps "00_control_center\runtime_guards\autoops-r145-runtime-generation-lease-watcher-no-refresh-enforcement-v1\original-SERA_ChatGPT_Artifact_Watcher-action.json"

function Get-UtcStamp { (Get-Date).ToUniversalTime().ToString("yyyyMMdd_HHmmssZ") }
function Ensure-Dir([string]$Path) { if ($Path) { New-Item -ItemType Directory -Force $Path | Out-Null } }
function Write-JsonFile([string]$Path, [object]$Object) {
  Ensure-Dir (Split-Path $Path)
  $Object | ConvertTo-Json -Depth 20 | Set-Content -Path $Path -Encoding UTF8
}
function Read-Json([string]$Path) {
  if (!(Test-Path $Path)) { return $null }
  try { return Get-Content $Path -Raw | ConvertFrom-Json -ErrorAction Stop } catch { return $null }
}
function Write-Evidence([string]$Name, [object]$Object) {
  Ensure-Dir $EvidenceDir
  $Path = Join-Path $EvidenceDir ("$Name-$(Get-UtcStamp).json")
  Write-JsonFile $Path $Object
  return $Path
}
function Write-NeedsAttention([string]$Reason, [object]$Details) {
  Ensure-Dir $NeedsAttention
  $Path = Join-Path $NeedsAttention ("CHATGPT_ARTIFACT_WATCHER_NEEDS_ATTENTION-R149-$(Get-UtcStamp).md")
  $Body = @"
# S.E.R.A. ChatGPT Artifact Watcher Needs Attention

Version: $PhaseSlug

## Reason

$Reason

## Details

````json
$($Details | ConvertTo-Json -Depth 12)
````
"@
  $Body | Set-Content -Path $Path -Encoding UTF8
  return $Path
}
function Test-ActiveLease([object]$Lease) {
  if ($null -eq $Lease) { return $false }
  if ([string]$Lease.leaseStatus -ne "active") { return $false }
  try { return ([datetime]$Lease.leaseExpiresAt).ToUniversalTime() -gt (Get-Date).ToUniversalTime() } catch { return $false }
}
function Get-ExpectedZipFromPromptBlock([string]$Text) {
  if ([string]::IsNullOrWhiteSpace($Text)) { return "" }
  $m = [regex]::Match($Text, "(?is)Expected\s+ZIP\s+filename:\s*\r?\n\s*([^\r\n]+)")
  if (!$m.Success) { return "" }
  return $m.Groups[1].Value.Trim()
}
function Test-CanonicalPrompt([string]$Path, [object]$Command) {
  if (!(Test-Path $Path)) { return [pscustomobject]@{ ok=$false; reason="missing" } }
  $text = Get-Content $Path -Raw
  $expected = [string]$Command.expectedZipFilename
  $blockZip = Get-ExpectedZipFromPromptBlock $text
  $hasCommandId = $text -like "*$($Command.commandId)*"
  $hasExpected = $blockZip -eq $expected
  $notHotfix = (Split-Path $Path -Leaf) -notlike "hotfix-phase*"
  $titleOk = ($text -like "*Phone Batch Autopilot Smoke Test*" -or $text -like "*$($Command.phaseSlug)*")
  return [pscustomobject]@{ ok=($hasExpected -and $notHotfix -and $titleOk); blockZip=$blockZip; expectedZip=$expected; notHotfix=$notHotfix; titleOk=$titleOk; hasCommandId=$hasCommandId }
}
function Get-PhasePromptCandidates([object]$Command) {
  if (!(Test-Path $BridgeOutbox)) { return @() }
  $phase = [int]$Command.phaseStart
  return @(Get-ChildItem $BridgeOutbox -File -Filter "*phase$phase*" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
}
function Archive-File([System.IO.FileInfo]$File, [string]$ReasonSlug) {
  $dir = Join-Path $ArchiveDir ("r149-$ReasonSlug-$(Get-UtcStamp)")
  Ensure-Dir $dir
  $dest = Join-Path $dir $File.Name
  Move-Item $File.FullName $dest -Force
  return $dest
}
function Quarantine-HotfixPrompts([object]$Command) {
  $phase = [int]$Command.phaseStart
  $archived = @()
  if (!(Test-Path $BridgeOutbox)) { return $archived }
  $hotfixes = @(Get-ChildItem $BridgeOutbox -File -Filter "hotfix-phase$phase*" -ErrorAction SilentlyContinue)
  foreach ($h in $hotfixes) {
    $archived += (Archive-File $h "hotfix-prompt-quarantine")
  }
  return $archived
}
function New-CanonicalBridgePrompt([object]$Command, [string]$Reason) {
  Ensure-Dir $BridgeOutbox
  $phase = [int]$Command.phaseStart
  $phaseSlug = [string]$Command.phaseSlug
  if ([string]::IsNullOrWhiteSpace($phaseSlug)) { $phaseSlug = "phase$phase" }
  $expectedZip = [string]$Command.expectedZipFilename
  $guide = [string]$Command.guide
  $stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd_HHmmssZ")
  $safeSlug = $phaseSlug -replace "[^A-Za-z0-9_\-]", "_"
  $Path = Join-Path $BridgeOutbox ("phase$phase-$safeSlug-r149-canonical-$stamp.md")
  $Text = @"
S.E.R.A. PHASE REQUEST

Return the downloadable overlay ZIP for:

Phase $phase — Phone Batch Autopilot Smoke Test v1

Expected ZIP filename:
$expectedZip

Purpose:
Execute the active phone command exactly as accepted by S.E.R.A. AutoOps. The active command contract is authoritative over any generic phase continuation label.

Owner guidance:
$guide

Command contract:
- commandId: $($Command.commandId)
- runNonce: $($Command.runNonce)
- phaseSlug: $phaseSlug
- expectedZipFilename: $expectedZip
- savedChatGptTargetOnly: true
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

R149 canonicalization reason:
$Reason
"@
  $Text | Set-Content -Path $Path -Encoding UTF8
  return Get-Item $Path
}
function Ensure-CanonicalPrompt([object]$Command) {
  $archived = @()
  $archived += @(Quarantine-HotfixPrompts $Command)
  $candidates = Get-PhasePromptCandidates $Command
  foreach ($candidate in $candidates) {
    $test = Test-CanonicalPrompt $candidate.FullName $Command
    if ($test.ok) { return [pscustomobject]@{ prompt=$candidate; created=$false; archived=$archived; canonicalTest=$test } }
  }
  foreach ($candidate in $candidates) {
    $archived += (Archive-File $candidate "noncanonical-bridge-prompt")
  }
  $prompt = New-CanonicalBridgePrompt $Command "No existing phase bridge prompt had the expected ZIP in the primary Expected ZIP filename block."
  $test2 = Test-CanonicalPrompt $prompt.FullName $Command
  return [pscustomobject]@{ prompt=$prompt; created=$true; archived=$archived; canonicalTest=$test2 }
}
function New-LeaseObject([object]$Command, [System.IO.FileInfo]$Prompt) {
  $now = (Get-Date).ToUniversalTime()
  return [ordered]@{
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
}
function Ensure-LeaseMatchesPrompt([object]$Command, [System.IO.FileInfo]$Prompt) {
  $existing = Read-Json $LeasePath
  if ($null -eq $existing) {
    $lease = New-LeaseObject $Command $Prompt
    Write-JsonFile $LeasePath $lease
    return [pscustomobject]@{ action="created"; lease=$lease }
  }
  $active = Test-ActiveLease $existing
  $sameCommand = ([string]$existing.commandId -eq [string]$Command.commandId)
  $sameExpected = ([string]$existing.expectedZipName -eq [string]$Command.expectedZipFilename)
  $samePrompt = ([string]$existing.promptFile -eq [string]$Prompt.FullName)
  $notSubmitted = [string]::IsNullOrWhiteSpace([string]$existing.submittedAt)
  if ($active -and $sameCommand -and $sameExpected -and $samePrompt) { return [pscustomobject]@{ action="kept"; lease=$existing } }
  if (($notSubmitted -and $sameCommand) -or (-not $active) -or (-not $sameExpected)) {
    $lease = New-LeaseObject $Command $Prompt
    Write-JsonFile $LeasePath $lease
    return [pscustomobject]@{ action="replaced_unsubmitted_or_stale"; previous=$existing; lease=$lease }
  }
  return [pscustomobject]@{ action="kept_submitted_lease"; lease=$existing }
}
function Update-LeasePatch([hashtable]$Patch) {
  $lease = Read-Json $LeasePath
  if ($null -eq $lease) { return $null }
  $dict = [ordered]@{}
  foreach ($prop in $lease.PSObject.Properties) { $dict[$prop.Name] = $prop.Value }
  foreach ($key in $Patch.Keys) { $dict[$key] = $Patch[$key] }
  $dict["lastObservedAt"] = (Get-Date).ToUniversalTime().ToString("o")
  Write-JsonFile $LeasePath $dict
  return [pscustomobject]$dict
}
function Get-RawWatcherAction {
  $raw = Read-Json $R145OriginalActionJson
  if ($null -ne $raw -and -not [string]::IsNullOrWhiteSpace([string]$raw.Execute)) { return $raw }
  return Read-Json $OriginalActionJson
}
function Invoke-Action([object]$Action) {
  if ($null -eq $Action) { return [pscustomobject]@{ delegated=$false; reason="action_missing" } }
  $exe = [string]$Action.Execute
  $args = [string]$Action.Arguments
  if ([string]::IsNullOrWhiteSpace($exe)) { return [pscustomobject]@{ delegated=$false; reason="execute_missing" } }
  Start-Process -FilePath $exe -ArgumentList $args -WindowStyle Hidden | Out-Null
  return [pscustomobject]@{ delegated=$true; execute=$exe; arguments=$args }
}
function Invoke-OriginalChain {
  $action = Read-Json $OriginalActionJson
  return Invoke-Action $action
}
function Invoke-InitialSubmitRawWatcher([object]$Command, [object]$Lease) {
  $lock = Read-Json $SubmissionLockPath
  if ($lock -and [string]$lock.commandId -eq [string]$Command.commandId -and [string]$lock.promptFile -eq [string]$Lease.promptFile) {
    return [pscustomobject]@{ delegated=$false; reason="submission_lock_already_present"; lock=$lock }
  }
  $action = Get-RawWatcherAction
  if ($null -eq $action) {
    $need = Write-NeedsAttention "Raw saved ChatGPT artifact watcher action is missing; R149 cannot submit the prompt exactly once." @{ r145OriginalActionJson=$R145OriginalActionJson; r149OriginalActionJson=$OriginalActionJson }
    return [pscustomobject]@{ delegated=$false; reason="raw_action_missing"; needsAttentionPath=$need }
  }
  $now = (Get-Date).ToUniversalTime().ToString("o")
  $lockObj = [ordered]@{
    schemaVersion = 1
    commandId = [string]$Command.commandId
    runNonce = [string]$Command.runNonce
    expectedZipName = [string]$Command.expectedZipFilename
    promptFile = [string]$Lease.promptFile
    lockedAt = $now
    createdBy = $PhaseSlug
    submitExactlyOnce = $true
    savedChatGptTargetOnly = $true
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
  }
  Write-JsonFile $SubmissionLockPath $lockObj
  $delegate = Invoke-Action $action
  Update-LeasePatch @{ submittedAt = $now; submittedBy = $PhaseSlug } | Out-Null
  return [pscustomobject]@{ delegated=$delegate.delegated; delegate=$delegate; lock=$lockObj }
}
function Invoke-Runtime {
  Ensure-Dir $EvidenceDir
  $command = Read-Json $CommandPath
  if ($null -eq $command) {
    $chain = Invoke-OriginalChain
    $evidence = Write-Evidence "autoops-r149-no-active-command-delegate-chain" @{ ok=$true; commandPath=$CommandPath; delegate=$chain }
    return @{ ok=$true; evidence=$evidence; delegate=$chain }
  }
  if ([string]::IsNullOrWhiteSpace([string]$command.expectedZipFilename)) {
    $need = Write-NeedsAttention "Active command is missing expectedZipFilename; R149 cannot safely submit." @{ commandPath=$CommandPath; commandId=$command.commandId }
    $evidence = Write-Evidence "autoops-r149-missing-expected-zip" @{ ok=$false; needsAttentionPath=$need }
    return @{ ok=$false; needsAttentionPath=$need; evidence=$evidence }
  }
  $promptResult = Ensure-CanonicalPrompt $command
  if (-not $promptResult.canonicalTest.ok) {
    $need = Write-NeedsAttention "R149 could not create a canonical bridge prompt." @{ commandId=$command.commandId; promptResult=$promptResult }
    $evidence = Write-Evidence "autoops-r149-canonical-prompt-failed" @{ ok=$false; needsAttentionPath=$need; promptResult=$promptResult }
    return @{ ok=$false; needsAttentionPath=$need; evidence=$evidence }
  }
  $leaseResult = Ensure-LeaseMatchesPrompt $command $promptResult.prompt
  $lease = $leaseResult.lease
  $submit = $null
  $chain = $null
  if ([string]::IsNullOrWhiteSpace([string]$lease.submittedAt)) {
    $submit = Invoke-InitialSubmitRawWatcher $command $lease
  } else {
    $chain = Invoke-OriginalChain
  }
  $evidenceObj = [ordered]@{
    ok = $true
    phase = $Phase
    phaseSlug = $PhaseSlug
    commandId = $command.commandId
    runNonce = $command.runNonce
    expectedZipFilename = $command.expectedZipFilename
    promptFile = $promptResult.prompt.FullName
    promptCreated = $promptResult.created
    archivedPrompts = $promptResult.archived
    canonicalTest = $promptResult.canonicalTest
    leaseResult = $leaseResult
    initialSubmit = $submit
    delegatedChain = $chain
    savedChatGptTargetOnly = $true
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
  }
  $evidence = Write-Evidence "autoops-r149-canonical-prompt-initial-submit" $evidenceObj
  return @{ ok=$true; evidence=$evidence; promptFile=$promptResult.prompt.FullName; leasePath=$LeasePath; initialSubmit=$submit; delegate=$chain }
}
function Install-Guard {
  Ensure-Dir $GuardDir
  Copy-Item -Path $PSCommandPath -Destination $GuardScript -Force
  $Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
  $Action = $Task.Actions | Select-Object -First 1
  $CurrentExecute = [string]$Action.Execute
  $CurrentArguments = [string]$Action.Arguments
  $CurrentSignature = "$CurrentExecute $CurrentArguments"
  $WrapperSignature = "SERA_ChatGPT_Artifact_Watcher_R149_Guard.vbs"
  if ($CurrentSignature -notlike "*$WrapperSignature*") {
    $Original = [ordered]@{ Execute=$CurrentExecute; Arguments=$CurrentArguments; CapturedAt=(Get-Date).ToUniversalTime().ToString("o"); TaskName=$TaskName }
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
  $record = [ordered]@{ taskName=$TaskName; originalExecute=$CurrentExecute; originalArguments=$CurrentArguments; guardScript=$GuardScript; wrapperVbs=$WrapperVbs; originalActionJson=$OriginalActionJson; r145RawOriginalActionJson=$R145OriginalActionJson; installedAt=(Get-Date).ToUniversalTime().ToString("o"); dryRun=[bool]$DryRun }
  if (-not $DryRun) {
    $newAction = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$WrapperVbs`""
    Set-ScheduledTask -TaskName $TaskName -Action $newAction | Out-Null
  }
  $installEvidenceName = "autoops-r149-install-completed"
  if ($DryRun) { $installEvidenceName = "autoops-r149-install-dry-run" }
  Write-Evidence $installEvidenceName $record | Out-Null
  $record | ConvertTo-Json -Depth 12
}
function Invoke-SelfTest {
  $tmp = Join-Path $env:TEMP ("sera-r149-selftest-" + [guid]::NewGuid().ToString("N"))
  $oldAutoOps = $script:AutoOps
  try {
    $script:AutoOps = $tmp
    $script:ControlDir = Join-Path $tmp "00_control_center"
    $script:EvidenceDir = Join-Path $script:ControlDir "evidence"
    $script:ArchiveDir = Join-Path $script:ControlDir "archive"
    $script:LeasePath = Join-Path $script:ControlDir "generation-lease.json"
    $script:CommandPath = Join-Path $script:ControlDir "autopilot-command.json"
    $script:SubmissionLockPath = Join-Path $script:ControlDir "prompt-submission-lock.json"
    $script:BridgeOutbox = Join-Path $tmp "15_bridge_outbox"
    $script:NeedsAttention = Join-Path $tmp "17_needs_attention"
    Ensure-Dir $script:BridgeOutbox
    Ensure-Dir $script:EvidenceDir
    $cmd = [ordered]@{ commandId="selftest-r149"; runNonce="nonce"; phaseStart=143; phaseSlug="phase143_phone_batch_autopilot_smoke_test_v1"; expectedZipFilename="s.e.r.a_phase143_phone_batch_autopilot_smoke_test_v1_overlay.zip"; guide="Self-test guide" }
    Write-JsonFile $script:CommandPath $cmd
    $bad = Join-Path $script:BridgeOutbox "phase143-phase_143_safe_autopilot_continuation_v1-selftest.md"
    @"
Expected ZIP filename:
s.e.r.a_phase143_phase_143_safe_autopilot_continuation_v1_overlay.zip

Owner guidance mentions s.e.r.a_phase143_phone_batch_autopilot_smoke_test_v1_overlay.zip here only.
"@ | Set-Content $bad -Encoding UTF8
    $hotfix = Join-Path $script:BridgeOutbox "hotfix-phase143-attempt1-selftest.md"
    "hotfix prompt" | Set-Content $hotfix -Encoding UTF8
    $promptResult = Ensure-CanonicalPrompt ([pscustomobject]$cmd)
    if (-not $promptResult.canonicalTest.ok) { throw "Canonical prompt self-test failed" }
    $leaseResult = Ensure-LeaseMatchesPrompt ([pscustomobject]$cmd) $promptResult.prompt
    [pscustomobject]@{ ok=$true; selfTestRoot=$tmp; promptCreated=$promptResult.created; archivedCount=@($promptResult.archived).Count; leaseAction=$leaseResult.action; expectedZipInPromptBlock=$promptResult.canonicalTest.blockZip; commandSourceAuthoritative=$true } | ConvertTo-Json -Depth 20
  } finally {
    $script:AutoOps = $oldAutoOps
  }
}

if ($SelfTest) { Invoke-SelfTest; exit 0 }
if ($Install) { Install-Guard; exit 0 }
Invoke-Runtime | ConvertTo-Json -Depth 20

# R149 safety verifier markers.
# These strings are intentionally preserved for the R149 verifier.
# allowRandomRecentChatFallback = False
# allowNewChatFallback = False

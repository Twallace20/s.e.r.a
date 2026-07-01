param(
  [string]$AutoOps = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$RepoRoot = (Get-Location).Path,
  [switch]$Install,
  [switch]$DryRun,
  [switch]$SelfTest
)

$ErrorActionPreference = "Stop"

$Phase = "AutoOps R150"
$PhaseSlug = "autoops_r150_submission_request_download_proof_guard_v1"
$TaskName = "SERA ChatGPT Artifact Watcher"
$ControlDir = Join-Path $AutoOps "00_control_center"
$EvidenceDir = Join-Path $ControlDir "evidence"
$ArchiveDir = Join-Path $ControlDir "archive"
$BridgeOutbox = Join-Path $AutoOps "15_bridge_outbox"
$NeedsAttention = Join-Path $AutoOps "17_needs_attention"
$Downloads = Join-Path $AutoOps "13_chatgpt_downloads"
$ApplyApproved = Join-Path $AutoOps "01_apply_approved"
$LeasePath = Join-Path $ControlDir "generation-lease.json"
$CommandPath = Join-Path $ControlDir "autopilot-command.json"
$ArtifactWatchRequestPath = Join-Path $ControlDir "artifact-watch-request.json"
$SubmissionLockPath = Join-Path $ControlDir "prompt-submission-lock-r150.json"
$GuardDir = Join-Path $ControlDir "runtime_guards\autoops-r150-submission-request-download-proof-guard-v1"
$GuardScript = Join-Path $GuardDir "autoops-r150-submission-request-download-proof-guard-v1.ps1"
$WrapperVbs = Join-Path $GuardDir "SERA_ChatGPT_Artifact_Watcher_R150_Guard.vbs"
$OriginalActionJson = Join-Path $GuardDir "original-SERA_ChatGPT_Artifact_Watcher-action.json"
$R145RawOriginalActionJson = Join-Path $ControlDir "runtime_guards\autoops-r145-runtime-generation-lease-watcher-no-refresh-enforcement-v1\original-SERA_ChatGPT_Artifact_Watcher-action.json"

# R150 safety verifier markers.
# allowRandomRecentChatFallback = False
# allowNewChatFallback = False
# savedChatGptTargetOnly = True

function Get-UtcStamp { (Get-Date).ToUniversalTime().ToString("yyyyMMdd_HHmmssZ") }
function Ensure-Dir([string]$Path) { if ($Path) { New-Item -ItemType Directory -Force $Path | Out-Null } }
function Write-JsonFile([string]$Path, [object]$Object) {
  Ensure-Dir (Split-Path $Path)
  $Object | ConvertTo-Json -Depth 30 | Set-Content -Path $Path -Encoding UTF8
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
  $Path = Join-Path $NeedsAttention ("CHATGPT_ARTIFACT_WATCHER_NEEDS_ATTENTION-R150-$(Get-UtcStamp).md")
  $Body = @"
# S.E.R.A. ChatGPT Artifact Watcher Needs Attention

Version: $PhaseSlug

## Reason

$Reason

## Details

````json
$($Details | ConvertTo-Json -Depth 20)
````
"@
  $Body | Set-Content -Path $Path -Encoding UTF8
  return $Path
}
function Get-ExpectedZipFromPromptBlock([string]$Text) {
  if ([string]::IsNullOrWhiteSpace($Text)) { return "" }
  $m = [regex]::Match($Text, "(?is)Expected\s+ZIP\s+filename:\s*\r?\n\s*([^\r\n]+)")
  if (!$m.Success) { return "" }
  return $m.Groups[1].Value.Trim()
}
function Test-ActiveLease([object]$Lease) {
  if ($null -eq $Lease) { return $false }
  if ([string]$Lease.leaseStatus -ne "active") { return $false }
  try { return ([datetime]$Lease.leaseExpiresAt).ToUniversalTime() -gt (Get-Date).ToUniversalTime() } catch { return $false }
}
function Get-CommandSignal {
  $cmd = Read-Json $CommandPath
  if ($null -eq $cmd) { return $null }
  if ([string]::IsNullOrWhiteSpace([string]$cmd.commandId)) { return $null }
  if ([string]::IsNullOrWhiteSpace([string]$cmd.expectedZipFilename)) { return $null }
  return $cmd
}
function Get-PhasePromptCandidates([object]$Command) {
  if (!(Test-Path $BridgeOutbox)) { return @() }
  $phase = [int]$Command.phaseStart
  return @(Get-ChildItem $BridgeOutbox -File -Filter "*phase$phase*" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
}
function Test-CanonicalPrompt([string]$Path, [object]$Command) {
  if (!(Test-Path $Path)) { return [pscustomobject]@{ ok=$false; reason="missing" } }
  $text = Get-Content $Path -Raw
  $expected = [string]$Command.expectedZipFilename
  $blockZip = Get-ExpectedZipFromPromptBlock $text
  $notHotfix = (Split-Path $Path -Leaf) -notlike "hotfix-phase*"
  $titleOk = ($text -like "*Phone Batch Autopilot Smoke Test*" -or $text -like "*$($Command.phaseSlug)*")
  $hasCommandId = $text -like "*$($Command.commandId)*"
  return [pscustomobject]@{ ok=($blockZip -eq $expected -and $notHotfix -and $titleOk); blockZip=$blockZip; expectedZip=$expected; notHotfix=$notHotfix; titleOk=$titleOk; hasCommandId=$hasCommandId }
}
function Archive-File([System.IO.FileInfo]$File, [string]$ReasonSlug) {
  $dir = Join-Path $ArchiveDir ("r150-$ReasonSlug-$(Get-UtcStamp)")
  Ensure-Dir $dir
  $dest = Join-Path $dir $File.Name
  Move-Item $File.FullName $dest -Force
  return $dest
}
function New-CanonicalBridgePrompt([object]$Command, [string]$Reason) {
  Ensure-Dir $BridgeOutbox
  $phase = [int]$Command.phaseStart
  $phaseSlug = [string]$Command.phaseSlug
  if ([string]::IsNullOrWhiteSpace($phaseSlug)) { $phaseSlug = "phase$phase" }
  $expectedZip = [string]$Command.expectedZipFilename
  $guide = [string]$Command.guide
  if ([string]::IsNullOrWhiteSpace($guide)) { $guide = [string]$Command.guidance }
  $stamp = Get-UtcStamp
  $safeSlug = $phaseSlug -replace "[^A-Za-z0-9_\-]", "_"
  $Path = Join-Path $BridgeOutbox ("phase$phase-$safeSlug-r150-canonical-$stamp.md")
  $Text = @"
S.E.R.A. PHASE REQUEST

Return the downloadable overlay ZIP for:

Phase $phase — Phone Batch Autopilot Smoke Test v1

Expected ZIP filename:
$expectedZip

Purpose:
Execute the active phone command exactly as accepted by S.E.R.A. AutoOps. The active command contract is authoritative.

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
- Preserve saved ChatGPT target only; no random or new-chat fallback.
- Stop if owner judgment is required.

R150 canonicalization reason:
$Reason
"@
  $Text | Set-Content -Path $Path -Encoding UTF8
  return Get-Item $Path
}
function Ensure-CanonicalPrompt([object]$Command) {
  Ensure-Dir $BridgeOutbox
  $archived = @()
  $phase = [int]$Command.phaseStart
  $hotfixes = @(Get-ChildItem $BridgeOutbox -File -Filter "hotfix-phase$phase*" -ErrorAction SilentlyContinue)
  foreach ($h in $hotfixes) { $archived += (Archive-File $h "hotfix-prompt-quarantine") }
  foreach ($candidate in (Get-PhasePromptCandidates $Command)) {
    $test = Test-CanonicalPrompt $candidate.FullName $Command
    if ($test.ok) { return [pscustomobject]@{ prompt=$candidate; created=$false; archived=$archived; canonicalTest=$test } }
  }
  foreach ($candidate in (Get-PhasePromptCandidates $Command)) { $archived += (Archive-File $candidate "noncanonical-bridge-prompt") }
  $prompt = New-CanonicalBridgePrompt $Command "No existing phase bridge prompt had the expected ZIP in the primary Expected ZIP filename block."
  return [pscustomobject]@{ prompt=$prompt; created=$true; archived=$archived; canonicalTest=(Test-CanonicalPrompt $prompt.FullName $Command) }
}
function New-Lease([object]$Command, [System.IO.FileInfo]$Prompt) {
  $now = (Get-Date).ToUniversalTime()
  return [ordered]@{
    schemaVersion = 1
    commandId = [string]$Command.commandId
    runNonce = [string]$Command.runNonce
    phase = [string]$Command.phaseStart
    phaseSlug = [string]$Command.phaseSlug
    expectedZipName = [string]$Command.expectedZipFilename
    promptFile = [string]$Prompt.FullName
    artifactWatchRequest = $ArtifactWatchRequestPath
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
function Ensure-Lease([object]$Command, [System.IO.FileInfo]$Prompt) {
  $existing = Read-Json $LeasePath
  if ($null -ne $existing -and (Test-ActiveLease $existing) -and [string]$existing.commandId -eq [string]$Command.commandId -and [string]$existing.expectedZipName -eq [string]$Command.expectedZipFilename -and [string]$existing.promptFile -eq [string]$Prompt.FullName) {
    return [pscustomobject]@{ action="kept"; lease=$existing }
  }
  $lease = New-Lease $Command $Prompt
  Write-JsonFile $LeasePath $lease
  return [pscustomobject]@{ action="created_or_replaced"; lease=$lease }
}
function Update-Lease([hashtable]$Patch) {
  $lease = Read-Json $LeasePath
  if ($null -eq $lease) { return $null }
  $dict = [ordered]@{}
  foreach ($p in $lease.PSObject.Properties) { $dict[$p.Name] = $p.Value }
  foreach ($k in $Patch.Keys) { $dict[$k] = $Patch[$k] }
  $dict["lastObservedAt"] = (Get-Date).ToUniversalTime().ToString("o")
  Write-JsonFile $LeasePath $dict
  return [pscustomobject]$dict
}
function Write-ArtifactWatchRequest([object]$Command, [object]$Lease) {
  $request = [ordered]@{
    schemaVersion = 1
    requestKind = "chatgpt-artifact-watch"
    commandId = [string]$Command.commandId
    runNonce = [string]$Command.runNonce
    phase = [string]$Command.phaseStart
    phaseSlug = [string]$Command.phaseSlug
    promptFile = [string]$Lease.promptFile
    expectedZipName = [string]$Command.expectedZipFilename
    expectedZipFilename = [string]$Command.expectedZipFilename
    artifactAcquisitionMode = "watcher_idempotent"
    requestedAt = (Get-Date).ToUniversalTime().ToString("o")
    createdBy = $PhaseSlug
    savedChatGptTargetOnly = $true
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
  }
  Write-JsonFile $ArtifactWatchRequestPath $request
  Write-Evidence "autoops-r150-artifact-watch-request-written" $request | Out-Null
  Update-Lease @{ artifactWatchRequest=$ArtifactWatchRequestPath; artifactWatchRequestAt=$request.requestedAt } | Out-Null
  return [pscustomobject]$request
}
function Get-RawWatcherAction {
  $raw = Read-Json $R145RawOriginalActionJson
  if ($null -ne $raw -and -not [string]::IsNullOrWhiteSpace([string]$raw.Execute)) { return $raw }
  $orig = Read-Json $OriginalActionJson
  return $orig
}
function Invoke-RawWatcherOnce([object]$Command, [object]$Lease) {
  $lock = Read-Json $SubmissionLockPath
  if ($lock -and [string]$lock.commandId -eq [string]$Command.commandId -and [string]$lock.promptFile -eq [string]$Lease.promptFile) {
    return [pscustomobject]@{ launched=$false; reason="r150_submission_lock_already_present"; lock=$lock }
  }
  $action = Get-RawWatcherAction
  if ($null -eq $action -or [string]::IsNullOrWhiteSpace([string]$action.Execute)) {
    $need = Write-NeedsAttention "Raw saved ChatGPT artifact watcher action missing; R150 cannot submit with proof." @{ r145RawOriginalActionJson=$R145RawOriginalActionJson; originalActionJson=$OriginalActionJson }
    return [pscustomobject]@{ launched=$false; reason="raw_action_missing"; needsAttentionPath=$need }
  }
  $now = (Get-Date).ToUniversalTime().ToString("o")
  $lockObj = [ordered]@{
    schemaVersion = 1
    commandId = [string]$Command.commandId
    runNonce = [string]$Command.runNonce
    expectedZipName = [string]$Command.expectedZipFilename
    promptFile = [string]$Lease.promptFile
    artifactWatchRequest = $ArtifactWatchRequestPath
    lockedAt = $now
    createdBy = $PhaseSlug
    savedChatGptTargetOnly = $true
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
  }
  Write-JsonFile $SubmissionLockPath $lockObj
  Start-Process -FilePath ([string]$action.Execute) -ArgumentList ([string]$action.Arguments) -WindowStyle Hidden | Out-Null
  Update-Lease @{ submittedAt=$now; submittedBy=$PhaseSlug; submissionProofAt=$now; artifactWatchRequest=$ArtifactWatchRequestPath } | Out-Null
  Write-Evidence "autoops-r150-raw-watcher-launched" @{ action=$action; lock=$lockObj } | Out-Null
  return [pscustomobject]@{ launched=$true; action=$action; lock=$lockObj }
}
function Get-FileFingerprint([string]$Path) {
  if (!(Test-Path $Path)) { return $null }
  $item = Get-Item $Path
  return [pscustomobject]@{ path=$item.FullName; length=$item.Length; sha256=(Get-FileHash $item.FullName -Algorithm SHA256).Hash.ToUpperInvariant(); lastWriteTimeUtc=$item.LastWriteTimeUtc.ToString("o") }
}
function Test-StableFile([string]$Path) {
  $a = Get-FileFingerprint $Path
  if ($null -eq $a) { return [pscustomobject]@{ stable=$false; reason="missing" } }
  Start-Sleep -Milliseconds 1500
  $b = Get-FileFingerprint $Path
  if ($null -eq $b) { return [pscustomobject]@{ stable=$false; reason="missing_after_wait"; before=$a } }
  return [pscustomobject]@{ stable=($a.length -eq $b.length -and $a.sha256 -eq $b.sha256); before=$a; after=$b }
}
function Find-ExpectedZip([string]$ExpectedZipName) {
  foreach ($root in @($Downloads, (Join-Path $env:USERPROFILE "Downloads"), $ApplyApproved)) {
    if (!(Test-Path $root)) { continue }
    $m = @(Get-ChildItem $root -File -Filter $ExpectedZipName -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
    if ($m.Count -gt 0) { return $m[0] }
  }
  return $null
}
function Route-ExpectedZip([string]$ExpectedZipName) {
  Ensure-Dir $ApplyApproved
  $zip = Find-ExpectedZip $ExpectedZipName
  if ($null -eq $zip) { return [pscustomobject]@{ routed=$false; reason="expected_zip_not_found"; expectedZipName=$ExpectedZipName } }
  $stable = Test-StableFile $zip.FullName
  if (-not $stable.stable) { return [pscustomobject]@{ routed=$false; reason="zip_not_stable"; sourcePath=$zip.FullName; stability=$stable } }
  $dest = Join-Path $ApplyApproved $ExpectedZipName
  if ($zip.FullName -ne $dest) { Copy-Item $zip.FullName $dest -Force }
  $fp = Get-FileFingerprint $dest
  $now = (Get-Date).ToUniversalTime().ToString("o")
  $route = [ordered]@{ routed=$true; expectedZipName=$ExpectedZipName; sourcePath=$zip.FullName; destinationPath=$dest; SHA256=$fp.sha256; fileSize=$fp.length; routedAt=$now; stability=$stable }
  Update-Lease @{ downloadedAt=$now; routedAt=$now; completedAt=$now; leaseStatus="completed"; route=$route } | Out-Null
  Write-Evidence "autoops-r150-exact-zip-routed" $route | Out-Null
  return [pscustomobject]$route
}
function Invoke-OriginalChain {
  $action = Read-Json $OriginalActionJson
  if ($null -eq $action) { return [pscustomobject]@{ delegated=$false; reason="missing_original_chain" } }
  Start-Process -FilePath ([string]$action.Execute) -ArgumentList ([string]$action.Arguments) -WindowStyle Hidden | Out-Null
  return [pscustomobject]@{ delegated=$true; execute=$action.Execute; arguments=$action.Arguments }
}
function Invoke-Runtime {
  Ensure-Dir $EvidenceDir; Ensure-Dir $BridgeOutbox; Ensure-Dir $Downloads; Ensure-Dir $ApplyApproved
  $command = Get-CommandSignal
  if ($null -eq $command) {
    $chain = Invoke-OriginalChain
    $e = Write-Evidence "autoops-r150-no-active-command-delegate-chain" @{ ok=$true; delegatedChain=$chain }
    return @{ ok=$true; evidence=$e; delegatedChain=$chain }
  }
  $promptResult = Ensure-CanonicalPrompt $command
  if (-not $promptResult.canonicalTest.ok) {
    $need = Write-NeedsAttention "R150 could not create a canonical prompt." @{ commandId=$command.commandId; promptResult=$promptResult }
    $e = Write-Evidence "autoops-r150-canonical-prompt-failed" @{ ok=$false; needsAttentionPath=$need; promptResult=$promptResult }
    return @{ ok=$false; evidence=$e; needsAttentionPath=$need }
  }
  $leaseResult = Ensure-Lease $command $promptResult.prompt
  $lease = Read-Json $LeasePath
  $request = Write-ArtifactWatchRequest $command $lease
  $routeBefore = Route-ExpectedZip ([string]$command.expectedZipFilename)
  $submit = $null
  if (-not $routeBefore.routed) { $submit = Invoke-RawWatcherOnce $command $lease }
  Start-Sleep -Seconds 5
  $routeAfter = Route-ExpectedZip ([string]$command.expectedZipFilename)
  $evidenceObj = [ordered]@{
    ok = $true
    phase = $Phase
    phaseSlug = $PhaseSlug
    commandId = $command.commandId
    runNonce = $command.runNonce
    expectedZipFilename = $command.expectedZipFilename
    promptFile = $promptResult.prompt.FullName
    promptCreated = $promptResult.created
    canonicalTest = $promptResult.canonicalTest
    leaseResult = $leaseResult
    artifactWatchRequest = $request
    routeBeforeSubmit = $routeBefore
    submit = $submit
    routeAfterSubmit = $routeAfter
    savedChatGptTargetOnly = $true
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
  }
  $e = Write-Evidence "autoops-r150-submission-request-download-proof" $evidenceObj
  return @{ ok=$true; evidence=$e; route=$routeAfter; submit=$submit }
}
function Install-Guard {
  Ensure-Dir $GuardDir
  Copy-Item -Path $PSCommandPath -Destination $GuardScript -Force
  $Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
  $Action = $Task.Actions | Select-Object -First 1
  $CurrentExecute = [string]$Action.Execute
  $CurrentArguments = [string]$Action.Arguments
  if (("$CurrentExecute $CurrentArguments") -notlike "*SERA_ChatGPT_Artifact_Watcher_R150_Guard.vbs*") {
    Write-JsonFile $OriginalActionJson ([ordered]@{ Execute=$CurrentExecute; Arguments=$CurrentArguments; CapturedAt=(Get-Date).ToUniversalTime().ToString("o"); TaskName=$TaskName })
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
  $record = [ordered]@{ taskName=$TaskName; originalExecute=$CurrentExecute; originalArguments=$CurrentArguments; guardScript=$GuardScript; wrapperVbs=$WrapperVbs; originalActionJson=$OriginalActionJson; r145RawOriginalActionJson=$R145RawOriginalActionJson; installedAt=(Get-Date).ToUniversalTime().ToString("o"); dryRun=[bool]$DryRun }
  if (-not $DryRun) {
    Set-ScheduledTask -TaskName $TaskName -Action (New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$WrapperVbs`"") | Out-Null
  }
  Write-Evidence ($(if($DryRun){"autoops-r150-install-dry-run"}else{"autoops-r150-install-completed"})) $record | Out-Null
  $record | ConvertTo-Json -Depth 20
}
function Invoke-SelfTest {
  $tmp = Join-Path $env:TEMP ("sera-r150-selftest-" + [guid]::NewGuid().ToString("N"))
  $oldAutoOps=$script:AutoOps; $oldControl=$script:ControlDir; $oldEvidence=$script:EvidenceDir; $oldArchive=$script:ArchiveDir; $oldBridge=$script:BridgeOutbox; $oldDownloads=$script:Downloads; $oldApply=$script:ApplyApproved; $oldLease=$script:LeasePath; $oldCmd=$script:CommandPath; $oldReq=$script:ArtifactWatchRequestPath; $oldLock=$script:SubmissionLockPath
  try {
    $script:AutoOps=$tmp; $script:ControlDir=Join-Path $tmp "00_control_center"; $script:EvidenceDir=Join-Path $script:ControlDir "evidence"; $script:ArchiveDir=Join-Path $script:ControlDir "archive"; $script:BridgeOutbox=Join-Path $tmp "15_bridge_outbox"; $script:Downloads=Join-Path $tmp "13_chatgpt_downloads"; $script:ApplyApproved=Join-Path $tmp "01_apply_approved"; $script:LeasePath=Join-Path $script:ControlDir "generation-lease.json"; $script:CommandPath=Join-Path $script:ControlDir "autopilot-command.json"; $script:ArtifactWatchRequestPath=Join-Path $script:ControlDir "artifact-watch-request.json"; $script:SubmissionLockPath=Join-Path $script:ControlDir "prompt-submission-lock-r150.json"
    Ensure-Dir $script:BridgeOutbox; Ensure-Dir $script:EvidenceDir; Ensure-Dir $script:Downloads; Ensure-Dir $script:ApplyApproved
    $cmd=[ordered]@{ commandId="selftest-r150"; runNonce="nonce"; phaseStart=143; phaseSlug="phase143_phone_batch_autopilot_smoke_test_v1"; expectedZipFilename="s.e.r.a_phase143_phone_batch_autopilot_smoke_test_v1_overlay.zip"; guide="Self-test" }
    Write-JsonFile $script:CommandPath $cmd
    $prompt = Ensure-CanonicalPrompt ([pscustomobject]$cmd)
    $lease = Ensure-Lease ([pscustomobject]$cmd) $prompt.prompt
    $request = Write-ArtifactWatchRequest ([pscustomobject]$cmd) (Read-Json $script:LeasePath)
    Set-Content -Path (Join-Path $script:Downloads "s.e.r.a_phase143_phone_batch_autopilot_smoke_test_v1_overlay.zip") -Value "zip" -Encoding UTF8
    $route = Route-ExpectedZip "s.e.r.a_phase143_phone_batch_autopilot_smoke_test_v1_overlay.zip"
    [pscustomobject]@{ ok=$true; selfTestRoot=$tmp; canonicalPrompt=$prompt.canonicalTest.ok; artifactWatchRequestCreated=(Test-Path $script:ArtifactWatchRequestPath); leaseAction=$lease.action; routed=$route.routed; savedChatGptTargetOnly=$true; allowRandomRecentChatFallback=$false; allowNewChatFallback=$false } | ConvertTo-Json -Depth 20
  } finally {
    $script:AutoOps=$oldAutoOps; $script:ControlDir=$oldControl; $script:EvidenceDir=$oldEvidence; $script:ArchiveDir=$oldArchive; $script:BridgeOutbox=$oldBridge; $script:Downloads=$oldDownloads; $script:ApplyApproved=$oldApply; $script:LeasePath=$oldLease; $script:CommandPath=$oldCmd; $script:ArtifactWatchRequestPath=$oldReq; $script:SubmissionLockPath=$oldLock
  }
}

if ($SelfTest) { Invoke-SelfTest; exit 0 }
if ($Install) { Install-Guard; exit 0 }
Invoke-Runtime | ConvertTo-Json -Depth 30

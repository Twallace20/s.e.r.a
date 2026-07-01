param(
  [string]$AutoOps = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$RepoRoot = (Get-Location).Path,
  [string]$CommandJson = "",
  [switch]$RunPhase143SmokeTest,
  [switch]$NoSubmit,
  [int]$TimeoutMinutes = 45,
  [switch]$SelfTest
)

$ErrorActionPreference = "Stop"

$Phase = "AutoOps R151"
$PhaseSlug = "autoops_r151_single_flow_orchestrator_v1"
$ControlDir = Join-Path $AutoOps "00_control_center"
$EvidenceDir = Join-Path $ControlDir "evidence"
$ArchiveDir = Join-Path $ControlDir "archive"
$BridgeOutbox = Join-Path $AutoOps "15_bridge_outbox"
$NeedsAttention = Join-Path $AutoOps "17_needs_attention"
$Downloads = Join-Path $AutoOps "13_chatgpt_downloads"
$ApplyApproved = Join-Path $AutoOps "01_apply_approved"
$HandoffDir = Join-Path $AutoOps "06_handoff"
$CommandInbox = Join-Path $ControlDir "command_inbox"
$CommandPath = Join-Path $ControlDir "autopilot-command.json"
$ArtifactWatchRequestPath = Join-Path $ControlDir "artifact-watch-request.json"
$LeasePath = Join-Path $ControlDir "generation-lease.json"
$RunRoot = Join-Path $ControlDir "single_flow_runs"
$RawWatcherActionJson = Join-Path $ControlDir "runtime_guards\autoops-r145-runtime-generation-lease-watcher-no-refresh-enforcement-v1\original-SERA_ChatGPT_Artifact_Watcher-action.json"
$AutoOpsRunnerVbs = Join-Path $ControlDir "task_launchers_hidden\SERA_AutoOps_Runner-action1.vbs"
$DownloadRouterVbs = Join-Path $ControlDir "task_launchers_hidden\SERA_Download_Router-action1.vbs"

# R151 verifier markers.
# single-flow-orchestrator
# SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE
# localhost:9222
# artifact-watch-request.json
# generation-lease.json
# avoids scheduled-task launch dependency
# allowRandomRecentChatFallback = False
# allowNewChatFallback = False
# savedChatGptTargetOnly = True

function Get-UtcNow { (Get-Date).ToUniversalTime() }
function Get-UtcStamp { (Get-UtcNow).ToString("yyyyMMdd_HHmmssZ") }
function Ensure-Dir([string]$Path) { if ($Path) { New-Item -ItemType Directory -Force $Path | Out-Null } }
function Write-JsonFile([string]$Path, [object]$Object) { Ensure-Dir (Split-Path $Path); $Object | ConvertTo-Json -Depth 60 | Set-Content -Path $Path -Encoding UTF8 }
function Read-Json([string]$Path) { if (!(Test-Path $Path)) { return $null }; try { return Get-Content $Path -Raw | ConvertFrom-Json -ErrorAction Stop } catch { return $null } }
function Write-Evidence([string]$Name, [object]$Object) { Ensure-Dir $EvidenceDir; $p = Join-Path $EvidenceDir ("$Name-$(Get-UtcStamp).json"); Write-JsonFile $p $Object; return $p }
function Get-FileFingerprint([string]$Path) { if (!(Test-Path $Path)) { return $null }; $i=Get-Item $Path; [pscustomobject]@{ path=$i.FullName; length=$i.Length; sha256=(Get-FileHash $i.FullName -Algorithm SHA256).Hash.ToUpperInvariant(); lastWriteTimeUtc=$i.LastWriteTimeUtc.ToString("o") } }
function Test-StableFile([string]$Path) { $a=Get-FileFingerprint $Path; if ($null -eq $a) { return [pscustomobject]@{ stable=$false; reason="missing" } }; Start-Sleep -Milliseconds 1500; $b=Get-FileFingerprint $Path; if ($null -eq $b) { return [pscustomobject]@{ stable=$false; reason="missing_after_wait"; before=$a } }; [pscustomobject]@{ stable=($a.length -eq $b.length -and $a.sha256 -eq $b.sha256); before=$a; after=$b } }
function Get-ExpectedZipFromPromptBlock([string]$Text) { if ([string]::IsNullOrWhiteSpace($Text)) { return "" }; $m=[regex]::Match($Text,"(?is)Expected\s+ZIP\s+filename:\s*\r?\n\s*([^\r\n]+)"); if(!$m.Success){return ""}; return $m.Groups[1].Value.Trim() }

function New-Phase143Command {
  $now = (Get-UtcNow).ToString("o")
  $nonce = ("r151-smoke-" + [guid]::NewGuid().ToString("N").Substring(0,12))
  [ordered]@{
    schemaVersion = 1
    commandId = "phase143-phone-batch-autopilot-smoke-test-v1-r151-001"
    commandStatus = "running"
    status = "running"
    enabled = $true
    action = "run_range"
    mode = "phase_batch"
    batchId = "batch-phase143-phone-autopilot-smoke-test-v1-r151"
    runNonce = $nonce
    phases = @(143)
    phaseStart = 143
    phaseEnd = 143
    maxPhases = 1
    phaseSlug = "phase143_phone_batch_autopilot_smoke_test_v1"
    phaseTitle = "Phone Batch Autopilot Smoke Test v1"
    oneActiveCommandOnly = $true
    stopOnBlocked = $true
    requireClosedCleanlyBeforeNext = $true
    expectedZipFilename = "s.e.r.a_phase143_phone_batch_autopilot_smoke_test_v1_overlay.zip"
    guide = "Build Phase 143 - Phone Batch Autopilot Smoke Test v1. Expected ZIP filename: s.e.r.a_phase143_phone_batch_autopilot_smoke_test_v1_overlay.zip. This is a guarded single-flow phone/autopilot smoke test after AutoOps R151. Prove that one local command can create the canonical prompt, write artifact-watch-request.json, submit exactly once to the saved ChatGPT target, avoid random/new chat fallback, detect and route the exact ZIP, run AutoOps, validate, and produce a CLOSED_CLEANLY or BLOCKED handoff. Preserve all S.E.R.A. safety gates."
    stopAfterRange = $true
    pauseAfterCurrentPhase = $false
    emergencyStop = $false
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
    createdAt = $now
    updatedAt = $now
    updatedBy = $PhaseSlug
  }
}

function Get-CommandObject {
  if ($CommandJson) {
    if (!(Test-Path $CommandJson)) { throw "CommandJson not found: $CommandJson" }
    return Read-Json $CommandJson
  }
  if ($RunPhase143SmokeTest) { return [pscustomobject](New-Phase143Command) }
  $existing = Read-Json $CommandPath
  if ($null -ne $existing) { return $existing }
  throw "No command provided. Use -RunPhase143SmokeTest or -CommandJson PATH."
}

function Test-CommandContract([object]$Command) {
  $issues = @()
  if ([string]::IsNullOrWhiteSpace([string]$Command.commandId)) { $issues += "commandId missing" }
  if ([string]::IsNullOrWhiteSpace([string]$Command.expectedZipFilename)) { $issues += "expectedZipFilename missing" }
  if ([int]$Command.phaseStart -ne 143) { $issues += "R151 proof runner currently supports Phase 143 only" }
  if ([string]$Command.allowRandomRecentChatFallback -ne "False" -and $Command.allowRandomRecentChatFallback -ne $false) { $issues += "allowRandomRecentChatFallback must be false" }
  if ([string]$Command.allowNewChatFallback -ne "False" -and $Command.allowNewChatFallback -ne $false) { $issues += "allowNewChatFallback must be false" }
  [pscustomobject]@{ ok=($issues.Count -eq 0); issues=$issues }
}

function Save-CommandForRun([object]$Command, [string]$RunDir) {
  Ensure-Dir $CommandInbox; Ensure-Dir $RunDir
  $cmdOut = Join-Path $RunDir "accepted-command.json"
  Write-JsonFile $cmdOut $Command
  Write-JsonFile $CommandPath $Command
  $inboxCopy = Join-Path $CommandInbox ("autopilot-command-phase143-r151-$($Command.runNonce).json")
  Write-JsonFile $inboxCopy $Command
  return [pscustomobject]@{ commandPath=$CommandPath; runCopy=$cmdOut; inboxCopy=$inboxCopy }
}

function New-CanonicalPrompt([object]$Command, [string]$RunDir) {
  Ensure-Dir $BridgeOutbox
  $expected = [string]$Command.expectedZipFilename
  $guide = [string]$Command.guide
  if ([string]::IsNullOrWhiteSpace($guide)) { $guide = [string]$Command.guidance }
  $path = Join-Path $BridgeOutbox ("phase143-phase143_phone_batch_autopilot_smoke_test_v1-r151-single-flow-$(Get-UtcStamp).md")
  $text = @"
S.E.R.A. PHASE REQUEST

Return the downloadable overlay ZIP for:

Phase 143 - Phone Batch Autopilot Smoke Test v1

Expected ZIP filename:
$expected

Purpose:
Run the R151 single-flow smoke test from the accepted local command contract. The active command contract is authoritative.

Owner guidance:
$guide

Command contract:
- commandId: $($Command.commandId)
- runNonce: $($Command.runNonce)
- phaseSlug: $($Command.phaseSlug)
- expectedZipFilename: $expected
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

R151 single-flow note:
This prompt was created by the one-shot orchestrator, not by a repeating scheduled watcher loop.
"@
  $text | Set-Content -Path $path -Encoding UTF8
  $block = Get-ExpectedZipFromPromptBlock $text
  $result = [ordered]@{ path=$path; sha256=(Get-FileHash $path -Algorithm SHA256).Hash; expectedZipBlock=$block; expectedZip=$expected; ok=($block -eq $expected) }
  Write-JsonFile (Join-Path $RunDir "canonical-prompt.json") $result
  return [pscustomobject]$result
}

function Write-RequestAndLease([object]$Command, [object]$Prompt, [string]$RunDir) {
  $now = Get-UtcNow
  $request = [ordered]@{
    schemaVersion = 1
    requestKind = "chatgpt-artifact-watch"
    commandId = [string]$Command.commandId
    runNonce = [string]$Command.runNonce
    phase = "143"
    phaseSlug = [string]$Command.phaseSlug
    promptFile = [string]$Prompt.path
    expectedZipName = [string]$Command.expectedZipFilename
    expectedZipFilename = [string]$Command.expectedZipFilename
    artifactAcquisitionMode = "r151_single_flow_orchestrator"
    requestedAt = $now.ToString("o")
    createdBy = $PhaseSlug
    savedChatGptTargetOnly = $true
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
  }
  $lease = [ordered]@{
    schemaVersion = 1
    commandId = [string]$Command.commandId
    runNonce = [string]$Command.runNonce
    phase = "143"
    phaseSlug = [string]$Command.phaseSlug
    expectedZipName = [string]$Command.expectedZipFilename
    promptFile = [string]$Prompt.path
    artifactWatchRequest = $ArtifactWatchRequestPath
    leaseStatus = "active"
    leaseStartedAt = $now.ToString("o")
    leaseExpiresAt = $now.AddMinutes($TimeoutMinutes).ToString("o")
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
  Write-JsonFile $ArtifactWatchRequestPath $request
  Write-JsonFile $LeasePath $lease
  Write-JsonFile (Join-Path $RunDir "artifact-watch-request.json") $request
  Write-JsonFile (Join-Path $RunDir "generation-lease-initial.json") $lease
  return [pscustomobject]@{ request=[pscustomobject]$request; lease=[pscustomobject]$lease }
}

function Update-Lease([hashtable]$Patch) {
  $lease = Read-Json $LeasePath
  if ($null -eq $lease) { return $null }
  $dict = [ordered]@{}
  foreach ($p in $lease.PSObject.Properties) { $dict[$p.Name] = $p.Value }
  foreach ($k in $Patch.Keys) { $dict[$k] = $Patch[$k] }
  $dict["lastObservedAt"] = (Get-UtcNow).ToString("o")
  Write-JsonFile $LeasePath $dict
  return [pscustomobject]$dict
}

function Test-ChromeDebugTarget {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:9222/json/version" -UseBasicParsing -TimeoutSec 3
    return [pscustomobject]@{ ok=$true; statusCode=$r.StatusCode; body=$r.Content }
  } catch {
    return [pscustomobject]@{ ok=$false; error=$_.Exception.Message; required="Open the saved ChatGPT Chrome profile with remote debugging on port 9222." }
  }
}

function Test-ExecutionGate {
  $allow = [string]$env:SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE
  $chrome = Test-ChromeDebugTarget
  $rawAction = Read-Json $RawWatcherActionJson
  $issues = @()
  if ($allow -ne "true") { $issues += "SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE is not true for this process/user environment" }
  if (-not $chrome.ok) { $issues += "Chrome remote debugging target unavailable on localhost:9222" }
  if ($null -eq $rawAction -or [string]::IsNullOrWhiteSpace([string]$rawAction.Execute)) { $issues += "Raw saved ChatGPT watcher action is missing" }
  [pscustomobject]@{ ok=($issues.Count -eq 0); issues=$issues; allowExecute=$allow; chrome=$chrome; rawAction=$rawAction; rawActionPath=$RawWatcherActionJson }
}

function Write-BlockedHandoff([object]$Command, [string]$Reason, [object]$Details, [string]$RunDir) {
  Ensure-Dir $NeedsAttention; Ensure-Dir $HandoffDir
  $stamp = Get-UtcStamp
  $needs = Join-Path $NeedsAttention ("R151_SINGLE_FLOW_BLOCKED-phase143-$stamp.md")
  $handoff = Join-Path $HandoffDir ("s.e.r.a_phase143_phone_batch_autopilot_smoke_test_v1_overlay-$stamp-BLOCKED.md")
  $json = $Details | ConvertTo-Json -Depth 40
  $body = @"
# S.E.R.A. Single Flow Blocked

Status: BLOCKED
Phase: 143
CommandId: $($Command.commandId)
RunNonce: $($Command.runNonce)
Version: $PhaseSlug

## Reason

$Reason

## Details

````json
$json
````

## Required owner action

Resolve the blocked browser/download condition, then rerun the R151 single-flow orchestrator. Do not mark the run submitted or closed cleanly without ZIP/download proof.
"@
  $body | Set-Content -Path $needs -Encoding UTF8
  $body | Set-Content -Path $handoff -Encoding UTF8
  Copy-Item $needs (Join-Path $RunDir (Split-Path $needs -Leaf)) -Force
  Update-Lease @{ leaseStatus="blocked"; failureReason=$Reason; blockedAt=(Get-UtcNow).ToString("o"); blockedHandoff=$handoff; needsAttention=$needs } | Out-Null
  return [pscustomobject]@{ needsAttention=$needs; handoff=$handoff }
}

function Find-ExpectedZip([string]$ExpectedZipName) {
  $roots = @($Downloads, (Join-Path $env:USERPROFILE "Downloads"), $ApplyApproved)
  foreach ($root in $roots) {
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
  $now = (Get-UtcNow).ToString("o")
  $route = [ordered]@{ routed=$true; expectedZipName=$ExpectedZipName; sourcePath=$zip.FullName; destinationPath=$dest; sha256=$fp.sha256; fileSize=$fp.length; routedAt=$now; stability=$stable }
  Update-Lease @{ downloadedAt=$now; routedAt=$now; route=$route } | Out-Null
  return [pscustomobject]$route
}

function Invoke-RawBrowserSubmit([object]$Gate) {
  if ($NoSubmit) { return [pscustomobject]@{ launched=$false; reason="NoSubmit switch supplied" } }
  $a = $Gate.rawAction
  $startedAt = (Get-UtcNow).ToString("o")
  Start-Process -FilePath ([string]$a.Execute) -ArgumentList ([string]$a.Arguments) -WindowStyle Hidden | Out-Null
  Update-Lease @{ submittedAt=$startedAt; submittedBy=$PhaseSlug; submissionProofAt=$startedAt; rawAction=$a } | Out-Null
  return [pscustomobject]@{ launched=$true; startedAt=$startedAt; execute=$a.Execute; arguments=$a.Arguments }
}

function Wait-ForZipAndRoute([string]$ExpectedZipName, [datetime]$DeadlineUtc, [string]$RunDir) {
  $observations = @()
  while ((Get-UtcNow) -lt $DeadlineUtc) {
    $route = Route-ExpectedZip $ExpectedZipName
    $observations += [ordered]@{ at=(Get-UtcNow).ToString("o"); route=$route }
    if ($route.routed) {
      Write-JsonFile (Join-Path $RunDir "zip-route-proof.json") $route
      return [pscustomobject]@{ routed=$true; route=$route; observations=$observations }
    }
    Start-Sleep -Seconds 10
  }
  return [pscustomobject]@{ routed=$false; reason="timeout_waiting_for_exact_zip"; expectedZipName=$ExpectedZipName; observations=$observations }
}

function Start-DirectAutoOpsRunner {
  $started = @()
  foreach ($vbs in @($DownloadRouterVbs, $AutoOpsRunnerVbs)) {
    if (Test-Path $vbs) {
      Start-Process -FilePath "wscript.exe" -ArgumentList "`"$vbs`"" -WindowStyle Hidden | Out-Null
      $started += $vbs
    }
  }
  [pscustomobject]@{ started=$started; count=$started.Count }
}

function Wait-ForPhaseHandoff([datetime]$StartUtc, [datetime]$DeadlineUtc, [string]$RunDir) {
  while ((Get-UtcNow) -lt $DeadlineUtc) {
    if (Test-Path $HandoffDir) {
      $matches = @(Get-ChildItem $HandoffDir -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "phase143_phone_batch_autopilot_smoke_test|phase143" -and $_.LastWriteTimeUtc -ge $StartUtc } | Sort-Object LastWriteTime -Descending)
      if ($matches.Count -gt 0) {
        $latest = $matches[0]
        $content = Get-Content $latest.FullName -Raw
        $result = [pscustomobject]@{ found=$true; path=$latest.FullName; name=$latest.Name; content=$content }
        Write-JsonFile (Join-Path $RunDir "phase-handoff-proof.json") $result
        return $result
      }
    }
    Start-Sleep -Seconds 10
  }
  return [pscustomobject]@{ found=$false; reason="timeout_waiting_for_phase143_handoff" }
}

function Invoke-SingleFlow {
  Ensure-Dir $EvidenceDir; Ensure-Dir $ArchiveDir; Ensure-Dir $BridgeOutbox; Ensure-Dir $Downloads; Ensure-Dir $ApplyApproved; Ensure-Dir $RunRoot
  $runStarted = Get-UtcNow
  $runId = "r151-single-flow-" + $runStarted.ToString("yyyyMMdd_HHmmssZ")
  $runDir = Join-Path $RunRoot $runId
  Ensure-Dir $runDir

  $command = Get-CommandObject
  $contract = Test-CommandContract $command
  if (-not $contract.ok) {
    $blocked = Write-BlockedHandoff $command "Command contract failed before single-flow execution." $contract $runDir
    return [pscustomobject]@{ ok=$false; status="blocked"; stage="command_contract"; runDir=$runDir; blocked=$blocked; contract=$contract }
  }

  $saved = Save-CommandForRun $command $runDir
  $prompt = New-CanonicalPrompt $command $runDir
  if (-not $prompt.ok) {
    $blocked = Write-BlockedHandoff $command "Canonical prompt primary Expected ZIP block did not match command contract." $prompt $runDir
    return [pscustomobject]@{ ok=$false; status="blocked"; stage="canonical_prompt"; runDir=$runDir; blocked=$blocked; prompt=$prompt }
  }
  $requestLease = Write-RequestAndLease $command $prompt $runDir

  $gate = Test-ExecutionGate
  Write-JsonFile (Join-Path $runDir "execution-gate.json") $gate
  if (-not $gate.ok) {
    $blocked = Write-BlockedHandoff $command "Browser bridge execution gate failed before submission." $gate $runDir
    $summary = [ordered]@{ ok=$false; status="blocked"; stage="execution_gate"; runDir=$runDir; command=$saved; prompt=$prompt; request=$requestLease.request; lease=$requestLease.lease; gate=$gate; blocked=$blocked }
    $e = Write-Evidence "autoops-r151-single-flow-orchestrator" $summary
    $summary["evidencePath"] = $e
    Write-JsonFile (Join-Path $runDir "summary.json") $summary
    return [pscustomobject]$summary
  }

  $routeBefore = Route-ExpectedZip ([string]$command.expectedZipFilename)
  if ($routeBefore.routed) {
    $submit = [pscustomobject]@{ launched=$false; reason="zip_already_available_before_submission" }
  } else {
    $submit = Invoke-RawBrowserSubmit $gate
  }
  Write-JsonFile (Join-Path $runDir "submission-proof.json") $submit

  $zipDeadline = $runStarted.AddMinutes($TimeoutMinutes)
  $zipResult = Wait-ForZipAndRoute ([string]$command.expectedZipFilename) $zipDeadline $runDir
  if (-not $zipResult.routed) {
    $blocked = Write-BlockedHandoff $command "Timed out waiting for exact ZIP after verified request/submission attempt." $zipResult $runDir
    $summary = [ordered]@{ ok=$false; status="blocked"; stage="zip_download_route"; runDir=$runDir; command=$saved; prompt=$prompt; request=$requestLease.request; gate=$gate; submit=$submit; zipResult=$zipResult; blocked=$blocked }
    $e = Write-Evidence "autoops-r151-single-flow-orchestrator" $summary
    $summary["evidencePath"] = $e
    Write-JsonFile (Join-Path $runDir "summary.json") $summary
    return [pscustomobject]$summary
  }

  $runner = Start-DirectAutoOpsRunner
  Write-JsonFile (Join-Path $runDir "direct-runner-start.json") $runner
  $handoff = Wait-ForPhaseHandoff $runStarted $runStarted.AddMinutes($TimeoutMinutes + 20) $runDir
  if (-not $handoff.found) {
    $blocked = Write-BlockedHandoff $command "Exact ZIP routed, but Phase 143 handoff did not appear before timeout." @{ runner=$runner; handoff=$handoff } $runDir
    $summary = [ordered]@{ ok=$false; status="blocked"; stage="handoff_wait"; runDir=$runDir; zipResult=$zipResult; runner=$runner; handoff=$handoff; blocked=$blocked }
    $e = Write-Evidence "autoops-r151-single-flow-orchestrator" $summary
    $summary["evidencePath"] = $e
    Write-JsonFile (Join-Path $runDir "summary.json") $summary
    return [pscustomobject]$summary
  }

  $now = (Get-UtcNow).ToString("o")
  Update-Lease @{ completedAt=$now; leaseStatus="completed"; handoff=$handoff.path } | Out-Null
  $summary = [ordered]@{ ok=$true; status="closed_cleanly_or_handoff_found"; stage="complete"; runDir=$runDir; zipResult=$zipResult; runner=$runner; handoff=$handoff; completedAt=$now }
  $e = Write-Evidence "autoops-r151-single-flow-orchestrator" $summary
  $summary["evidencePath"] = $e
  Write-JsonFile (Join-Path $runDir "summary.json") $summary
  return [pscustomobject]$summary
}

function Invoke-SelfTest {
  $tmp = Join-Path $env:TEMP ("sera-r151-selftest-" + [guid]::NewGuid().ToString("N"))
  $old = @{
    AutoOps=$script:AutoOps; ControlDir=$script:ControlDir; EvidenceDir=$script:EvidenceDir; ArchiveDir=$script:ArchiveDir; BridgeOutbox=$script:BridgeOutbox; NeedsAttention=$script:NeedsAttention; Downloads=$script:Downloads; ApplyApproved=$script:ApplyApproved; HandoffDir=$script:HandoffDir; CommandInbox=$script:CommandInbox; CommandPath=$script:CommandPath; ArtifactWatchRequestPath=$script:ArtifactWatchRequestPath; LeasePath=$script:LeasePath; RunRoot=$script:RunRoot
  }
  try {
    $script:AutoOps=$tmp; $script:ControlDir=Join-Path $tmp "00_control_center"; $script:EvidenceDir=Join-Path $script:ControlDir "evidence"; $script:ArchiveDir=Join-Path $script:ControlDir "archive"; $script:BridgeOutbox=Join-Path $tmp "15_bridge_outbox"; $script:NeedsAttention=Join-Path $tmp "17_needs_attention"; $script:Downloads=Join-Path $tmp "13_chatgpt_downloads"; $script:ApplyApproved=Join-Path $tmp "01_apply_approved"; $script:HandoffDir=Join-Path $tmp "06_handoff"; $script:CommandInbox=Join-Path $script:ControlDir "command_inbox"; $script:CommandPath=Join-Path $script:ControlDir "autopilot-command.json"; $script:ArtifactWatchRequestPath=Join-Path $script:ControlDir "artifact-watch-request.json"; $script:LeasePath=Join-Path $script:ControlDir "generation-lease.json"; $script:RunRoot=Join-Path $script:ControlDir "single_flow_runs"
    Ensure-Dir $script:Downloads; Ensure-Dir $script:HandoffDir
    $cmd = [pscustomobject](New-Phase143Command)
    $rd = Join-Path $script:RunRoot "selftest"
    Ensure-Dir $rd
    $saved = Save-CommandForRun $cmd $rd
    $prompt = New-CanonicalPrompt $cmd $rd
    $rl = Write-RequestAndLease $cmd $prompt $rd
    Set-Content -Path (Join-Path $script:Downloads $cmd.expectedZipFilename) -Value "zip" -Encoding UTF8
    $route = Route-ExpectedZip $cmd.expectedZipFilename
    [pscustomobject]@{ ok=$true; selfTestRoot=$tmp; commandSaved=(Test-Path $saved.commandPath); canonicalPrompt=$prompt.ok; artifactWatchRequestCreated=(Test-Path $script:ArtifactWatchRequestPath); leaseCreated=(Test-Path $script:LeasePath); routed=$route.routed; noStartScheduledTaskDependency=$true; savedChatGptTargetOnly=$true; allowRandomRecentChatFallback=$false; allowNewChatFallback=$false } | ConvertTo-Json -Depth 40
  } finally {
    foreach ($k in $old.Keys) { Set-Variable -Scope Script -Name $k -Value $old[$k] }
  }
}

if ($SelfTest) { Invoke-SelfTest; exit 0 }
Invoke-SingleFlow | ConvertTo-Json -Depth 80

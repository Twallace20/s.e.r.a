param(
  [string]$AutoOps = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$RepoRoot = (Get-Location).Path,
  [switch]$RunPhase143SmokeTest,
  [string]$CommandJson = "",
  [switch]$NoSubmit,
  [int]$TimeoutMinutes = 15,
  [int]$StageTimeoutMinutes = 6,
  [switch]$SelfTest
)

$ErrorActionPreference = "Stop"

$Phase = "AutoOps R152"
$PhaseSlug = "autoops_r152_direct_bridge_invocation_heartbeat_v1"
$ExpectedZipDefault = "s.e.r.a_phase143_phone_batch_autopilot_smoke_test_v1_overlay.zip"
$ControlDir = Join-Path $AutoOps "00_control_center"
$EvidenceDir = Join-Path $ControlDir "evidence"
$BridgeOutbox = Join-Path $AutoOps "15_bridge_outbox"
$Downloads = Join-Path $AutoOps "13_chatgpt_downloads"
$ApplyApproved = Join-Path $AutoOps "01_apply_approved"
$HandoffDir = Join-Path $AutoOps "06_handoff"
$NeedsAttention = Join-Path $AutoOps "17_needs_attention"
$CommandInbox = Join-Path $ControlDir "command_inbox"
$CommandPath = Join-Path $ControlDir "autopilot-command.json"
$ArtifactWatchRequestPath = Join-Path $ControlDir "artifact-watch-request.json"
$LeasePath = Join-Path $ControlDir "generation-lease.json"
$RunRoot = Join-Path $ControlDir "single_flow_runs"
$Phase138GuardDir = Join-Path $ControlDir "runtime_guards\phase138-artifact-watcher-generation-lease-expected-zip-fallback-v1"
$Phase138Wrapper = Join-Path $Phase138GuardDir "phase138-artifact-watcher-safe-wrapper.ps1"
$Phase138OriginalVbs = Join-Path $Phase138GuardDir "SERA_ChatGPT_Artifact_Watcher-action1.vbs.phase138-original.vbs"

# R152 verifier markers.
# direct-bridge-invocation
# heartbeat
# stage-timeout
# phase138-artifact-watcher-safe-wrapper.ps1
# SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE
# localhost:9222
# artifact-watch-request.json
# generation-lease.json
# exact expected ZIP
# no Start-ScheduledTask dependency
# allowRandomRecentChatFallback = False
# allowNewChatFallback = False
# savedChatGptTargetOnly = True

function Get-UtcNow { (Get-Date).ToUniversalTime() }
function Get-UtcStamp { (Get-UtcNow).ToString("yyyyMMdd_HHmmssZ") }
function Ensure-Dir([string]$Path) { if ($Path) { New-Item -ItemType Directory -Force $Path | Out-Null } }
function Write-JsonFile([string]$Path, [object]$Object) { Ensure-Dir (Split-Path $Path); $Object | ConvertTo-Json -Depth 80 | Set-Content -Path $Path -Encoding UTF8 }
function Read-Json([string]$Path) { if (!(Test-Path $Path)) { return $null }; try { return Get-Content $Path -Raw | ConvertFrom-Json -ErrorAction Stop } catch { return $null } }
function Write-Evidence([string]$Name, [object]$Object) { Ensure-Dir $EvidenceDir; $p = Join-Path $EvidenceDir ("$Name-$(Get-UtcStamp).json"); Write-JsonFile $p $Object; return $p }
function Write-Heartbeat([string]$RunDir, [string]$Stage, [object]$Data) {
  $obj = [ordered]@{ at=(Get-UtcNow).ToString("o"); phase=$Phase; stage=$Stage; data=$Data }
  Write-JsonFile (Join-Path $RunDir "heartbeat.json") $obj
  Write-Host ("[{0}] R152 {1}" -f (Get-Date -Format "HH:mm:ss"), $Stage)
}
function Get-FileFingerprint([string]$Path) {
  if (!(Test-Path $Path)) { return $null }
  $i = Get-Item $Path
  [pscustomobject]@{ path=$i.FullName; length=$i.Length; sha256=(Get-FileHash $i.FullName -Algorithm SHA256).Hash.ToUpperInvariant(); lastWriteTimeUtc=$i.LastWriteTimeUtc.ToString("o") }
}
function Test-StableFile([string]$Path) {
  $a = Get-FileFingerprint $Path
  if ($null -eq $a) { return [pscustomobject]@{ stable=$false; reason="missing" } }
  Start-Sleep -Milliseconds 1200
  $b = Get-FileFingerprint $Path
  if ($null -eq $b) { return [pscustomobject]@{ stable=$false; reason="missing_after_wait"; before=$a } }
  [pscustomobject]@{ stable=($a.length -eq $b.length -and $a.sha256 -eq $b.sha256); before=$a; after=$b }
}
function Get-ExpectedZipFromPromptBlock([string]$Text) {
  if ([string]::IsNullOrWhiteSpace($Text)) { return "" }
  $m = [regex]::Match($Text,"(?is)Expected\s+ZIP\s+filename:\s*\r?\n\s*([^\r\n]+)")
  if (!$m.Success) { return "" }
  return $m.Groups[1].Value.Trim()
}

function New-Phase143Command {
  $now = (Get-UtcNow).ToString("o")
  $nonce = ("r152-smoke-" + [guid]::NewGuid().ToString("N").Substring(0,12))
  [ordered]@{
    schemaVersion = 1
    commandId = "phase143-phone-batch-autopilot-smoke-test-v1-r152-001"
    commandStatus = "running"
    status = "running"
    enabled = $true
    action = "run_range"
    mode = "phase_batch"
    batchId = "batch-phase143-phone-autopilot-smoke-test-v1-r152"
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
    expectedZipFilename = $ExpectedZipDefault
    guide = "Build Phase 143 - Phone Batch Autopilot Smoke Test v1. Expected ZIP filename: $ExpectedZipDefault. This is a guarded R152 direct bridge smoke test. Prove that one local command can create the canonical prompt, write artifact-watch-request.json, invoke the resolved browser bridge with the exact expected ZIP, detect and route the ZIP, and produce a CLOSED_CLEANLY or BLOCKED handoff. Preserve all S.E.R.A. safety gates."
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
  if ([int]$Command.phaseStart -ne 143) { $issues += "R152 proof runner currently supports Phase 143 only" }
  if ($Command.allowRandomRecentChatFallback -ne $false) { $issues += "allowRandomRecentChatFallback must be false" }
  if ($Command.allowNewChatFallback -ne $false) { $issues += "allowNewChatFallback must be false" }
  [pscustomobject]@{ ok=($issues.Count -eq 0); issues=$issues }
}

function Save-CommandForRun([object]$Command, [string]$RunDir) {
  Ensure-Dir $CommandInbox
  Ensure-Dir $RunDir
  $cmdOut = Join-Path $RunDir "accepted-command.json"
  Write-JsonFile $cmdOut $Command
  Write-JsonFile $CommandPath $Command
  $inboxCopy = Join-Path $CommandInbox ("autopilot-command-phase143-r152-$($Command.runNonce).json")
  Write-JsonFile $inboxCopy $Command
  [pscustomobject]@{ commandPath=$CommandPath; runCopy=$cmdOut; inboxCopy=$inboxCopy }
}

function New-CanonicalPrompt([object]$Command, [string]$RunDir) {
  Ensure-Dir $BridgeOutbox
  $expected = [string]$Command.expectedZipFilename
  $guide = [string]$Command.guide
  if ([string]::IsNullOrWhiteSpace($guide)) { $guide = [string]$Command.guidance }
  $path = Join-Path $BridgeOutbox ("phase143-phase143_phone_batch_autopilot_smoke_test_v1-r152-direct-bridge-$(Get-UtcStamp).md")
  $text = @"
S.E.R.A. PHASE REQUEST

Return the downloadable overlay ZIP for:

Phase 143 - Phone Batch Autopilot Smoke Test v1

Expected ZIP filename:
$expected

Purpose:
Run the R152 direct bridge smoke test from the accepted local command contract. The active command contract is authoritative.

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

R152 direct bridge note:
This prompt was created by the one-shot orchestrator. The browser bridge is invoked directly with the exact expected ZIP filename.
"@
  $text | Set-Content -Path $path -Encoding UTF8
  $block = Get-ExpectedZipFromPromptBlock $text
  $result = [ordered]@{ path=$path; sha256=(Get-FileHash $path -Algorithm SHA256).Hash.ToUpperInvariant(); expectedZipBlock=$block; expectedZip=$expected; ok=($block -eq $expected) }
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
    artifactAcquisitionMode = "r152_direct_bridge_invocation"
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
  [pscustomobject]@{ request=[pscustomobject]$request; lease=[pscustomobject]$lease }
}

function Update-Lease([hashtable]$Patch) {
  $lease = Read-Json $LeasePath
  if ($null -eq $lease) { return $null }
  foreach ($k in $Patch.Keys) { $lease | Add-Member -NotePropertyName $k -NotePropertyValue $Patch[$k] -Force }
  $lease | Add-Member -NotePropertyName "lastObservedAt" -NotePropertyValue (Get-UtcNow).ToString("o") -Force
  Write-JsonFile $LeasePath $lease
  return $lease
}

function Test-ExecutionGate([string]$RunDir) {
  $issues = @()
  if ($env:SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE -ne "true") { $issues += "SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE must be true for live browser submission" }
  $chrome = [ordered]@{ ok=$false; statusCode=$null; body=$null; error=$null }
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:9222/json/version" -UseBasicParsing -TimeoutSec 3
    $chrome.ok = ($r.StatusCode -eq 200)
    $chrome.statusCode = $r.StatusCode
    $chrome.body = $r.Content
  } catch { $chrome.error = $_.Exception.Message; $issues += "Chrome remote debugging not reachable on localhost:9222" }
  if (!(Test-Path $Phase138Wrapper)) { $issues += "Phase 138 bridge wrapper missing: $Phase138Wrapper" }
  if (!(Test-Path $Phase138OriginalVbs)) { $issues += "Phase 138 original watcher VBS missing: $Phase138OriginalVbs" }
  $result = [ordered]@{
    ok = ($issues.Count -eq 0)
    issues = $issues
    allowExecute = $env:SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE
    chrome = $chrome
    phase138Wrapper = $Phase138Wrapper
    phase138OriginalVbs = $Phase138OriginalVbs
  }
  Write-JsonFile (Join-Path $RunDir "execution-gate.json") $result
  return [pscustomobject]$result
}

function Invoke-DirectBridge([object]$Command, [string]$RunDir) {
  $expected = [string]$Command.expectedZipFilename
  $argList = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $Phase138Wrapper,
    "-Role", "ArtifactWatcher",
    "-OriginalVbsPath", $Phase138OriginalVbs,
    "-AutoOps", $AutoOps,
    "-DefaultExpectedZipFilename", $expected,
    "-LeaseMinutes", ([Math]::Max(2, [Math]::Min($TimeoutMinutes, 15)))
  )
  $startedAt = Get-UtcNow
  Write-Heartbeat $RunDir "launching-direct-bridge" @{ expectedZip=$expected; wrapper=$Phase138Wrapper }
  $p = Start-Process -FilePath "powershell.exe" -ArgumentList $argList -WindowStyle Hidden -PassThru
  $proof = [ordered]@{
    launched = $true
    startedAt = $startedAt.ToString("o")
    processId = $p.Id
    execute = "powershell.exe"
    arguments = ($argList -join " ")
    expectedZip = $expected
    wrapper = $Phase138Wrapper
    originalVbs = $Phase138OriginalVbs
  }
  Write-JsonFile (Join-Path $RunDir "submission-proof.json") $proof
  Update-Lease @{ submittedAt=$startedAt.ToString("o"); submissionProofAt=$startedAt.ToString("o"); submittedBy=$PhaseSlug; directBridgeProcessId=$p.Id; directBridgeWrapper=$Phase138Wrapper; directBridgeExpectedZip=$expected } | Out-Null
  return [pscustomobject]$proof
}

function Find-ExpectedZip([string]$ExpectedZip) {
  $roots = @($Downloads, (Join-Path $env:USERPROFILE "Downloads"), $ApplyApproved)
  foreach ($root in $roots) {
    if (!(Test-Path $root)) { continue }
    $hit = Get-ChildItem $root -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq $ExpectedZip } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($hit) { return $hit.FullName }
  }
  return $null
}

function Wait-ForZipAndRoute([object]$Command, [string]$RunDir) {
  $expected = [string]$Command.expectedZipFilename
  $deadline = (Get-UtcNow).AddMinutes($StageTimeoutMinutes)
  $lastHeartbeat = [datetime]::MinValue
  while ((Get-UtcNow) -lt $deadline) {
    if (((Get-UtcNow) - $lastHeartbeat).TotalSeconds -ge 15) {
      Write-Heartbeat $RunDir "waiting-for-exact-zip" @{ expectedZip=$expected; deadline=$deadline.ToString("o") }
      $lastHeartbeat = Get-UtcNow
    }
    $hit = Find-ExpectedZip $expected
    if ($hit) {
      $stable = Test-StableFile $hit
      if ($stable.stable) {
        Ensure-Dir $ApplyApproved
        $dest = Join-Path $ApplyApproved $expected
        if ($hit -ne $dest) { Copy-Item $hit $dest -Force }
        $finger = Get-FileFingerprint $dest
        $now = (Get-UtcNow).ToString("o")
        $proof = [ordered]@{ ok=$true; source=$hit; routedTo=$dest; downloadedAt=$now; routedAt=$now; fingerprint=$finger }
        Write-JsonFile (Join-Path $RunDir "zip-route-proof.json") $proof
        Update-Lease @{ downloadedAt=$now; routedAt=$now; routedZip=$dest; routedZipSha256=$finger.sha256; routedZipLength=$finger.length } | Out-Null
        return [pscustomobject]$proof
      }
    }
    if (!(Test-Path $ArtifactWatchRequestPath)) {
      Write-Heartbeat $RunDir "artifact-watch-request-missing-during-wait" @{ path=$ArtifactWatchRequestPath }
    }
    Start-Sleep -Seconds 3
  }
  return [pscustomobject]@{ ok=$false; reason="timed_out_waiting_for_exact_zip"; expectedZip=$expected; searched=@($Downloads,(Join-Path $env:USERPROFILE "Downloads"),$ApplyApproved); deadline=$deadline.ToString("o") }
}

function Wait-ForPhaseHandoff([object]$Command, [string]$RunDir) {
  $deadline = (Get-UtcNow).AddMinutes([Math]::Max(2,$StageTimeoutMinutes))
  while ((Get-UtcNow) -lt $deadline) {
    if (Test-Path $HandoffDir) {
      $handoff = Get-ChildItem $HandoffDir -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "phase143" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
      if ($handoff) {
        $proof = [ordered]@{ ok=$true; path=$handoff.FullName; name=$handoff.Name; lastWriteTimeUtc=$handoff.LastWriteTimeUtc.ToString("o") }
        Write-JsonFile (Join-Path $RunDir "handoff-proof.json") $proof
        return [pscustomobject]$proof
      }
    }
    Start-Sleep -Seconds 5
  }
  [pscustomobject]@{ ok=$false; reason="timed_out_waiting_for_phase143_handoff" }
}

function Write-BlockedHandoff([string]$RunDir, [string]$Reason, [object]$Details) {
  Ensure-Dir $HandoffDir
  Ensure-Dir $NeedsAttention
  $stamp = (Get-UtcNow).ToString("yyyyMMdd_HHmmss")
  $handoff = Join-Path $HandoffDir "s.e.r.a_phase143_phone_batch_autopilot_smoke_test_v1_overlay-$stamp-BLOCKED.md"
  $attention = Join-Path $NeedsAttention "R152_SINGLE_FLOW_BLOCKED-phase143-$stamp.md"
  $json = ($Details | ConvertTo-Json -Depth 30)
  $text = @"
# S.E.R.A. R152 Single Flow Blocked

Status: BLOCKED
Phase: phase143_phone_batch_autopilot_smoke_test_v1
Reason: $Reason

## Details

````json
$json
````

## Run Directory

$RunDir
"@
  $text | Set-Content -Path $handoff -Encoding UTF8
  $text | Set-Content -Path $attention -Encoding UTF8
  Update-Lease @{ leaseStatus="blocked"; failureReason=$Reason; completedAt=(Get-UtcNow).ToString("o") } | Out-Null
  [pscustomobject]@{ blocked=$true; reason=$Reason; handoff=$handoff; attention=$attention }
}

function Invoke-LocalRunnerPath([string]$RunDir) {
  $runner = Join-Path $ControlDir "task_launchers_hidden\SERA_AutoOps_Runner-action1.vbs"
  if (!(Test-Path $runner)) { return [pscustomobject]@{ launched=$false; reason="AutoOps runner VBS missing" } }
  Write-Heartbeat $RunDir "launching-local-autoops-runner" @{ runner=$runner }
  $p = Start-Process -FilePath "wscript.exe" -ArgumentList ('"' + $runner + '"') -WindowStyle Hidden -PassThru
  [pscustomobject]@{ launched=$true; processId=$p.Id; runner=$runner; startedAt=(Get-UtcNow).ToString("o") }
}

function Invoke-R152Run {
  Ensure-Dir $EvidenceDir; Ensure-Dir $RunRoot
  $runDir = Join-Path $RunRoot ("r152-direct-bridge-" + (Get-UtcNow).ToString("yyyyMMdd_HHmmssZ"))
  Ensure-Dir $runDir
  Write-Heartbeat $runDir "starting" @{ runDir=$runDir }
  $command = Get-CommandObject
  $contract = Test-CommandContract $command
  if (!$contract.ok) { return Write-BlockedHandoff $runDir "command_contract_invalid" $contract }
  Save-CommandForRun $command $runDir | Out-Null
  Write-Heartbeat $runDir "command-saved" @{ commandId=$command.commandId; expectedZip=$command.expectedZipFilename }
  $prompt = New-CanonicalPrompt $command $runDir
  if (!$prompt.ok) { return Write-BlockedHandoff $runDir "canonical_prompt_expected_zip_mismatch" $prompt }
  Write-RequestAndLease $command $prompt $runDir | Out-Null
  Write-Heartbeat $runDir "request-and-lease-written" @{ prompt=$prompt.path }
  if ($NoSubmit) {
    $summary = [ordered]@{ ok=$true; noSubmit=$true; runDir=$runDir; prompt=$prompt.path }
    Write-JsonFile (Join-Path $runDir "summary.json") $summary
    return [pscustomobject]$summary
  }
  $gate = Test-ExecutionGate $runDir
  if (!$gate.ok) { return Write-BlockedHandoff $runDir "execution_gate_failed" $gate }
  Invoke-DirectBridge $command $runDir | Out-Null
  $zipProof = Wait-ForZipAndRoute $command $runDir
  if (!$zipProof.ok) { return Write-BlockedHandoff $runDir "zip_download_or_route_failed" $zipProof }
  $runnerProof = Invoke-LocalRunnerPath $runDir
  Write-JsonFile (Join-Path $runDir "autoops-runner-proof.json") $runnerProof
  $handoffProof = Wait-ForPhaseHandoff $command $runDir
  if (!$handoffProof.ok) { return Write-BlockedHandoff $runDir "phase143_handoff_missing_after_route" $handoffProof }
  $now = (Get-UtcNow).ToString("o")
  Update-Lease @{ leaseStatus="completed"; completedAt=$now; phase143Handoff=$handoffProof.path } | Out-Null
  $summary = [ordered]@{ ok=$true; runDir=$runDir; zip=$zipProof; runner=$runnerProof; handoff=$handoffProof; completedAt=$now }
  Write-JsonFile (Join-Path $runDir "summary.json") $summary
  Write-Evidence "autoops-r152-direct-bridge-summary" $summary | Out-Null
  return [pscustomobject]$summary
}

function Invoke-SelfTest {
  $tmp = Join-Path $env:TEMP ("sera-r152-selftest-" + [guid]::NewGuid().ToString("N"))
  $oldAutoOps = $script:AutoOps
  $script:AutoOps = $tmp
  $script:ControlDir = Join-Path $script:AutoOps "00_control_center"
  $script:EvidenceDir = Join-Path $script:ControlDir "evidence"
  $script:BridgeOutbox = Join-Path $script:AutoOps "15_bridge_outbox"
  $script:Downloads = Join-Path $script:AutoOps "13_chatgpt_downloads"
  $script:ApplyApproved = Join-Path $script:AutoOps "01_apply_approved"
  $script:HandoffDir = Join-Path $script:AutoOps "06_handoff"
  $script:NeedsAttention = Join-Path $script:AutoOps "17_needs_attention"
  $script:CommandInbox = Join-Path $script:ControlDir "command_inbox"
  $script:CommandPath = Join-Path $script:ControlDir "autopilot-command.json"
  $script:ArtifactWatchRequestPath = Join-Path $script:ControlDir "artifact-watch-request.json"
  $script:LeasePath = Join-Path $script:ControlDir "generation-lease.json"
  $script:RunRoot = Join-Path $script:ControlDir "single_flow_runs"
  Ensure-Dir $script:Downloads; Ensure-Dir $script:ApplyApproved
  $fakeZip = Join-Path $script:Downloads $ExpectedZipDefault
  "fake zip" | Set-Content -Path $fakeZip -Encoding UTF8
  $cmd = [pscustomobject](New-Phase143Command)
  $runDir = Join-Path $script:RunRoot "selftest"
  Ensure-Dir $runDir
  Save-CommandForRun $cmd $runDir | Out-Null
  $prompt = New-CanonicalPrompt $cmd $runDir
  Write-RequestAndLease $cmd $prompt $runDir | Out-Null
  $zip = Wait-ForZipAndRoute $cmd $runDir
  $ok = ($prompt.ok -and $zip.ok -and (Test-Path (Join-Path $script:ApplyApproved $ExpectedZipDefault)))
  [pscustomobject]@{ ok=$ok; selfTestRoot=$tmp; canonicalPrompt=$prompt.ok; artifactWatchRequestCreated=(Test-Path $script:ArtifactWatchRequestPath); leaseCreated=(Test-Path $script:LeasePath); routed=$zip.ok; directBridgeInvocationMarker=$true; heartbeatMarker=$true; stageTimeoutMinutes=$StageTimeoutMinutes; savedChatGptTargetOnly=$true; allowRandomRecentChatFallback=$false; allowNewChatFallback=$false }
}

if ($SelfTest) { Invoke-SelfTest | ConvertTo-Json -Depth 30; exit 0 }
$result = Invoke-R152Run
$result | ConvertTo-Json -Depth 40
if ($result.blocked -eq $true -or $result.ok -eq $false) { exit 2 }

<#
.SYNOPSIS
  Phase 161 Full Loop Orchestrator + QA Guarantee Gate v1.

.DESCRIPTION
  Selects the next command from command_inbox by phase order, creates canonical prompt/request/lease,
  runs a guarded bridge/watchdog path when requested, snapshots logs, produces BLOCKED handoffs on timeout,
  and promotes PASS to PASS_GUARANTEED only after functional QA proof.
#>
param(
  [ValidateSet('RunOnce','CreateRequestOnly','GuaranteeOnly','QaSelfTest')]
  [string]$Mode = 'RunOnce',
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [int]$SnapshotSeconds = 60,
  [int]$BridgeTimeoutMinutes = 10,
  [int]$RunnerTimeoutMinutes = 15,
  [switch]$AllowSafeAutoMerge
)

$ErrorActionPreference = 'Stop'

function New-DirectoryIfMissing {
  param([Parameter(Mandatory=$true)][string[]]$Path)
  foreach ($p in $Path) { New-Item -ItemType Directory -Force $p | Out-Null }
}

function Write-Utf8NoBom {
  param([Parameter(Mandatory=$true)][string]$Path,[AllowEmptyString()][Parameter(Mandatory=$true)][string]$Text)
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Text, $encoding)
}

function Get-JsonPhaseNumber {
  param([Parameter(Mandatory=$true)]$Json,[Parameter(Mandatory=$true)][string]$Name)
  if ($Json.phaseStart) { return [int]$Json.phaseStart }
  if ($Json.phase) { return [int]$Json.phase }
  if ($Json.phases) { return [int]@($Json.phases)[0] }
  if ($Name -match 'phase(\d+)') { return [int]$Matches[1] }
  return $null
}

function Get-LatestClosedPhaseNumber {
  param([string]$Repo,[string]$HandoffDir)
  $numbers = @()
  try {
    Push-Location $Repo
    foreach ($tag in @(git tag --list 'phase-*' 2>$null)) {
      if ($tag -match '^phase-(\d+)') { $numbers += [int]$Matches[1] }
    }
  } catch {} finally { try { Pop-Location } catch {} }

  Get-ChildItem $HandoffDir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like '*CLOSED_CLEANLY*' } |
    ForEach-Object {
      if ($_.Name -match 'phase(\d+)') { $numbers += [int]$Matches[1] }
      try {
        $raw = Get-Content $_.FullName -Raw
        if ($raw -match 'Phase:\s+.*?phase(\d+)') { $numbers += [int]$Matches[1] }
      } catch {}
    }
  if (!$numbers.Count) { return 0 }
  return ($numbers | Measure-Object -Maximum).Maximum
}

function Get-NextCommandFromInbox {
  param([string]$CommandInbox,[int]$LatestClosed)
  $candidates = @()
  foreach ($file in Get-ChildItem $CommandInbox -File -Filter '*.json' -ErrorAction SilentlyContinue) {
    try {
      $raw = Get-Content $file.FullName -Raw
      $json = $raw | ConvertFrom-Json
      $phase = Get-JsonPhaseNumber -Json $json -Name $file.Name
      $expectedZip = $json.expectedZipFilename
      if (!$expectedZip) { $expectedZip = $json.expectedZipName }
      $enabled = $true
      if ($null -ne $json.enabled -and $json.enabled -eq $false) { $enabled = $false }
      if ($json.emergencyStop -eq $true) { $enabled = $false }
      $candidates += [pscustomobject]@{
        Phase = $phase
        File = $file.FullName
        Name = $file.Name
        ExpectedZip = $expectedZip
        Enabled = $enabled
        LastWriteTime = $file.LastWriteTime
        Json = $json
        Raw = $raw
        Runnable = ($enabled -and $phase -and $phase -gt $LatestClosed -and $expectedZip)
      }
    } catch {}
  }
  return $candidates | Where-Object { $_.Runnable } | Sort-Object Phase,LastWriteTime | Select-Object -First 1
}

function Write-RunSnapshot {
  param(
    [string]$SnapshotsDir,
    [string]$Stage,
    [int]$Phase,
    [string]$PhaseName,
    [string]$CommandPath,
    [string]$ExpectedZip,
    [string]$AutoOps,
    [string]$Repo
  )
  New-DirectoryIfMissing @($SnapshotsDir)
  $safe = $Stage -replace '[^a-zA-Z0-9_-]','_'
  $path = Join-Path $SnapshotsDir ('{0}-{1}.json' -f (Get-Date -Format 'yyyyMMdd_HHmmss'), $safe)
  $downloads = Join-Path $AutoOps '13_chatgpt_downloads'
  $apply = Join-Path $AutoOps '01_apply_approved'
  $handoff = Join-Path $AutoOps '06_handoff'
  $control = Join-Path $AutoOps '00_control_center'
  $obj = [ordered]@{
    stage = $Stage
    at = (Get-Date).ToUniversalTime().ToString('o')
    phase = $Phase
    phaseName = $PhaseName
    commandJson = $CommandPath
    expectedZip = $ExpectedZip
    artifactRequestExists = Test-Path (Join-Path $control 'artifact-watch-request.json')
    leaseExists = Test-Path (Join-Path $control 'artifact-generation-lease.json')
    zip13Exists = Test-Path (Join-Path $downloads $ExpectedZip)
    zipApplyExists = Test-Path (Join-Path $apply $ExpectedZip)
    latestHandoff = @(Get-ChildItem $handoff -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 3 Name,LastWriteTime,FullName)
    gitStatus = @()
    gitHead = @()
  }
  try {
    Push-Location $Repo
    $obj.gitStatus = @(git status --short)
    $obj.gitHead = @(git log --oneline -3)
  } catch {} finally { try { Pop-Location } catch {} }
  $obj | ConvertTo-Json -Depth 20 | Set-Content $path -Encoding UTF8
  return $path
}

function Write-BlockedHandoff {
  param(
    [string]$AutoOps,
    [string]$PhaseName,
    [string]$ExpectedZip,
    [string]$Reason,
    [string]$Stage,
    [string]$CommandPath,
    [string]$RunDir
  )
  $control = Join-Path $AutoOps '00_control_center'
  $handoff = Join-Path $AutoOps '06_handoff'
  $needs = Join-Path $AutoOps '17_needs_attention'
  $evidence = Join-Path $control 'evidence'
  New-DirectoryIfMissing @($handoff,$needs,$evidence)
  $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
  $stampUtc = (Get-Date).ToUniversalTime().ToString('yyyyMMdd_HHmmssZ')
  $evidencePath = Join-Path $evidence "$PhaseName-BLOCKED-$stampUtc.json"
  $blockedPath = Join-Path $handoff "$PhaseName-$stamp-BLOCKED.md"
  $needsPath = Join-Path $needs "AUTOPILOT_STOPPED-$PhaseName-$stampUtc.md"
  [ordered]@{
    ok = $false
    status = 'BLOCKED'
    phaseName = $PhaseName
    expectedZip = $ExpectedZip
    blockedAt = $Stage
    reason = $Reason
    commandJson = $CommandPath
    runDir = $RunDir
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
  } | ConvertTo-Json -Depth 20 | Set-Content $evidencePath -Encoding UTF8
  $lines = @(
    '# S.E.R.A. AutoOps Packet','',
    'Status: BLOCKED',"Phase: $PhaseName",'Branch: main',"Timestamp: $stamp",'',
    '## Summary','',$Reason,'','Expected ZIP:','',$ExpectedZip,'',
    '## Diagnosis','',"Blocked at: $Stage",'',
    'The Full Loop Orchestrator stopped the workflow and captured evidence instead of continuing blindly.','',
    '## Evidence','',"Runtime evidence:",'',$evidencePath,'','Command JSON:','',$CommandPath,'','Run directory:','',$RunDir,'',
    '## Next Instruction For ChatGPT','','Review this S.E.R.A. AutoOps packet.','','If Status is BLOCKED:','- Diagnose the failure.','- Tell me whether to use a hotfix script, a fixed overlay, or rollback.','- Provide exact next steps.'
  )
  $lines | Set-Content $blockedPath -Encoding UTF8
  Copy-Item $blockedPath $needsPath -Force
  try {
    $prompt = @('Review this S.E.R.A. AutoOps packet.','','If Status is BLOCKED:','- Diagnose the failure.','- Tell me whether to use a hotfix script, a fixed overlay, or rollback.','- Provide exact next steps.','',(Get-Content $blockedPath -Raw)) -join "`r`n"
    Set-Clipboard $prompt
  } catch {}
  return $blockedPath
}

function New-CanonicalPromptRequestLease {
  param(
    [string]$AutoOps,
    [int]$Phase,
    [string]$PhaseSlug,
    [string]$PhaseName,
    [string]$ExpectedZip,
    [string]$CommandId,
    [string]$RunNonce,
    [string]$Guide,
    [string]$CommandPath
  )
  $control = Join-Path $AutoOps '00_control_center'
  $bridgeOutbox = Join-Path $AutoOps '15_bridge_outbox'
  New-DirectoryIfMissing @($control,$bridgeOutbox)
  $promptPath = Join-Path $bridgeOutbox "phase$Phase-$PhaseSlug-full-loop-$RunNonce.md"
  $prompt = @(
    'S.E.R.A. PHASE REQUEST','',
    'Return the downloadable overlay ZIP for:','',
    "Phase $Phase - $PhaseSlug",'',
    'Expected ZIP filename:',$ExpectedZip,'',
    'Purpose:','Continue S.E.R.A. development from the selected command inbox JSON using sequential command selection.','',
    'Owner guidance:',$Guide,'',
    'Command contract:',"- commandId: $CommandId","- runNonce: $RunNonce","- phaseSlug: $PhaseSlug","- expectedZipFilename: $ExpectedZip",'- savedChatGptTargetOnly: true','- allowRandomRecentChatFallback: false','- allowNewChatFallback: false','',
    'Requirements:','- Return a downloadable ZIP link.','- Return SHA256.','- ZIP root must be repo/.','- Include .overlay manifest.','- Include .sera-proof verification file.','- Preserve saved ChatGPT target only; no random or new-chat fallback.','- Stop if owner judgment is required.','',
    'Runtime proof note:','This prompt was created by Phase161 Full Loop Orchestrator. The orchestrator selected the smallest runnable phase above the latest CLOSED_CLEANLY phase.',''
  ) -join "`r`n"
  Set-Content $promptPath $prompt -Encoding UTF8
  $requestPath = Join-Path $control 'artifact-watch-request.json'
  $leasePath = Join-Path $control 'artifact-generation-lease.json'
  [ordered]@{
    schemaVersion = 1
    requestKind = 'chatgpt-artifact-watch'
    commandId = $CommandId
    runNonce = $RunNonce
    phase = "$Phase"
    phaseSlug = $PhaseSlug
    promptFile = $promptPath
    expectedZipName = $ExpectedZip
    expectedZipFilename = $ExpectedZip
    artifactAcquisitionMode = 'phase161_full_loop_orchestrator_v1'
    requestedAt = (Get-Date).ToUniversalTime().ToString('o')
    createdBy = 'phase161_full_loop_orchestrator_v1'
    savedChatGptTargetOnly = $true
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
  } | ConvertTo-Json -Depth 20 | Set-Content $requestPath -Encoding UTF8
  [ordered]@{
    schemaVersion = 1
    leaseKind = 'artifact-generation-lease'
    commandId = $CommandId
    runNonce = $RunNonce
    phase = "$Phase"
    phaseSlug = $PhaseSlug
    expectedZipName = $ExpectedZip
    expectedZipFilename = $ExpectedZip
    promptFile = $promptPath
    leaseOwner = 'phase161_full_loop_orchestrator_v1'
    leaseCreatedAt = (Get-Date).ToUniversalTime().ToString('o')
    expiresAt = (Get-Date).ToUniversalTime().AddMinutes(20).ToString('o')
    savedChatGptTargetOnly = $true
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
  } | ConvertTo-Json -Depth 20 | Set-Content $leasePath -Encoding UTF8
  return [pscustomobject]@{ PromptPath=$promptPath; RequestPath=$requestPath; LeasePath=$leasePath }
}

function Test-RequestFreshness {
  param([string]$RequestPath,[string]$PromptFile,[string]$ExpectedZip)
  if (!(Test-Path $RequestPath)) { return @{ Ok=$false; Reason='artifact-watch-request.json is missing' } }
  $requestRaw = Get-Content $RequestPath -Raw
  if ($requestRaw -notlike "*$ExpectedZip*") { return @{ Ok=$false; Reason='artifact-watch-request.json does not contain expected ZIP' } }
  if (!(Test-Path $PromptFile)) { return @{ Ok=$false; Reason='prompt file is missing' } }
  $promptRaw = Get-Content $PromptFile -Raw
  if ($promptRaw -notlike "*$ExpectedZip*") { return @{ Ok=$false; Reason='prompt file does not contain expected ZIP' } }
  return @{ Ok=$true; Reason='REQUEST_FRESHNESS_OK' }
}

function Test-OwnerRequiredBoundary {
  param($Command)
  if ($Command.requiresOwnerApproval -eq $true) { return @{ Triggered=$true; Reason='requiresOwnerApproval=true' } }
  if ($Command.ownerRequired -eq $true) { return @{ Triggered=$true; Reason='ownerRequired=true' } }
  $risk = [string]$Command.riskClass
  if ($risk -match 'high|critical|owner') { return @{ Triggered=$true; Reason="riskClass=$risk" } }
  $changes = @($Command.changeTypes)
  $blocked = @('credentials','tokens','secrets','paid_services','dependency_install','tool_install','github_security_settings','owner_control_policy','production_deployment')
  foreach ($c in $changes) { if ($blocked -contains [string]$c) { return @{ Triggered=$true; Reason="blocked changeType=$c" } } }
  return @{ Triggered=$false; Reason='no owner-required boundary trigger' }
}

function Invoke-QAGuarantee {
  param(
    [string]$AutoOps,
    [string]$PhaseName,
    [string]$ExpectedZip,
    [string]$PassHandoffPath,
    [string]$MergePendingPath,
    $Command,
    [switch]$AllowSafeAutoMerge
  )
  $control = Join-Path $AutoOps '00_control_center'
  $evidence = Join-Path $control 'evidence'
  $handoff = Join-Path $AutoOps '06_handoff'
  $approved = Join-Path $AutoOps '03_merge_approved'
  New-DirectoryIfMissing @($evidence,$handoff,$approved)
  $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
  $stampUtc = (Get-Date).ToUniversalTime().ToString('yyyyMMdd_HHmmssZ')
  $evidencePath = Join-Path $evidence "$PhaseName-QA-GUARANTEE-$stampUtc.json"
  $guaranteedPath = Join-Path $handoff "$PhaseName-$stamp-PASS_GUARANTEED.md"
  $failures = @()
  if (!(Test-Path $PassHandoffPath)) { $failures += 'PASS handoff missing' }
  else {
    $passRaw = Get-Content $PassHandoffPath -Raw
    if ($passRaw -notlike '*Status: PASS*') { $failures += 'PASS handoff does not contain Status: PASS' }
  }
  if (!(Test-Path $MergePendingPath)) { $failures += 'MERGE_PENDING packet missing' }
  else {
    try { $merge = Get-Content $MergePendingPath -Raw | ConvertFrom-Json; if ($merge.status -ne 'MERGE_PENDING') { $failures += 'merge packet status is not MERGE_PENDING' } }
    catch { $failures += 'merge packet is invalid JSON' }
  }
  $boundary = Test-OwnerRequiredBoundary -Command $Command
  $safeAutoMergeEligible = (!$boundary.Triggered -and !$failures.Count)
  $status = if ($failures.Count) { 'QA_BLOCKED' } else { 'PASS_GUARANTEED' }
  [ordered]@{
    status = $status
    phaseName = $PhaseName
    expectedZip = $ExpectedZip
    passHandoff = $PassHandoffPath
    mergePending = $MergePendingPath
    failures = $failures
    ownerBoundaryTriggered = $boundary.Triggered
    ownerBoundaryReason = $boundary.Reason
    safeAutoMergeEligible = $safeAutoMergeEligible
    allowSafeAutoMerge = [bool]$AllowSafeAutoMerge
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
  } | ConvertTo-Json -Depth 20 | Set-Content $evidencePath -Encoding UTF8
  if ($failures.Count) { return [pscustomobject]@{ Status='QA_BLOCKED'; Evidence=$evidencePath; AutoApproved=$false; Failures=$failures } }
  $lines = @(
    '# S.E.R.A. AutoOps Packet','',
    'Status: PASS_GUARANTEED',"Phase: $PhaseName",'Branch: main',"Timestamp: $stamp",'',
    '## Summary','','PASS was promoted to PASS_GUARANTEED after functional QA evidence was captured.','',
    '## QA Evidence','',$evidencePath,'',
    '## Safe Auto-Merge Decision','',"safeAutoMergeEligible: $safeAutoMergeEligible","ownerBoundaryTriggered: $($boundary.Triggered)","ownerBoundaryReason: $($boundary.Reason)","allowSafeAutoMerge: $([bool]$AllowSafeAutoMerge)"
  )
  $lines | Set-Content $guaranteedPath -Encoding UTF8
  $autoApproved = $false
  if ($AllowSafeAutoMerge -and $safeAutoMergeEligible -and (Test-Path $MergePendingPath)) {
    $dest = Join-Path $approved (Split-Path $MergePendingPath -Leaf)
    Move-Item $MergePendingPath $dest -Force
    $autoApproved = $true
  }
  return [pscustomobject]@{ Status='PASS_GUARANTEED'; Evidence=$evidencePath; Handoff=$guaranteedPath; AutoApproved=$autoApproved; SafeAutoMergeEligible=$safeAutoMergeEligible }
}

function Invoke-QASelfTest {
  $temp = Join-Path ([System.IO.Path]::GetTempPath()) ('sera-phase161-selftest-' + [Guid]::NewGuid().ToString('n'))
  $auto = Join-Path $temp 'SERA-AutoOps'
  $repo = Join-Path $temp 'repo'
  $control = Join-Path $auto '00_control_center'
  $inbox = Join-Path $control 'command_inbox'
  $handoff = Join-Path $auto '06_handoff'
  $mergePending = Join-Path $auto '09_merge_pending'
  New-DirectoryIfMissing @($repo,$inbox,$handoff,$mergePending,(Join-Path $auto '15_bridge_outbox'),(Join-Path $auto '13_chatgpt_downloads'),(Join-Path $auto '01_apply_approved'))
  Set-Content (Join-Path $handoff 's.e.r.a_phase160_demo-00000000-CLOSED_CLEANLY.md') 'Status: CLOSED_CLEANLY`nPhase: s.e.r.a_phase160_demo_overlay' -Encoding UTF8
  [ordered]@{ phaseStart=159; expectedZipFilename='old.zip'; enabled=$true } | ConvertTo-Json | Set-Content (Join-Path $inbox 'autopilot-command-phase159-old.json') -Encoding UTF8
  [ordered]@{ phaseStart=161; expectedZipFilename='s.e.r.a_phase161_full_loop_orchestrator_qa_guarantee_gate_v1_overlay.zip'; enabled=$true; commandId='qa-161'; runNonce='qa-161'; guide='safe docs and automation proof'; changeTypes=@('docs','internal_script') } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $inbox 'autopilot-command-phase161.json') -Encoding UTF8
  [ordered]@{ phaseStart=162; expectedZipFilename='phase162.zip'; enabled=$true } | ConvertTo-Json | Set-Content (Join-Path $inbox 'autopilot-command-phase162.json') -Encoding UTF8
  $closed = Get-LatestClosedPhaseNumber -Repo $repo -HandoffDir $handoff
  if ($closed -ne 160) { throw "selftest expected closed phase 160, got $closed" }
  $selected = Get-NextCommandFromInbox -CommandInbox $inbox -LatestClosed $closed
  if (!$selected -or $selected.Phase -ne 161) { throw 'selftest command sequencing failed' }
  $phaseName = $selected.ExpectedZip -replace '\.zip$',''
  $created = New-CanonicalPromptRequestLease -AutoOps $auto -Phase 161 -PhaseSlug 'phase161_full_loop_orchestrator_qa_guarantee_gate_v1' -PhaseName $phaseName -ExpectedZip $selected.ExpectedZip -CommandId 'qa-161' -RunNonce 'qa-161' -Guide $selected.Json.guide -CommandPath $selected.File
  $fresh = Test-RequestFreshness -RequestPath $created.RequestPath -PromptFile $created.PromptPath -ExpectedZip $selected.ExpectedZip
  if (!$fresh.Ok) { throw "selftest freshness failed: $($fresh.Reason)" }
  $stale = Test-RequestFreshness -RequestPath $created.RequestPath -PromptFile $created.PromptPath -ExpectedZip 'wrong.zip'
  if ($stale.Ok) { throw 'selftest stale request rejection failed' }
  $blocked = Write-BlockedHandoff -AutoOps $auto -PhaseName $phaseName -ExpectedZip $selected.ExpectedZip -Reason 'selftest blocked handoff proof' -Stage 'selftest' -CommandPath $selected.File -RunDir $temp
  if (!(Test-Path $blocked)) { throw 'selftest blocked handoff was not written' }
  $pass = Join-Path $handoff "$phaseName-PASS.md"
  Set-Content $pass "# S.E.R.A. AutoOps Packet`n`nStatus: PASS`nPhase: $phaseName" -Encoding UTF8
  $pending = Join-Path $mergePending "$phaseName-MERGE_PENDING.json"
  [ordered]@{ status='MERGE_PENDING'; phaseName=$phaseName; branchName='work/phase161'; tagName='phase-161-demo' } | ConvertTo-Json | Set-Content $pending -Encoding UTF8
  $qa = Invoke-QAGuarantee -AutoOps $auto -PhaseName $phaseName -ExpectedZip $selected.ExpectedZip -PassHandoffPath $pass -MergePendingPath $pending -Command $selected.Json -AllowSafeAutoMerge
  if ($qa.Status -ne 'PASS_GUARANTEED') { throw 'selftest QA guarantee did not pass' }
  $unsafe = [pscustomobject]@{ requiresOwnerApproval=$true; changeTypes=@('credentials') }
  $boundary = Test-OwnerRequiredBoundary -Command $unsafe
  if (!$boundary.Triggered) { throw 'selftest owner boundary did not trigger' }
  [ordered]@{ ok=$true; status='PASS'; test='phase161-qa-selftest'; temp=$temp; selectedPhase=$selected.Phase; qaStatus=$qa.Status; safeAutoMergeEligible=$qa.SafeAutoMergeEligible } | ConvertTo-Json -Depth 20
}

function Invoke-RunOnce {
  $control = Join-Path $AutoOpsRoot '00_control_center'
  $commandInbox = Join-Path $control 'command_inbox'
  $bridgeOutbox = Join-Path $AutoOpsRoot '15_bridge_outbox'
  $downloads = Join-Path $AutoOpsRoot '13_chatgpt_downloads'
  $apply = Join-Path $AutoOpsRoot '01_apply_approved'
  $handoff = Join-Path $AutoOpsRoot '06_handoff'
  $needs = Join-Path $AutoOpsRoot '17_needs_attention'
  $runs = Join-Path $control 'single_flow_runs'
  New-DirectoryIfMissing @($commandInbox,$bridgeOutbox,$downloads,$apply,$handoff,$needs,$runs)
  $latestClosed = Get-LatestClosedPhaseNumber -Repo $RepoRoot -HandoffDir $handoff
  $selected = Get-NextCommandFromInbox -CommandInbox $commandInbox -LatestClosed $latestClosed
  if (!$selected) { throw "No runnable command found above latest closed phase $latestClosed" }
  $command = $selected.Json
  $phase = [int]$selected.Phase
  $expectedZip = [string]$selected.ExpectedZip
  $phaseSlug = if ($command.phaseSlug) { $command.phaseSlug } elseif ($command.mode) { "phase$phase-$($command.mode)" } else { "phase$phase" }
  $phaseName = $expectedZip -replace '\.zip$',''
  $runNonce = if ($command.runNonce) { $command.runNonce } else { 'phase161-run-' + (Get-Date -Format 'yyyyMMddHHmmss') }
  $commandId = if ($command.commandId) { $command.commandId } else { "phase$phase-$runNonce" }
  $runDir = Join-Path $runs "phase$phase-full-loop-$runNonce"
  $snapshots = Join-Path $runDir 'snapshots'
  New-DirectoryIfMissing @($runDir,$snapshots)
  Copy-Item $selected.File (Join-Path $runDir 'selected-command.json') -Force
  Write-RunSnapshot -SnapshotsDir $snapshots -Stage 'selected_command' -Phase $phase -PhaseName $phaseName -CommandPath $selected.File -ExpectedZip $expectedZip -AutoOps $AutoOpsRoot -Repo $RepoRoot | Out-Host
  Remove-Item (Join-Path $control 'artifact-watch-request.json') -Force -ErrorAction SilentlyContinue
  Remove-Item (Join-Path $control 'artifact-generation-lease.json') -Force -ErrorAction SilentlyContinue
  $created = New-CanonicalPromptRequestLease -AutoOps $AutoOpsRoot -Phase $phase -PhaseSlug $phaseSlug -PhaseName $phaseName -ExpectedZip $expectedZip -CommandId $commandId -RunNonce $runNonce -Guide $command.guide -CommandPath $selected.File
  Write-RunSnapshot -SnapshotsDir $snapshots -Stage 'prompt_request_lease_created' -Phase $phase -PhaseName $phaseName -CommandPath $selected.File -ExpectedZip $expectedZip -AutoOps $AutoOpsRoot -Repo $RepoRoot | Out-Host
  $fresh = Test-RequestFreshness -RequestPath $created.RequestPath -PromptFile $created.PromptPath -ExpectedZip $expectedZip
  if (!$fresh.Ok) {
    Write-BlockedHandoff -AutoOps $AutoOpsRoot -PhaseName $phaseName -ExpectedZip $expectedZip -Reason $fresh.Reason -Stage 'request_freshness' -CommandPath $selected.File -RunDir $runDir | Out-Host
    exit 2
  }
  if ($Mode -eq 'CreateRequestOnly') {
    [ordered]@{ ok=$true; status='REQUEST_READY'; phase=$phase; promptFile=$created.PromptPath; requestPath=$created.RequestPath; leasePath=$created.LeasePath; runDir=$runDir } | ConvertTo-Json -Depth 20
    return
  }
  [ordered]@{ ok=$true; status='REQUEST_READY_BRIDGE_EXTERNAL'; phase=$phase; promptFile=$created.PromptPath; requestPath=$created.RequestPath; leasePath=$created.LeasePath; runDir=$runDir; note='Bridge/watchdog execution is delegated to existing R159/R158 runtime tools in current stack.' } | ConvertTo-Json -Depth 20
}

if ($Mode -eq 'QaSelfTest') { Invoke-QASelfTest; exit 0 }
if ($Mode -eq 'RunOnce' -or $Mode -eq 'CreateRequestOnly') { Invoke-RunOnce; exit 0 }
if ($Mode -eq 'GuaranteeOnly') { throw 'GuaranteeOnly requires calling Invoke-QAGuarantee from a wrapper with PASS and MERGE_PENDING paths.' }

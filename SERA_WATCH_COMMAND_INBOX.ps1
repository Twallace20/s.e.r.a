param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [int]$PollSeconds = 5,
  [int]$TimeoutMinutes = 0,
  [switch]$LaunchBrowserIfNeeded
)

$ErrorActionPreference = "Stop"

$RepoRoot = [IO.Path]::GetFullPath($RepoRoot)
$CommandInbox = Join-Path $AutoOpsRoot "00_control_center\command_inbox"
$BridgeOutbox = Join-Path $AutoOpsRoot "15_bridge_outbox"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$StateDir = Join-Path $AutoOpsRoot "00_control_center\state"
$LogDir = Join-Path $AutoOpsRoot "00_control_center\logs"
$ChatGptTargets = Join-Path $AutoOpsRoot "00_control_center\chatgpt_targets"

New-Item -ItemType Directory -Force $CommandInbox | Out-Null
New-Item -ItemType Directory -Force $BridgeOutbox | Out-Null
New-Item -ItemType Directory -Force $Downloads13 | Out-Null
New-Item -ItemType Directory -Force $Handoff | Out-Null
New-Item -ItemType Directory -Force $StateDir | Out-Null
New-Item -ItemType Directory -Force $LogDir | Out-Null
New-Item -ItemType Directory -Force $ChatGptTargets | Out-Null

$ProcessedStatePath = Join-Path $StateDir "command-inbox-watcher-processed-v1.json"
$QueueStatePath = Join-Path $StateDir "autopilot-sequential-phase-queue-v1.json"
$QueueEventsPath = Join-Path $StateDir "autopilot-sequential-phase-queue-events-v1.jsonl"
$RunLockPath = Join-Path $StateDir "autopilot-sequential-phase-run-lock-v1.json"
$BlockedPausePath = Join-Path $StateDir "autopilot-sequence-paused-after-block-v1.json"
$RouterScript = Join-Path $RepoRoot "scripts\sera-command-json-route-downloads13-to-inbox-v1.ps1"

function Write-Step {
  param([string]$Message)
  Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
}

function Write-QueueEvent {
  param(
    [string]$Event,
    [hashtable]$Data = @{}
  )

  $Record = [ordered]@{
    timestamp = (Get-Date).ToString("o")
    event = $Event
    pid = $PID
  }

  foreach ($Key in ($Data.Keys | Sort-Object)) {
    $Record[$Key] = $Data[$Key]
  }

  ($Record | ConvertTo-Json -Depth 12 -Compress) | Add-Content -LiteralPath $QueueEventsPath -Encoding UTF8
}

function Get-FileSha256 {
  param([string]$Path)
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Read-JsonHashtable {
  param([string]$Path)

  if (!(Test-Path $Path)) {
    return @{}
  }

  try {
    $Raw = Get-Content -LiteralPath $Path -Raw
    if ([string]::IsNullOrWhiteSpace($Raw)) { return @{} }
    $Obj = $Raw | ConvertFrom-Json
    $Map = @{}
    foreach ($Prop in $Obj.PSObject.Properties) {
      $Map[$Prop.Name] = $Prop.Value
    }
    return $Map
  } catch {
    return @{}
  }
}

function Write-JsonHashtable {
  param(
    [string]$Path,
    [hashtable]$State
  )

  $Out = [ordered]@{}
  foreach ($Key in ($State.Keys | Sort-Object)) {
    $Out[$Key] = $State[$Key]
  }

  ($Out | ConvertTo-Json -Depth 12) | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Read-ProcessedState {
  $RawState = Read-JsonHashtable -Path $ProcessedStatePath
  $State = @{}
  foreach ($Key in $RawState.Keys) {
    $State[$Key] = [string]$RawState[$Key]
  }
  return $State
}

function Write-ProcessedState {
  param([hashtable]$State)
  Write-JsonHashtable -Path $ProcessedStatePath -State $State
}

function Get-JsonObject {
  param([string]$Path)
  return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json)
}

function Test-SafeCommandJson {
  param([string]$Path)

  $Name = Split-Path $Path -Leaf
  if ($Name -notlike "autopilot-command-*.json") {
    return $false
  }

  if ($Name -like "*package-lock*" -or $Name -eq "package.json") {
    return $false
  }

  try {
    $Json = Get-JsonObject -Path $Path
  } catch {
    return $false
  }

  $HasCommandShape = $false
  if ($Json.phaseSlug -and $Json.expectedZipFilename) { $HasCommandShape = $true }
  if ($Json.commandId -and $Json.runNonce) { $HasCommandShape = $true }

  if (!$HasCommandShape) {
    return $false
  }

  if ($Json.expectedZipFilename -and ([string]$Json.expectedZipFilename -notlike "s.e.r.a_*_overlay.zip")) {
    return $false
  }

  return $true
}

function Get-PhaseSlugFromExpectedZip {
  param([string]$ExpectedZip)

  if ($ExpectedZip -match "^s\.e\.r\.a_(.+)_overlay\.zip$") {
    return $Matches[1]
  }

  return ""
}

function Get-CommandInfoFromJson {
  param([string]$Path)

  $Json = Get-JsonObject -Path $Path
  $PhaseSlug = [string]$Json.phaseSlug
  $ExpectedZip = [string]$Json.expectedZipFilename
  $CommandId = [string]$Json.commandId
  $RunNonce = [string]$Json.runNonce
  $Sequence = [string]$Json.sequence
  $UnblockPhaseSlug = [string]$Json.unblockPhaseSlug
  $AllowWhileBlocked = $false

  if ($Json.allowWhileBlocked -eq $true) {
    $AllowWhileBlocked = $true
  }

  if ([string]::IsNullOrWhiteSpace($PhaseSlug) -and -not [string]::IsNullOrWhiteSpace($ExpectedZip)) {
    $PhaseSlug = Get-PhaseSlugFromExpectedZip -ExpectedZip $ExpectedZip
  }

  if ([string]::IsNullOrWhiteSpace($ExpectedZip) -and -not [string]::IsNullOrWhiteSpace($PhaseSlug)) {
    $ExpectedZip = "s.e.r.a_{0}_overlay.zip" -f $PhaseSlug
  }

  $Phase = ""
  if ($PhaseSlug -match "^phase(\d+)_") {
    $Phase = $Matches[1]
  } elseif ($Json.phase) {
    $Phase = [string]$Json.phase
  }

  return [pscustomobject]@{
    Path = $Path
    Phase = $Phase
    PhaseSlug = $PhaseSlug
    ExpectedZip = $ExpectedZip
    CommandId = $CommandId
    RunNonce = $RunNonce
    Sequence = $Sequence
    UnblockPhaseSlug = $UnblockPhaseSlug
    AllowWhileBlocked = $AllowWhileBlocked
  }
}

function Convert-SlugToBranchTail {
  param([string]$Slug)
  return ($Slug -replace "_", "-")
}

function Convert-SlugToTagName {
  param([string]$Slug)

  $Token = Convert-SlugToBranchTail -Slug $Slug

  if ($Token -match "^phase(\d+)-(.+)$") {
    return "phase-$($Matches[1])-$($Matches[2])"
  }

  return "phase-$Token"
}

function Get-PhaseNameFromInfo {
  param([object]$Info)

  if ($Info -and -not [string]::IsNullOrWhiteSpace([string]$Info.PhaseSlug)) {
    return "s.e.r.a_{0}_overlay" -f $Info.PhaseSlug
  }

  return "s.e.r.a_unknown_phase_overlay"
}


function Test-FinalHandoffIdentityIntegrity {
  param(
    [object]$Info,
    [string]$FinalHandoffPath,
    [string]$Status
  )

  # PHASE189_FINAL_HANDOFF_IDENTITY_INTEGRITY_GUARD
  if ([string]::IsNullOrWhiteSpace($FinalHandoffPath) -or !(Test-Path $FinalHandoffPath)) {
    return [pscustomobject]@{ Ok = $false; Reason = "Final handoff missing for identity validation." }
  }

  $ExpectedPhaseName = Get-PhaseNameFromInfo -Info $Info
  $ExpectedSlug = [string]$Info.PhaseSlug
  $ExpectedPhase = [string]$Info.Phase
  $Text = Get-Content -LiteralPath $FinalHandoffPath -Raw

  if ($Status -eq "CLOSED_CLEANLY") {
    if ($Text -notmatch "(?m)^Status:\s*CLOSED_CLEANLY\s*$") {
      return [pscustomobject]@{ Ok = $false; Reason = "CLOSED_CLEANLY final handoff missing exact Status line." }
    }

    if ($Text -notmatch [regex]::Escape("Phase: $ExpectedPhaseName")) {
      return [pscustomobject]@{ Ok = $false; Reason = "CLOSED_CLEANLY final handoff Phase line does not match current phase: $ExpectedPhaseName" }
    }

    if (-not [string]::IsNullOrWhiteSpace($ExpectedSlug) -and $Text -notlike "*$ExpectedSlug*") {
      return [pscustomobject]@{ Ok = $false; Reason = "CLOSED_CLEANLY final handoff does not mention current phaseSlug: $ExpectedSlug" }
    }

    if (-not [string]::IsNullOrWhiteSpace($ExpectedPhase) -and $Text -notlike "*Phase$ExpectedPhase*") {
      return [pscustomobject]@{ Ok = $false; Reason = "CLOSED_CLEANLY final handoff does not mention current Phase$ExpectedPhase." }
    }

    $ForbiddenResultPatterns = @(
      "Result:\s*Phase180\s+closed cleanly",
      "Result:\s*Phase186\s+closed cleanly",
      "Result:\s*Phase187\s+closed cleanly",
      "Result:\s*Phase188\s+closed cleanly"
    )

    foreach ($Pattern in $ForbiddenResultPatterns) {
      if ($Text -match $Pattern) {
        return [pscustomobject]@{ Ok = $false; Reason = "STALE_HANDOFF_REJECTED: final handoff contains older phase as result phase: $Pattern" }
      }
    }
  }

  return [pscustomobject]@{ Ok = $true; Reason = "FINAL_HANDOFF_IDENTITY_VALIDATED" }
}

function Invoke-WithSupportedParams {
  param(
    [string]$ScriptPath,
    [hashtable]$Params
  )

  if (!(Test-Path $ScriptPath)) {
    throw "Script missing: $ScriptPath"
  }

  $CommandInfo = Get-Command $ScriptPath
  $InvokeParams = @{}

  foreach ($Key in $Params.Keys) {
    if ($CommandInfo.Parameters.ContainsKey($Key)) {
      $InvokeParams[$Key] = $Params[$Key]
    }
  }

  & $ScriptPath @InvokeParams
  $Code = $LASTEXITCODE
  if ($null -eq $Code) { $Code = 0 }
  return $Code
}

function Invoke-Downloads13CommandJsonRouter {
  if (Test-Path $RouterScript) {
    try {
      powershell.exe -NoProfile -ExecutionPolicy Bypass -File $RouterScript -AutoOpsRoot $AutoOpsRoot -Once
      Write-Step "COMMAND_JSON_ROUTER_EXIT code=$LASTEXITCODE"
    } catch {
      Write-Step "COMMAND_JSON_ROUTER_ERROR $($_.Exception.Message)"
      Write-QueueEvent "COMMAND_JSON_ROUTER_ERROR" @{ error = $_.Exception.Message }
    }
  }
}

function Get-BlockedPause {
  if (!(Test-Path $BlockedPausePath)) {
    return $null
  }

  try {
    return (Get-Content -LiteralPath $BlockedPausePath -Raw | ConvertFrom-Json)
  } catch {
    return $null
  }
}

function Test-CommandAllowedDuringBlockedPause {
  param([object]$Info)

  $Pause = Get-BlockedPause
  if (!$Pause) {
    return $true
  }

  $BlockedPhaseSlug = [string]$Pause.blockedPhaseSlug
  if ([string]::IsNullOrWhiteSpace($BlockedPhaseSlug)) {
    return $false
  }

  if ($Info.AllowWhileBlocked) {
    return $true
  }

  if ([string]$Info.PhaseSlug -eq $BlockedPhaseSlug) {
    return $true
  }

  if ([string]$Info.UnblockPhaseSlug -eq $BlockedPhaseSlug) {
    return $true
  }

  if ([string]$Info.CommandId -like "*hotfix*" -or [string]$Info.CommandId -like "*repair*" -or [string]$Info.CommandId -like "*unblock*") {
    return $true
  }

  Write-Step "AUTOPILOT_QUEUE_PAUSED_SKIPPING_DOWNSTREAM blockedPhase=$BlockedPhaseSlug pendingPhase=$($Info.PhaseSlug)"
  return $false
}

function Get-PendingCommandJson {
  $State = Read-ProcessedState
  $Candidates = @()

  $Files = Get-ChildItem $CommandInbox -File -Filter "autopilot-command-*.json" -ErrorAction SilentlyContinue

  foreach ($Candidate in $Files) {
    if (!(Test-SafeCommandJson -Path $Candidate.FullName)) {
      continue
    }

    $Hash = Get-FileSha256 -Path $Candidate.FullName
    $Key = $Candidate.FullName.ToLowerInvariant()

    if ($State.ContainsKey($Key) -and $State[$Key] -eq $Hash) {
      continue
    }

    $Info = Get-CommandInfoFromJson -Path $Candidate.FullName

    if (!(Test-CommandAllowedDuringBlockedPause -Info $Info)) {
      continue
    }

    $PhaseSort = 999999
    $ParsedPhase = 0
    if ([int]::TryParse([string]$Info.Phase, [ref]$ParsedPhase)) {
      $PhaseSort = $ParsedPhase
    }

    $Candidates += [pscustomobject]@{
      Path = $Candidate.FullName
      Hash = $Hash
      Key = $Key
      Info = $Info
      PhaseSort = $PhaseSort
      LastWriteTime = $Candidate.LastWriteTime
    }
  }

  return $Candidates |
    Sort-Object @{ Expression = "PhaseSort"; Ascending = $true }, @{ Expression = "LastWriteTime"; Ascending = $true } |
    Select-Object -First 1
}

function Mark-CommandProcessed {
  param(
    [string]$Key,
    [string]$Hash
  )

  $State = Read-ProcessedState
  $State[$Key] = $Hash
  Write-ProcessedState -State $State
}

function Test-ProcessAlive {
  param([int]$ProcessId)

  try {
    Get-Process -Id $ProcessId -ErrorAction Stop | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Enter-AutopilotRunLock {
  param([object]$Command)

  if (Test-Path $RunLockPath) {
    try {
      $Lock = Get-Content -LiteralPath $RunLockPath -Raw | ConvertFrom-Json
      $LockPid = [int]$Lock.pid

      if ($LockPid -gt 0 -and (Test-ProcessAlive -ProcessId $LockPid)) {
        Write-Step "AUTOPILOT_RUN_LOCK_HELD pid=$LockPid command=$($Lock.commandPath)"
        return $false
      }

      Write-Step "AUTOPILOT_STALE_RUN_LOCK_CLEARED pid=$LockPid"
      Remove-Item -LiteralPath $RunLockPath -Force -ErrorAction SilentlyContinue
    } catch {
      Write-Step "AUTOPILOT_CORRUPT_RUN_LOCK_CLEARED reason=$($_.Exception.Message)"
      Remove-Item -LiteralPath $RunLockPath -Force -ErrorAction SilentlyContinue
    }
  }

  $Record = [ordered]@{
    pid = $PID
    startedAt = (Get-Date).ToString("o")
    commandPath = $Command.Path
    commandHash = $Command.Hash
    phaseSlug = $Command.Info.PhaseSlug
    expectedZip = $Command.Info.ExpectedZip
  }

  ($Record | ConvertTo-Json -Depth 12) | Set-Content -LiteralPath $RunLockPath -Encoding UTF8
  Write-Step "AUTOPILOT_RUN_LOCK_ACQUIRED pid=$PID phase=$($Command.Info.PhaseSlug)"
  Write-QueueEvent "AUTOPILOT_RUN_LOCK_ACQUIRED" @{ phaseSlug = $Command.Info.PhaseSlug; commandPath = $Command.Path }
  return $true
}

function Exit-AutopilotRunLock {
  if (!(Test-Path $RunLockPath)) {
    return
  }

  try {
    $Lock = Get-Content -LiteralPath $RunLockPath -Raw | ConvertFrom-Json
    if ([int]$Lock.pid -eq $PID) {
      Remove-Item -LiteralPath $RunLockPath -Force -ErrorAction SilentlyContinue
      Write-Step "AUTOPILOT_RUN_LOCK_RELEASED pid=$PID"
    }
  } catch {
    Remove-Item -LiteralPath $RunLockPath -Force -ErrorAction SilentlyContinue
    Write-Step "AUTOPILOT_RUN_LOCK_RELEASED_CORRUPT_REMOVED"
  }
}

function Get-LatestFinalHandoff {
  param(
    [object]$Info,
    [datetime]$Since
  )

  $PhaseName = Get-PhaseNameFromInfo -Info $Info
  $Files = @()

  $Files += Get-ChildItem $Handoff -File -Filter "$PhaseName-*CLOSED_CLEANLY.md" -ErrorAction SilentlyContinue
  $Files += Get-ChildItem $Handoff -File -Filter "$PhaseName-*BLOCKED.md" -ErrorAction SilentlyContinue

  $Latest = $Files |
    Where-Object { $_.LastWriteTime -ge $Since.AddSeconds(-15) } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (!$Latest) {
    return $null
  }

  $Text = Get-Content -LiteralPath $Latest.FullName -Raw
  $Status = "UNKNOWN"
  if ($Text -match "Status:\s*(CLOSED_CLEANLY|BLOCKED)") {
    $Status = $Matches[1]
  }

  return [pscustomobject]@{
    Status = $Status
    Path = $Latest.FullName
    PhaseName = $PhaseName
  }
}

function Write-BlockedHandoff {
  param(
    [object]$Info,
    [string]$Reason
  )

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $PhaseName = Get-PhaseNameFromInfo -Info $Info
  $Path = Join-Path $Handoff "$PhaseName-$Stamp-BLOCKED.md"

  @"
Status: BLOCKED
Phase: $PhaseName
Branch: work/$(Convert-SlugToBranchTail -Slug $Info.PhaseSlug)
Timestamp: $Stamp

Reason:
$Reason

Gate result:
The autopilot sequence was halted. Downstream phases will not run until this phase is repaired or an explicit unblock/hotfix command is uploaded.

Required invariant:
Current phase must reach CLOSED_CLEANLY before the watcher continues to unrelated downstream phase JSON.

Markers:
AUTOPILOT_SEQUENCE_HALTED_ON_BLOCKED
PHASE188_BLOCKED_HANDOFF_WRITTEN
"@ | Set-Content -LiteralPath $Path -Encoding UTF8

  Write-Step "PHASE188_BLOCKED_HANDOFF_WRITTEN $Path"
  return [pscustomobject]@{
    Status = "BLOCKED"
    Path = $Path
    PhaseName = $PhaseName
  }
}

function Set-QueueState {
  param(
    [string]$Status,
    [object]$Info,
    [string]$FinalHandoffPath = "",
    [string]$Reason = ""
  )

  $State = [ordered]@{
    schema = "autopilot-sequential-phase-queue-v1"
    status = $Status
    updatedAt = (Get-Date).ToString("o")
    pid = $PID
    phase = $Info.Phase
    phaseSlug = $Info.PhaseSlug
    expectedZip = $Info.ExpectedZip
    commandId = $Info.CommandId
    runNonce = $Info.RunNonce
    finalHandoffPath = $FinalHandoffPath
    reason = $Reason
  }

  ($State | ConvertTo-Json -Depth 12) | Set-Content -LiteralPath $QueueStatePath -Encoding UTF8
  Write-QueueEvent "QUEUE_STATE_$Status" @{ phaseSlug = $Info.PhaseSlug; finalHandoffPath = $FinalHandoffPath; reason = $Reason }
}

function Set-BlockedPause {
  param(
    [object]$Info,
    [string]$FinalHandoffPath,
    [string]$Reason
  )

  $Pause = [ordered]@{
    schema = "autopilot-sequence-paused-after-block-v1"
    status = "BLOCKED"
    blockedAt = (Get-Date).ToString("o")
    blockedPhase = $Info.Phase
    blockedPhaseSlug = $Info.PhaseSlug
    commandId = $Info.CommandId
    finalHandoffPath = $FinalHandoffPath
    reason = $Reason
    allowedNext = "same phaseSlug, unblockPhaseSlug, allowWhileBlocked=true, or commandId containing hotfix/repair/unblock"
  }

  ($Pause | ConvertTo-Json -Depth 12) | Set-Content -LiteralPath $BlockedPausePath -Encoding UTF8
  Write-Step "AUTOPILOT_SEQUENCE_HALTED_ON_BLOCKED phase=$($Info.PhaseSlug) handoff=$FinalHandoffPath"
  Write-QueueEvent "AUTOPILOT_SEQUENCE_HALTED_ON_BLOCKED" @{ phaseSlug = $Info.PhaseSlug; finalHandoffPath = $FinalHandoffPath; reason = $Reason }
}

function Clear-BlockedPauseIfResolved {
  param([object]$Info)

  $Pause = Get-BlockedPause
  if (!$Pause) {
    return
  }

  if ([string]$Pause.blockedPhaseSlug -eq [string]$Info.PhaseSlug -or [string]$Info.UnblockPhaseSlug -eq [string]$Pause.blockedPhaseSlug) {
    Remove-Item -LiteralPath $BlockedPausePath -Force -ErrorAction SilentlyContinue
    Write-Step "AUTOPILOT_BLOCKED_PAUSE_CLEARED phase=$($Info.PhaseSlug)"
    Write-QueueEvent "AUTOPILOT_BLOCKED_PAUSE_CLEARED" @{ phaseSlug = $Info.PhaseSlug }
  }
}


function Ensure-SavedChatGptTargetForPreseededZip {
  param([object]$Info)

  $TargetPath = Join-Path $ChatGptTargets ("{0}-saved-chatgpt-target.json" -f $Info.PhaseSlug)

  if (Test-Path $TargetPath) {
    Write-Step "SAVED_CHATGPT_TARGET_READY_FOR_PRESEEDED_ZIP $TargetPath"
    Write-QueueEvent "SAVED_CHATGPT_TARGET_READY_FOR_PRESEEDED_ZIP" @{ phaseSlug = $Info.PhaseSlug; targetPath = $TargetPath }
    return [pscustomobject]@{ Ok = $true; Path = $TargetPath; Reason = "existing phase target" }
  }

  $Source = Get-ChildItem $ChatGptTargets -File -Filter "*-saved-chatgpt-target.json" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -ne $TargetPath } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (!$Source) {
    return [pscustomobject]@{ Ok = $false; Path = ""; Reason = "Saved ChatGPT target missing for preseeded ZIP and no continuity target is available." }
  }

  try {
    $Raw = Get-Content -LiteralPath $Source.FullName -Raw
    $Obj = $Raw | ConvertFrom-Json
    $Obj | Add-Member -NotePropertyName "targetContinuityCopiedForPhaseSlug" -NotePropertyValue ([string]$Info.PhaseSlug) -Force
    $Obj | Add-Member -NotePropertyName "targetContinuitySourcePath" -NotePropertyValue $Source.FullName -Force
    $Obj | Add-Member -NotePropertyName "targetContinuityCopiedAt" -NotePropertyValue (Get-Date).ToString("o") -Force
    ($Obj | ConvertTo-Json -Depth 24) | Set-Content -LiteralPath $TargetPath -Encoding UTF8
  } catch {
    Copy-Item -LiteralPath $Source.FullName -Destination $TargetPath -Force
  }

  Write-Step "SAVED_CHATGPT_TARGET_CAPTURED_FOR_PRESEEDED_ZIP $TargetPath source=$($Source.FullName)"
  Write-Step "PHASE190_PRESEEDED_ZIP_SAVED_TARGET_CONTINUITY source=$($Source.FullName) target=$TargetPath"
  Write-QueueEvent "SAVED_CHATGPT_TARGET_CAPTURED_FOR_PRESEEDED_ZIP" @{ phaseSlug = $Info.PhaseSlug; targetPath = $TargetPath; sourcePath = $Source.FullName }
  return [pscustomobject]@{ Ok = $true; Path = $TargetPath; Reason = "continuity target copied" }
}

function Invoke-FullAutoLoopForCommand {
  param([object]$Command)

  $CommandPath = $Command.Path
  $Info = $Command.Info
  $RunStartedAt = Get-Date

  Write-Step "NEW_COMMAND_JSON_DETECTED $CommandPath"
  Write-Step "FULL_AUTO_LOOP_START command=$CommandPath phase=$($Info.PhaseSlug)"
  Set-QueueState -Status "RUNNING" -Info $Info

  $Unified = Join-Path $RepoRoot "scripts\sera-unified-phone-json-to-closeout-v1.ps1"
  $Bridge = Join-Path $RepoRoot "scripts\sera-chatgpt-browser-bridge-v1.ps1"
  $DirectCloseout = Join-Path $RepoRoot "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1"

  if (!(Test-Path $Unified)) {
    throw "Unified phone JSON runner missing: $Unified"
  }

  Write-Step "PRODUCTION_JSON_PICKUP_RUNNER_START"
  Write-Step "COMMAND_JSON_FOUND phase=$($Info.Phase) path=$CommandPath"
  Write-Step "RUN: unified runonce request ready"

  $UnifiedParams = @{
    Mode = "RunOnce"
    RepoRoot = $RepoRoot
    AutoOpsRoot = $AutoOpsRoot
    WaitForZipSeconds = 0
    NoApply = $true
  }

  $UnifiedCode = Invoke-WithSupportedParams -ScriptPath $Unified -Params $UnifiedParams
  Write-Step "UNIFIED_RUNONCE_EXIT code=$UnifiedCode"

  if ($UnifiedCode -ne 0) {
    throw "Unified request-ready runner failed with exit $UnifiedCode"
  }


  # PHASE196_ACTIVE_COMMAND_IDENTITY_GUARD
  # The unified runonce/router may archive a stale command and create a newer request.
  # If that happens, this watcher must not continue with old $Info metadata and close the wrong phase.
  if (!(Test-Path -LiteralPath $CommandPath)) {
    Write-Step "PHASE196_ACTIVE_COMMAND_IDENTITY_CHANGED_SKIP reason=command_archived_after_unified_runonce command=$CommandPath phase=$($Info.PhaseSlug)"
    Write-QueueEvent "PHASE196_ACTIVE_COMMAND_IDENTITY_CHANGED_SKIP" @{
      reason = "command_archived_after_unified_runonce"
      phaseSlug = $Info.PhaseSlug
      expectedZip = $Info.ExpectedZip
      commandPath = $CommandPath
    }
    return [pscustomobject]@{
      Status = "SKIPPED_STALE"
      Path = ""
      PhaseName = Get-PhaseNameFromInfo -Info $Info
      Reason = "Active command was archived or removed after unified runonce."
    }
  }

  $CurrentCommandHash = Get-FileSha256 -Path $CommandPath
  if ($CurrentCommandHash -ne $Command.Hash) {
    Write-Step "PHASE196_ACTIVE_COMMAND_IDENTITY_CHANGED_SKIP reason=command_hash_changed_after_unified_runonce command=$CommandPath phase=$($Info.PhaseSlug)"
    Write-QueueEvent "PHASE196_ACTIVE_COMMAND_IDENTITY_CHANGED_SKIP" @{
      reason = "command_hash_changed_after_unified_runonce"
      phaseSlug = $Info.PhaseSlug
      expectedZip = $Info.ExpectedZip
      commandPath = $CommandPath
    }
    return [pscustomobject]@{
      Status = "SKIPPED_STALE"
      Path = ""
      PhaseName = Get-PhaseNameFromInfo -Info $Info
      Reason = "Active command hash changed after unified runonce."
    }
  }

  if (Test-Path -LiteralPath $QueueStatePath) {
    try {
      $CurrentQueueState = Get-Content -LiteralPath $QueueStatePath -Raw | ConvertFrom-Json
      $QueuePhaseSlug = [string]$CurrentQueueState.phaseSlug
      $QueueExpectedZip = [string]$CurrentQueueState.expectedZip

      if (
        -not [string]::IsNullOrWhiteSpace($QueuePhaseSlug) -and
        -not [string]::IsNullOrWhiteSpace($QueueExpectedZip) -and
        ($QueuePhaseSlug -ne [string]$Info.PhaseSlug -or $QueueExpectedZip -ne [string]$Info.ExpectedZip)
      ) {
        Write-Step "PHASE196_ACTIVE_COMMAND_IDENTITY_CHANGED_SKIP reason=queue_identity_changed activePhase=$($Info.PhaseSlug) queuePhase=$QueuePhaseSlug activeZip=$($Info.ExpectedZip) queueZip=$QueueExpectedZip"
        Write-QueueEvent "PHASE196_ACTIVE_COMMAND_IDENTITY_CHANGED_SKIP" @{
          reason = "queue_identity_changed"
          activePhaseSlug = $Info.PhaseSlug
          queuePhaseSlug = $QueuePhaseSlug
          activeExpectedZip = $Info.ExpectedZip
          queueExpectedZip = $QueueExpectedZip
          commandPath = $CommandPath
        }
        return [pscustomobject]@{
          Status = "SKIPPED_STALE"
          Path = ""
          PhaseName = Get-PhaseNameFromInfo -Info $Info
          Reason = "Queue identity changed after unified runonce."
        }
      }
    } catch {
      Write-Step "PHASE196_QUEUE_IDENTITY_READ_WARNING $($_.Exception.Message)"
    }
  }

  $Prompt = Get-ChildItem $BridgeOutbox -File -Filter "*$($Info.PhaseSlug)*.md" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (!$Prompt) {
    throw "Prompt not found for phaseSlug=$($Info.PhaseSlug)"
  }

  Write-Step "REQUEST_READY phase=$($Info.Phase) prompt=$($Prompt.FullName)"
  $ZipPath = Join-Path $Downloads13 $Info.ExpectedZip
  Write-Step "WAITING_FOR_ZIP $ZipPath"
  Set-QueueState -Status "REQUEST_READY" -Info $Info -Reason $Prompt.FullName

  if (Test-Path $ZipPath) {
    Write-Step "EXACT_ZIP_ALREADY_PRESENT_SKIP_BROWSER_BRIDGE $ZipPath"
    Write-Step "PHASE188_FIX_SKIP_BROWSER_WHEN_EXACT_ZIP_PRESENT"
    Write-QueueEvent "EXACT_ZIP_ALREADY_PRESENT_SKIP_BROWSER_BRIDGE" @{ phaseSlug = $Info.PhaseSlug; zipPath = $ZipPath }
    $TargetReady = Ensure-SavedChatGptTargetForPreseededZip -Info $Info
    if (-not $TargetReady.Ok) {
      $Blocked = Write-BlockedHandoff -Info $Info -Reason $TargetReady.Reason
      return $Blocked
    }
  } else {
    if (!(Test-Path $Bridge)) {
      throw "Browser bridge missing: $Bridge"
    }

    $BridgeArgs = @{
      PromptFile = $Prompt.FullName
      ExpectedFilename = $Info.ExpectedZip
      DownloadDir = $Downloads13
      AutoOpsRoot = $AutoOpsRoot
    }

    if ($LaunchBrowserIfNeeded) {
      $BridgeArgs["LaunchBrowserIfNeeded"] = $true
    }

    $BridgeCode = Invoke-WithSupportedParams -ScriptPath $Bridge -Params $BridgeArgs
    Write-Step "BROWSER_BRIDGE_EXIT code=$BridgeCode"

    if (!(Test-Path $ZipPath)) {
      throw "Expected ZIP missing after browser bridge: $ZipPath"
    }
  }

  Write-Step "ZIP_READY $ZipPath"
  Set-QueueState -Status "ZIP_READY" -Info $Info -Reason $ZipPath
  Write-Step "RUN_DIRECT_ZIP_CLOSEOUT phase=$($Info.Phase) branch=work/$(Convert-SlugToBranchTail -Slug $Info.PhaseSlug) tag=$(Convert-SlugToTagName -Slug $Info.PhaseSlug)"

  if (!(Test-Path $DirectCloseout)) {
    throw "Direct closeout missing: $DirectCloseout"
  }

  $DirectParams = @{
    RepoRoot = $RepoRoot
    AutoOpsRoot = $AutoOpsRoot
    ZipPath = $ZipPath
    ZipFullPath = $ZipPath
    ExpectedFilename = $Info.ExpectedZip
    ExpectedZipFilename = $Info.ExpectedZip
    PhaseSlug = $Info.PhaseSlug
    Phase = $Info.Phase
    Branch = "work/" + (Convert-SlugToBranchTail -Slug $Info.PhaseSlug)
    TagName = (Convert-SlugToTagName -Slug $Info.PhaseSlug)
    SavedChatGptTargetOnly = $true
  }

  $DirectArgList = @(
    '-NoProfile','-ExecutionPolicy','Bypass','-File',$DirectCloseout,
    '-RepoRoot',$RepoRoot,
    '-AutoOpsRoot',$AutoOpsRoot,
    '-ZipPath',$ZipPath,
    '-ExpectedZipFilename',$Info.ExpectedZip,
    '-PhaseSlug',$Info.PhaseSlug,
    '-Phase',$Info.Phase,
    '-Branch',('work/' + (Convert-SlugToBranchTail -Slug $Info.PhaseSlug)),
    '-TagName',(Convert-SlugToTagName -Slug $Info.PhaseSlug),
    '-SavedChatGptTargetOnly'
  )
  & powershell.exe @DirectArgList
  $DirectCode = $LASTEXITCODE
  if ($null -eq $DirectCode) { $DirectCode = 0 }
  Write-Step "DIRECT_CLOSEOUT_EXIT code=$DirectCode"

  $Final = Get-LatestFinalHandoff -Info $Info -Since $RunStartedAt

  if ($DirectCode -ne 0) {
    if ($Final) {
      return $Final
    }

    throw "Direct closeout failed with exit $DirectCode and no final handoff was found."
  }

  if (!$Final) {
    throw "Direct closeout exited 0 but no CLOSED_CLEANLY or BLOCKED handoff was found for phaseSlug=$($Info.PhaseSlug)."
  }

  $Integrity = Test-FinalHandoffIdentityIntegrity -Info $Info -FinalHandoffPath $Final.Path -Status $Final.Status
  if (-not $Integrity.Ok) {
    Write-Step "STALE_HANDOFF_REJECTED phase=$($Info.PhaseSlug) reason=$($Integrity.Reason) final=$($Final.Path)"
    Write-QueueEvent "STALE_HANDOFF_REJECTED" @{ phaseSlug = $Info.PhaseSlug; finalHandoffPath = $Final.Path; reason = $Integrity.Reason }
    throw $Integrity.Reason
  }

  Write-Step "FINAL_HANDOFF_IDENTITY_VALIDATED phase=$($Info.PhaseSlug) final=$($Final.Path)"
  Write-QueueEvent "FINAL_HANDOFF_IDENTITY_VALIDATED" @{ phaseSlug = $Info.PhaseSlug; finalHandoffPath = $Final.Path }

  return $Final
}

Write-Step "COMMAND_INBOX_FOREGROUND_WATCHER_START inbox=$CommandInbox"
Write-Step "This watcher is launched by the approved auto watcher runner. No persistence was added by this script."
Write-Step "COMMAND_INBOX_BACKLOG_SCAN_START inbox=$CommandInbox"
Write-Step "PHASE188_QUEUE_CONTROLLER_ENABLED state=$QueueStatePath lock=$RunLockPath"
Write-QueueEvent "PHASE188_QUEUE_CONTROLLER_ENABLED" @{ inbox = $CommandInbox; downloads13 = $Downloads13 }

$InitialPending = Get-PendingCommandJson
if ($InitialPending) {
  Write-Step "COMMAND_INBOX_BACKLOG_COMMAND_FOUND $($InitialPending.Path)"
} else {
  Write-Step "COMMAND_INBOX_BACKLOG_EMPTY"
}

$Started = Get-Date
while ($true) {
  if ($TimeoutMinutes -gt 0 -and (Get-Date) -gt $Started.AddMinutes($TimeoutMinutes)) {
    Write-Step "COMMAND_INBOX_WATCHER_TIMEOUT minutes=$TimeoutMinutes"
    exit 0
  }

  Invoke-Downloads13CommandJsonRouter

  $Pending = Get-PendingCommandJson

  if (!$Pending) {
    Start-Sleep -Seconds $PollSeconds
    continue
  }

  if (!(Enter-AutopilotRunLock -Command $Pending)) {
    Start-Sleep -Seconds $PollSeconds
    continue
  }

  $ExitCode = 0
  $Result = $null
  $ErrorReason = ""

  try {
    $Result = Invoke-FullAutoLoopForCommand -Command $Pending
  } catch {
    $ExitCode = 1
    $ErrorReason = $_.Exception.Message
    Write-Step "FULL_LOOP_ERROR $ErrorReason"
    Write-QueueEvent "FULL_LOOP_ERROR" @{ phaseSlug = $Pending.Info.PhaseSlug; error = $ErrorReason }

    $Final = Get-LatestFinalHandoff -Info $Pending.Info -Since (Get-Date).AddMinutes(-20)
    if ($Final) {
      $Result = $Final
    } else {
      $Result = Write-BlockedHandoff -Info $Pending.Info -Reason $ErrorReason
    }
  } finally {
    Mark-CommandProcessed -Key $Pending.Key -Hash $Pending.Hash
    Exit-AutopilotRunLock
  }

  if ($Result -and $Result.Status -eq "CLOSED_CLEANLY") {
    Clear-BlockedPauseIfResolved -Info $Pending.Info
    Set-QueueState -Status "CLOSED_CLEANLY" -Info $Pending.Info -FinalHandoffPath $Result.Path
    Write-Step "FULL_LOOP_EXIT_CODE 0"
    Write-Step "WATCHER_RETURN_TO_WATCH_AFTER_RUN status=success command=$($Pending.Path) final=$($Result.Path)"
  } elseif ($Result -and $Result.Status -eq "SKIPPED_STALE") {
    $ExitCode = 0
    Write-Step "FULL_LOOP_EXIT_CODE 0"
    Write-Step "WATCHER_RETURN_TO_WATCH_AFTER_RUN status=skipped_stale command=$($Pending.Path) reason=$($Result.Reason)"
    Write-QueueEvent "WATCHER_RETURN_TO_WATCH_AFTER_RUN" @{ status = "skipped_stale"; commandPath = $Pending.Path; phaseSlug = $Pending.Info.PhaseSlug; reason = $Result.Reason }
  } elseif ($Result -and $Result.Status -eq "BLOCKED") {
    $ExitCode = 1
    Set-QueueState -Status "BLOCKED" -Info $Pending.Info -FinalHandoffPath $Result.Path -Reason $ErrorReason
    Set-BlockedPause -Info $Pending.Info -FinalHandoffPath $Result.Path -Reason $ErrorReason
    Write-Step "FULL_LOOP_EXIT_CODE 1"
    Write-Step "WATCHER_RETURN_TO_WATCH_AFTER_RUN status=blocked command=$($Pending.Path) final=$($Result.Path)"
  } else {
    $ExitCode = 1
    Set-QueueState -Status "BLOCKED" -Info $Pending.Info -Reason "No final status result object was produced."
    Set-BlockedPause -Info $Pending.Info -FinalHandoffPath "" -Reason "No final status result object was produced."
    Write-Step "FULL_LOOP_EXIT_CODE 1"
    Write-Step "WATCHER_RETURN_TO_WATCH_AFTER_RUN status=failed command=$($Pending.Path)"
  }

  Start-Sleep -Seconds $PollSeconds
}

# PHASE188_QUEUE_CONTROLLER: sequential queue state, run lock, final handoff classification, blocked pause.
# PHASE188_NO_RESCUE_PHONE_ONLY: upload command JSON, watcher routes/picks up, browser bridge, exact ZIP, direct closeout, final pasteback.
# PHASE188_BLOCKED_HANDOFF_GUARD: blocked runs halt downstream command JSON until repair/unblock command.
# PHASE188_MARKERS: COMMAND_JSON_ROUTED_FROM_DOWNLOADS13 NEW_COMMAND_JSON_DETECTED REQUEST_READY ZIP_READY RUN_DIRECT_ZIP_CLOSEOUT PASTEBACK_POSTED_TEXT_MATCH CLOSED_CLEANLY BLOCKED
# PHASE189_MARKERS: PHASE189_FINAL_HANDOFF_IDENTITY_INTEGRITY_GUARD FINAL_HANDOFF_IDENTITY_VALIDATED STALE_HANDOFF_REJECTED

# PHASE188_PRESEEDED_ZIP_BRIDGE_BYPASS_PATCH: exact expected ZIP already present skips browser bridge to prevent duplicate downloads.


# PHASE190_CLOSEOUT_ORDER_AND_HANDOFF_IDENTITY_HARD_GATE
# PHASE190_PRESEEDED_ZIP_SAVED_TARGET_CONTINUITY
# SAVED_CHATGPT_TARGET_CAPTURED_FOR_PRESEEDED_ZIP
# PHASE190_FULL_AUTOPILOT_ACCEPTANCE_MARKERS:
# COMMAND_JSON_ROUTED_FROM_DOWNLOADS13
# NEW_COMMAND_JSON_DETECTED
# EXACT_ZIP_ALREADY_PRESENT_SKIP_BROWSER_BRIDGE
# ZIP_READY
# RUN_DIRECT_ZIP_CLOSEOUT
# WATCHER_RETURN_TO_WATCH_AFTER_RUN
# BLOCKED_DOWNSTREAM_PHASES_PAUSED

# PHASE196_ACTIVE_COMMAND_IDENTITY_GUARD
# Prevents stale command metadata from continuing after unified runonce/router changes active phase identity.

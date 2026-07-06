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

New-Item -ItemType Directory -Force $CommandInbox | Out-Null
New-Item -ItemType Directory -Force $BridgeOutbox | Out-Null
New-Item -ItemType Directory -Force $Downloads13 | Out-Null
New-Item -ItemType Directory -Force $Handoff | Out-Null
New-Item -ItemType Directory -Force $StateDir | Out-Null
New-Item -ItemType Directory -Force $LogDir | Out-Null

$ProcessedStatePath = Join-Path $StateDir "command-inbox-watcher-processed-v1.json"
$RouterScript = Join-Path $RepoRoot "scripts\sera-command-json-route-downloads13-to-inbox-v1.ps1"

function Write-Step {
  param([string]$Message)
  Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
}

function Get-FileSha256 {
  param([string]$Path)
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Read-ProcessedState {
  if (!(Test-Path $ProcessedStatePath)) {
    return @{}
  }

  try {
    $Raw = Get-Content -LiteralPath $ProcessedStatePath -Raw
    if ([string]::IsNullOrWhiteSpace($Raw)) { return @{} }
    $Obj = $Raw | ConvertFrom-Json
    $Map = @{}
    foreach ($Prop in $Obj.PSObject.Properties) {
      $Map[$Prop.Name] = [string]$Prop.Value
    }
    return $Map
  } catch {
    return @{}
  }
}

function Write-ProcessedState {
  param([hashtable]$State)

  $Out = [ordered]@{}
  foreach ($Key in ($State.Keys | Sort-Object)) {
    $Out[$Key] = $State[$Key]
  }

  ($Out | ConvertTo-Json -Depth 8) | Set-Content -LiteralPath $ProcessedStatePath -Encoding UTF8
}

function Test-SafeCommandJson {
  param([string]$Path)

  $Name = Split-Path $Path -Leaf
  if ($Name -notlike "autopilot-command-*.json") {
    return $false
  }

  try {
    $Raw = Get-Content -LiteralPath $Path -Raw
    $Json = $Raw | ConvertFrom-Json
  } catch {
    return $false
  }

  if ($Json.phaseSlug -and $Json.expectedZipFilename) { return $true }
  if ($Json.commandId -and $Json.runNonce) { return $true }

  return $false
}

function Get-CommandInfoFromJson {
  param([string]$Path)

  $Json = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  $PhaseSlug = [string]$Json.phaseSlug
  $ExpectedZip = [string]$Json.expectedZipFilename
  $CommandId = [string]$Json.commandId

  $Phase = ""
  if ($PhaseSlug -match "^phase(\d+)_") {
    $Phase = $Matches[1]
  } elseif ($Json.phase) {
    $Phase = [string]$Json.phase
  }

  if ([string]::IsNullOrWhiteSpace($ExpectedZip) -and -not [string]::IsNullOrWhiteSpace($PhaseSlug)) {
    $ExpectedZip = "s.e.r.a_{0}_overlay.zip" -f $PhaseSlug
  }

  return [pscustomobject]@{
    Phase = $Phase
    PhaseSlug = $PhaseSlug
    ExpectedZip = $ExpectedZip
    CommandId = $CommandId
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
    }
  }
}

function Get-PendingCommandJson {
  $State = Read-ProcessedState
  $Candidates = Get-ChildItem $CommandInbox -File -Filter "autopilot-command-*.json" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime

  foreach ($Candidate in $Candidates) {
    if (!(Test-SafeCommandJson -Path $Candidate.FullName)) {
      continue
    }

    $Hash = Get-FileSha256 -Path $Candidate.FullName
    $Key = $Candidate.FullName.ToLowerInvariant()

    if ($State.ContainsKey($Key) -and $State[$Key] -eq $Hash) {
      continue
    }

    return [pscustomobject]@{
      Path = $Candidate.FullName
      Hash = $Hash
      Key = $Key
    }
  }

  return $null
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

function Invoke-FullAutoLoopForCommand {
  param([object]$Command)

  $CommandPath = $Command.Path
  $Info = Get-CommandInfoFromJson -Path $CommandPath

  Write-Step "NEW_COMMAND_JSON_DETECTED $CommandPath"
  Write-Step "FULL_AUTO_LOOP_START command=$CommandPath"

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

  $Prompt = Get-ChildItem $BridgeOutbox -File -Filter "*$($Info.PhaseSlug)*.md" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (!$Prompt) {
    throw "Prompt not found for phaseSlug=$($Info.PhaseSlug)"
  }

  Write-Step "REQUEST_READY phase=$($Info.Phase) prompt=$($Prompt.FullName)"
  Write-Step "WAITING_FOR_ZIP $((Join-Path $Downloads13 $Info.ExpectedZip))"

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

  $ZipPath = Join-Path $Downloads13 $Info.ExpectedZip
  if (!(Test-Path $ZipPath)) {
    throw "Expected ZIP missing after browser bridge: $ZipPath"
  }

  Write-Step "ZIP_READY $ZipPath"
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

  $DirectCode = Invoke-WithSupportedParams -ScriptPath $DirectCloseout -Params $DirectParams
  Write-Step "DIRECT_CLOSEOUT_EXIT code=$DirectCode"

  if ($DirectCode -ne 0) {
    throw "Direct closeout failed with exit $DirectCode"
  }

  return 0
}

Write-Step "COMMAND_INBOX_FOREGROUND_WATCHER_START inbox=$CommandInbox"
Write-Step "This watcher is launched by the approved auto watcher runner. No persistence was added by this script."
Write-Step "COMMAND_INBOX_BACKLOG_SCAN_START inbox=$CommandInbox"

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

  $ExitCode = 0

  try {
    $ExitCode = Invoke-FullAutoLoopForCommand -Command $Pending
  } catch {
    $ExitCode = 1
    Write-Step "FULL_LOOP_ERROR $($_.Exception.Message)"
  } finally {
    Mark-CommandProcessed -Key $Pending.Key -Hash $Pending.Hash
  }

  Write-Step "FULL_LOOP_EXIT_CODE $ExitCode"

  if ($ExitCode -ne 0) {
    Write-Step "WATCHER_RETURN_TO_WATCH_AFTER_RUN status=failed command=$($Pending.Path)"
  } else {
    Write-Step "WATCHER_RETURN_TO_WATCH_AFTER_RUN status=success command=$($Pending.Path)"
  }

  Start-Sleep -Seconds $PollSeconds
}


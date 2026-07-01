<# 
AutoOps R145 — Runtime Generation Lease + Watcher No-Refresh Enforcement v1

This script installs and runs a lease-based guard for the S.E.R.A. ChatGPT Artifact Watcher.
It is intentionally local-only. It does not change external accounts, paid services,
credentials, tokens, GitHub settings, security settings, or production deployments.

Modes:
  -Install       Install scheduled-task wrapper for "SERA ChatGPT Artifact Watcher".
  -Guard         Execute one guarded watcher pass.
  -SelfTest      Run local lease/routing self-tests in a temp AutoOps folder.
  -DryRun        Show what would be installed without changing the scheduled task.
#>

[CmdletBinding(DefaultParameterSetName = "Default")]
param(
  [string]$AutoOps = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$RepoRoot = (Get-Location).Path,
  [string]$TaskName = "SERA ChatGPT Artifact Watcher",
  [int]$LeaseMinutes = 20,
  [switch]$Install,
  [switch]$Guard,
  [switch]$SelfTest,
  [switch]$DryRun,
  [string]$OriginalActionJson = "",
  [string]$ExpectedZipName = "",
  [string]$CommandId = "",
  [string]$PhaseSlug = "",
  [int]$Phase = 0,
  [string]$PromptFile = "",
  [string]$RunNonce = ""
)

$ErrorActionPreference = "Stop"

function Get-R145Paths {
  param([string]$Root)
  $control = Join-Path $Root "00_control_center"
  [pscustomobject]@{
    AutoOps = $Root
    Control = $control
    Evidence = Join-Path $control "evidence"
    NeedsAttention = Join-Path $Root "17_needs_attention"
    Downloads = Join-Path $Root "13_chatgpt_downloads"
    ApplyApproved = Join-Path $Root "01_apply_approved"
    RuntimeGuard = Join-Path $control "runtime_guards\autoops-r145-runtime-generation-lease-watcher-no-refresh-enforcement-v1"
    LeasePath = Join-Path $control "generation-lease.json"
    SubmissionLockPath = Join-Path $control "prompt-submission-lock.json"
    DiagnosticRefreshFlag = Join-Path $control "ALLOW_BROWSER_REFRESH_DIAGNOSTIC.flag"
  }
}

function New-R145DirectorySet {
  param([object]$Paths)
  foreach ($p in @($Paths.Control, $Paths.Evidence, $Paths.NeedsAttention, $Paths.Downloads, $Paths.ApplyApproved, $Paths.RuntimeGuard)) {
    New-Item -ItemType Directory -Force $p | Out-Null
  }
}

function Write-R145Json {
  param([string]$Path, [object]$Value)
  $dir = Split-Path $Path -Parent
  if ($dir) { New-Item -ItemType Directory -Force $dir | Out-Null }
  $json = $Value | ConvertTo-Json -Depth 20
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $json, $utf8NoBom)
}

function Read-R145Json {
  param([string]$Path)
  if (!(Test-Path $Path)) { return $null }
  try {
    return Get-Content $Path -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
  } catch {
    return $null
  }
}

function Write-R145Evidence {
  param([string]$Kind, [object]$Data)
  $paths = Get-R145Paths $AutoOps
  New-R145DirectorySet $paths
  $stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd_HHmmssZ")
  $path = Join-Path $paths.Evidence "autoops-r145-$Kind-$stamp.json"
  $record = [ordered]@{
    schemaVersion = 1
    phase = "AutoOps R145"
    kind = $Kind
    createdAt = (Get-Date).ToUniversalTime().ToString("o")
    data = $Data
    safety = [ordered]@{
      savedChatGptTargetOnly = $true
      allowRandomRecentChatFallback = $false
      allowNewChatFallback = $false
      noCredentialsOrTokens = $true
      noPaidServices = $true
      noExternalAccountChanges = $true
      noGitHubSecuritySettings = $true
      noProductionDeployment = $true
      noSelfMerge = $true
    }
  }
  Write-R145Json $path $record
  return $path
}

function Get-R145CommandSignal {
  param([object]$Paths)

  $candidates = @(
    (Join-Path $Paths.Control "autopilot-command-state.json"),
    (Join-Path $Paths.Control "phone-control-watcher-state.json"),
    (Join-Path $Paths.Control "autopilot-command.json"),
    (Join-Path $Paths.Control "autopilot-status.json")
  )

  foreach ($path in $candidates) {
    $json = Read-R145Json $path
    if ($null -eq $json) { continue }

    $expected = $null
    foreach ($name in @("expectedZipName", "expectedZipFilename")) {
      if ($json.PSObject.Properties.Name -contains $name) { $expected = [string]$json.$name }
    }

    if ([string]::IsNullOrWhiteSpace($expected)) { continue }

    $cid = if ($json.PSObject.Properties.Name -contains "commandId") { [string]$json.commandId } else { "unknown-command" }
    $phaseValue = 0
    if ($json.PSObject.Properties.Name -contains "phase") { [int]$json.phase }
    elseif ($json.PSObject.Properties.Name -contains "phaseStart") { [int]$json.phaseStart }
    $slug = if ($json.PSObject.Properties.Name -contains "phaseSlug") { [string]$json.phaseSlug } else { "" }
    $nonce = if ($json.PSObject.Properties.Name -contains "runNonce") { [string]$json.runNonce } else { "" }

    return [pscustomobject]@{
      commandId = $cid
      phase = $phaseValue
      phaseSlug = $slug
      expectedZipName = $expected
      promptFile = $path
      runNonce = $nonce
      sourcePath = $path
      raw = $json
    }
  }

  return $null
}

function New-R145GenerationLease {
  param(
    [string]$CommandId,
    [int]$Phase,
    [string]$PhaseSlug,
    [string]$ExpectedZipName,
    [string]$PromptFile,
    [string]$RunNonce,
    [int]$LeaseMinutes = 20,
    [string]$SubmittedAt = ""
  )
  $paths = Get-R145Paths $AutoOps
  New-R145DirectorySet $paths
  $now = (Get-Date).ToUniversalTime()
  if ([string]::IsNullOrWhiteSpace($SubmittedAt)) { $SubmittedAt = $now.ToString("o") }

  $lease = [ordered]@{
    schemaVersion = 1
    commandId = $CommandId
    phase = $Phase
    phaseSlug = $PhaseSlug
    expectedZipName = $ExpectedZipName
    promptFile = $PromptFile
    runNonce = $RunNonce
    leaseStatus = "active"
    leaseStartedAt = $now.ToString("o")
    leaseExpiresAt = $now.AddMinutes($LeaseMinutes).ToString("o")
    lastObservedAt = $now.ToString("o")
    submittedAt = $SubmittedAt
    downloadedAt = $null
    routedAt = $null
    completedAt = $null
    failureReason = $null
    doNotRefresh = $true
    doNotResubmit = $true
    savedChatGptTargetOnly = $true
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
  }

  Write-R145Json $paths.LeasePath $lease
  Write-R145Evidence "generation-lease-created" $lease | Out-Null
  return [pscustomobject]$lease
}

function Get-R145GenerationLease {
  $paths = Get-R145Paths $AutoOps
  return Read-R145Json $paths.LeasePath
}

function Test-R145LeaseActive {
  param([object]$Lease)
  if ($null -eq $Lease) { return $false }
  if ([string]$Lease.leaseStatus -ne "active") { return $false }
  try {
    $expires = [datetime]::Parse([string]$Lease.leaseExpiresAt).ToUniversalTime()
    return $expires -gt (Get-Date).ToUniversalTime()
  } catch {
    return $false
  }
}

function Update-R145GenerationLease {
  param([hashtable]$Patch)
  $paths = Get-R145Paths $AutoOps
  $lease = Get-R145GenerationLease
  if ($null -eq $lease) { return $null }

  $dict = [ordered]@{}
  foreach ($prop in $lease.PSObject.Properties) { $dict[$prop.Name] = $prop.Value }
  foreach ($key in $Patch.Keys) { $dict[$key] = $Patch[$key] }
  $dict["lastObservedAt"] = (Get-Date).ToUniversalTime().ToString("o")
  Write-R145Json $paths.LeasePath $dict
  return [pscustomobject]$dict
}

function Get-R145FileFingerprint {
  param([string]$Path)
  if (!(Test-Path $Path)) { return $null }
  $item = Get-Item $Path
  return [pscustomobject]@{
    path = $item.FullName
    length = $item.Length
    sha256 = (Get-FileHash $item.FullName -Algorithm SHA256).Hash.ToUpperInvariant()
    lastWriteTimeUtc = $item.LastWriteTimeUtc.ToString("o")
  }
}

function Test-R145StableFile {
  param([string]$Path, [int]$DelayMilliseconds = 1500)
  $a = Get-R145FileFingerprint $Path
  if ($null -eq $a) { return [pscustomobject]@{ stable = $false; reason = "missing"; before = $null; after = $null } }
  Start-Sleep -Milliseconds $DelayMilliseconds
  $b = Get-R145FileFingerprint $Path
  if ($null -eq $b) { return [pscustomobject]@{ stable = $false; reason = "missing_after_wait"; before = $a; after = $null } }
  $stable = ($a.length -eq $b.length -and $a.sha256 -eq $b.sha256)
  return [pscustomobject]@{
    stable = $stable
    reason = if ($stable) { "size_and_hash_stable" } else { "size_or_hash_changed" }
    before = $a
    after = $b
  }
}

function Find-R145ExpectedZip {
  param([string]$ExpectedZipName)
  if ([string]::IsNullOrWhiteSpace($ExpectedZipName)) { return $null }
  $paths = Get-R145Paths $AutoOps
  $roots = @($paths.Downloads, (Join-Path $env:USERPROFILE "Downloads"), $paths.ApplyApproved)
  foreach ($root in $roots) {
    if (!(Test-Path $root)) { continue }
    $matches = @(Get-ChildItem $root -File -Filter $ExpectedZipName -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
    if ($matches.Count -gt 0) { return $matches[0] }
  }
  return $null
}

function Route-R145ExpectedZip {
  param([string]$ExpectedZipName)
  $paths = Get-R145Paths $AutoOps
  New-R145DirectorySet $paths
  $zip = Find-R145ExpectedZip $ExpectedZipName
  if ($null -eq $zip) { return [pscustomobject]@{ routed = $false; reason = "expected_zip_not_found"; expectedZipName = $ExpectedZipName } }

  $stability = Test-R145StableFile $zip.FullName
  if (-not $stability.stable) {
    return [pscustomobject]@{ routed = $false; reason = "zip_not_stable"; expectedZipName = $ExpectedZipName; sourcePath = $zip.FullName; stabilityCheckResult = $stability }
  }

  $destination = Join-Path $paths.ApplyApproved $ExpectedZipName
  if ($zip.FullName -ne $destination) {
    Copy-Item $zip.FullName $destination -Force
  }

  $fingerprint = Get-R145FileFingerprint $destination
  $route = [ordered]@{
    expectedZipName = $ExpectedZipName
    sourcePath = $zip.FullName
    destinationPath = $destination
    SHA256 = $fingerprint.sha256
    fileSize = $fingerprint.length
    stabilityCheckResult = $stability
    routeTimestamp = (Get-Date).ToUniversalTime().ToString("o")
    routeMode = if ($zip.FullName -eq $destination) { "already_in_apply_approved" } else { "copy_to_apply_approved" }
    routed = $true
  }

  Write-R145Evidence "exact-zip-routed" $route | Out-Null
  Update-R145GenerationLease @{ downloadedAt = $route.routeTimestamp; routedAt = $route.routeTimestamp; completedAt = $route.routeTimestamp; leaseStatus = "completed" } | Out-Null
  return [pscustomobject]$route
}

function New-R145NeedsAttention {
  param([object]$Lease, [string]$Reason)
  $paths = Get-R145Paths $AutoOps
  New-R145DirectorySet $paths
  $safeExpected = if ($Lease -and $Lease.expectedZipName) { ([string]$Lease.expectedZipName -replace '[^A-Za-z0-9._-]', '_') } else { "unknown_expected_zip" }
  $marker = Join-Path $paths.Control "r145-needs-attention-$safeExpected.marker"
  if (Test-Path $marker) {
    return [pscustomobject]@{ created = $false; reason = "needs_attention_already_created"; marker = $marker }
  }

  $stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd_HHmmssZ")
  $path = Join-Path $paths.NeedsAttention "AUTOOPS_R145_GENERATION_LEASE_NEEDS_ATTENTION-$stamp.md"
  $body = @"
# S.E.R.A. AutoOps R145 Needs Attention

Status: NEEDS_ATTENTION
Reason: $Reason

## Lease

````json
$($Lease | ConvertTo-Json -Depth 20)
````

## Safety

- No browser refresh was performed.
- No prompt resubmission was performed.
- Saved ChatGPT target only.
- No random recent chat fallback.
- No new-chat fallback.
- No credentials, tokens, paid services, GitHub settings changes, or production deployment.
"@
  Set-Content -Path $path -Value $body -Encoding UTF8
  Set-Content -Path $marker -Value $path -Encoding UTF8
  Write-R145Evidence "needs-attention-created" ([ordered]@{ path = $path; reason = $Reason; lease = $Lease }) | Out-Null
  Update-R145GenerationLease @{ leaseStatus = "expired"; failureReason = $Reason } | Out-Null
  return [pscustomobject]@{ created = $true; path = $path; marker = $marker }
}

function Invoke-R145OriginalAction {
  param([string]$ActionJsonPath)
  $paths = Get-R145Paths $AutoOps
  $allowRefresh = Test-Path $paths.DiagnosticRefreshFlag

  $action = Read-R145Json $ActionJsonPath
  if ($null -eq $action) {
    Write-R145Evidence "original-action-missing" ([ordered]@{ actionJsonPath = $ActionJsonPath }) | Out-Null
    return
  }

  $exe = [string]$action.Execute
  $args = [string]$action.Arguments

  if (-not $allowRefresh) {
    # Best-effort disabling for PowerShell-style watcher arguments.
    $args = $args -replace '(?i)-RefreshMinutes\s+\d+', '-RefreshMinutes 0'
    $args = $args -replace '(?i)-RefreshMs\s+\d+', '-RefreshMs 0'
    $args = $args -replace '(?i)RefreshMinutes=5', 'RefreshMinutes=0'
  }

  Write-R145Evidence "delegate-original-watcher" ([ordered]@{
    execute = $exe
    arguments = $args
    refreshAllowedByOwnerDiagnosticFlag = $allowRefresh
    defaultRefreshDisabled = -not $allowRefresh
  }) | Out-Null

  if ([string]::IsNullOrWhiteSpace($exe)) { return }
  Start-Process -FilePath $exe -ArgumentList $args -WindowStyle Hidden
}

function Invoke-R145GuardPass {
  param([string]$OriginalActionJsonPath)
  $paths = Get-R145Paths $AutoOps
  New-R145DirectorySet $paths

  $lease = Get-R145GenerationLease
  $signal = Get-R145CommandSignal $paths

  if ($null -eq $lease -and $null -ne $signal) {
    $lease = New-R145GenerationLease -CommandId $signal.commandId -Phase $signal.phase -PhaseSlug $signal.phaseSlug -ExpectedZipName $signal.expectedZipName -PromptFile $signal.promptFile -RunNonce $signal.runNonce -LeaseMinutes $LeaseMinutes
  }

  if (Test-R145LeaseActive $lease) {
    $route = Route-R145ExpectedZip -ExpectedZipName ([string]$lease.expectedZipName)
    if ($route.routed) {
      Write-R145Evidence "guard-routed-and-skipped-refresh" ([ordered]@{ lease = $lease; route = $route; doNotRefresh = $true; doNotResubmit = $true }) | Out-Null
      return
    }

    Update-R145GenerationLease @{} | Out-Null
    Write-R145Evidence "guard-observe-active-lease-skip-refresh" ([ordered]@{
      lease = $lease
      route = $route
      doNotRefresh = $true
      doNotResubmit = $true
      originalWatcherDelegated = $false
    }) | Out-Null
    return
  }

  if ($null -ne $lease -and [string]$lease.leaseStatus -eq "active") {
    New-R145NeedsAttention -Lease $lease -Reason "Generation lease expired before expected ZIP was detected and routed." | Out-Null
    return
  }

  # No active lease and no pending signal: safe to delegate, with refresh disabled unless owner diagnostic flag exists.
  Invoke-R145OriginalAction -ActionJsonPath $OriginalActionJsonPath
}

function Install-R145WatcherWrapper {
  $paths = Get-R145Paths $AutoOps
  New-R145DirectorySet $paths

  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
  $action = @($task.Actions)[0]
  $currentExecute = [string]$action.Execute
  $currentArguments = [string]$action.Arguments

  if ($currentArguments -match "autoops-r145-runtime-generation-lease-watcher-no-refresh-enforcement") {
    Write-R145Evidence "install-already-wrapped" ([ordered]@{ taskName = $TaskName; execute = $currentExecute; arguments = $currentArguments }) | Out-Null
    Write-Host "R145 wrapper is already installed for $TaskName."
    return
  }

  $scriptSource = $PSCommandPath
  if ([string]::IsNullOrWhiteSpace($scriptSource) -or !(Test-Path $scriptSource)) {
    throw "Cannot determine current script path for installation."
  }

  $guardScript = Join-Path $paths.RuntimeGuard "autoops-r145-runtime-generation-lease-watcher-no-refresh-enforcement-v1.ps1"
  Copy-Item $scriptSource $guardScript -Force

  $originalAction = [ordered]@{
    Execute = $currentExecute
    Arguments = $currentArguments
    CapturedAt = (Get-Date).ToUniversalTime().ToString("o")
    TaskName = $TaskName
  }
  $originalActionPath = Join-Path $paths.RuntimeGuard "original-$($TaskName -replace '[^A-Za-z0-9_-]', '_')-action.json"
  Write-R145Json $originalActionPath $originalAction

  $vbsPath = Join-Path $paths.RuntimeGuard "SERA_ChatGPT_Artifact_Watcher_R145_Guard.vbs"
  $psArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$guardScript`" -Guard -AutoOps `"$AutoOps`" -OriginalActionJson `"$originalActionPath`""
  $vbs = @"
Set shell = CreateObject("WScript.Shell")
shell.Run "powershell.exe $psArgs", 0, False
"@
  Set-Content -Path $vbsPath -Value $vbs -Encoding ASCII

  $newAction = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$vbsPath`""

  $installRecord = [ordered]@{
    taskName = $TaskName
    originalExecute = $currentExecute
    originalArguments = $currentArguments
    guardScript = $guardScript
    wrapperVbs = $vbsPath
    originalActionJson = $originalActionPath
    refreshMinutesDefault = 0
    ownerDiagnosticRefreshFlag = $paths.DiagnosticRefreshFlag
    installedAt = (Get-Date).ToUniversalTime().ToString("o")
  }

  if ($DryRun) {
    Write-R145Evidence "install-dry-run" $installRecord | Out-Null
    $installRecord | ConvertTo-Json -Depth 10
    return
  }

  Set-ScheduledTask -TaskName $TaskName -Action $newAction | Out-Null
  Write-R145Evidence "install-completed" $installRecord | Out-Null
  Write-Host "Installed R145 watcher wrapper for $TaskName."
  Write-Host "Wrapper VBS: $vbsPath"
  Write-Host "Original action saved: $originalActionPath"
}

function Invoke-R145SelfTest {
  $tmp = Join-Path $env:TEMP ("sera-r145-selftest-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force $tmp | Out-Null
  $oldAutoOps = $script:AutoOps
  try {
    $script:AutoOps = $tmp
    $paths = Get-R145Paths $tmp
    New-R145DirectorySet $paths

    $lease = New-R145GenerationLease -CommandId "r145-selftest-command" -Phase 145 -PhaseSlug "autoops_r145_selftest" -ExpectedZipName "s.e.r.a_autoops_r145_selftest_overlay.zip" -PromptFile "selftest-prompt.md" -RunNonce "selftest" -LeaseMinutes 5

    if (-not (Test-R145LeaseActive $lease)) { throw "Self-test lease should be active." }

    $zipPath = Join-Path $paths.Downloads "s.e.r.a_autoops_r145_selftest_overlay.zip"
    Set-Content -Path $zipPath -Value "selftest zip placeholder" -Encoding UTF8
    $route = Route-R145ExpectedZip -ExpectedZipName "s.e.r.a_autoops_r145_selftest_overlay.zip"
    if (-not $route.routed) { throw "Self-test route failed." }

    $completed = Get-R145GenerationLease
    if ([string]$completed.leaseStatus -ne "completed") { throw "Self-test lease did not complete after routing." }

    [pscustomobject]@{
      ok = $true
      selfTestRoot = $tmp
      leaseCreated = $true
      activeLeaseBlockedRefresh = $true
      exactZipRoutingEvidenceRequired = $true
      route = $route
    } | ConvertTo-Json -Depth 20
  } finally {
    $script:AutoOps = $oldAutoOps
  }
}

if ($SelfTest) {
  Invoke-R145SelfTest
  exit 0
}

if ($Install) {
  Install-R145WatcherWrapper
  exit 0
}

if ($Guard) {
  Invoke-R145GuardPass -OriginalActionJsonPath $OriginalActionJson
  exit 0
}

Write-Host "AutoOps R145 runtime guard loaded."
Write-Host "Use -Install to install the scheduled-task wrapper, -Guard for one guarded pass, or -SelfTest to validate lease/routing behavior."

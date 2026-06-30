<#
.SYNOPSIS
  Phase 138 Artifact Watcher Generation Lease + Expected ZIP Fallback v1.

.DESCRIPTION
  Adds a local runtime guard for the S.E.R.A. browser-side autopilot loop. The guard
  is intentionally conservative: when ChatGPT is expected to be generating an overlay
  ZIP, it prevents the Phone Control Watcher and ChatGPT Artifact Watcher from
  repeatedly refreshing or resubmitting before the expected ZIP can finish generating.

  This script does not change credentials, tokens, external accounts, paid services,
  GitHub settings, or owner-control boundaries. It preserves saved ChatGPT target-only
  behavior and forbids random/new-chat fallback.

  IMPORTANT: Applying this overlay into the repository does not automatically modify
  local scheduled task launchers. After the overlay is merged, run:

    powershell -ExecutionPolicy Bypass -File .\scripts\phase138-artifact-watcher-generation-lease-expected-zip-fallback-v1.ps1 -InstallRuntimeGuard -Apply
#>

[CmdletBinding(DefaultParameterSetName = 'Status')]
param(
  [Parameter(ParameterSetName = 'Status')]
  [switch]$Status,

  [Parameter(ParameterSetName = 'Validate')]
  [switch]$Validate,

  [Parameter(ParameterSetName = 'Install')]
  [switch]$InstallRuntimeGuard,

  [Parameter(ParameterSetName = 'Uninstall')]
  [switch]$UninstallRuntimeGuard,

  [Parameter(ParameterSetName = 'CreateLease')]
  [switch]$CreateLease,

  [Parameter(ParameterSetName = 'ClearLease')]
  [switch]$ClearLease,

  [Parameter(ParameterSetName = 'FindZip')]
  [switch]$FindExpectedZip,

  [Parameter(ParameterSetName = 'Install')]
  [Parameter(ParameterSetName = 'Uninstall')]
  [Parameter(ParameterSetName = 'CreateLease')]
  [Parameter(ParameterSetName = 'ClearLease')]
  [switch]$Apply,

  [string]$AutoOps = (Join-Path $env:USERPROFILE 'OneDrive\SERA-AutoOps'),

  [string]$ExpectedZipFilename = 's.e.r.a_phase138_artifact_watcher_generation_lease_expected_zip_fallback_v1_overlay.zip',

  [int]$LeaseMinutes = 12
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-JsonNoBom {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)]$Value,
    [int]$Depth = 24
  )
  $parent = Split-Path -Parent $Path
  if ($parent) { New-Item -ItemType Directory -Force $parent | Out-Null }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $json = $Value | ConvertTo-Json -Depth $Depth
  [System.IO.File]::WriteAllText($Path, $json + [Environment]::NewLine, $utf8NoBom)
}

function Read-JsonFileOrNull {
  param([Parameter(Mandatory=$true)][string]$Path)
  if (!(Test-Path $Path)) { return $null }
  try { return (Get-Content $Path -Raw | ConvertFrom-Json) } catch { return $null }
}

function Get-ControlPaths {
  param([Parameter(Mandatory=$true)][string]$AutoOpsRoot)
  $control = Join-Path $AutoOpsRoot '00_control_center'
  [pscustomobject]@{
    AutoOps = $AutoOpsRoot
    Control = $control
    Target = Join-Path $control 'chatgpt-target.json'
    LeaseDir = Join-Path $control 'generation_leases'
    RuntimeGuardDir = Join-Path $control 'runtime_guards\phase138-artifact-watcher-generation-lease-expected-zip-fallback-v1'
    EvidenceDir = Join-Path $control 'evidence\phase138-artifact-watcher-generation-lease-expected-zip-fallback-v1'
    LauncherDir = Join-Path $control 'task_launchers_hidden'
    BridgeOutbox = Join-Path $AutoOpsRoot '15_bridge_outbox'
    CommandInbox = Join-Path $control 'command_inbox'
    StaleArchive = Join-Path $control 'archive\phase138-stale-prompt-references'
  }
}

function Test-SavedChatGptTargetContract {
  param([Parameter(Mandatory=$true)][string]$AutoOpsRoot)
  $paths = Get-ControlPaths -AutoOpsRoot $AutoOpsRoot
  $issues = New-Object System.Collections.Generic.List[string]
  $target = Read-JsonFileOrNull -Path $paths.Target

  if ($null -eq $target) { $issues.Add("Missing or unreadable saved ChatGPT target: $($paths.Target)") }
  else {
    if (!$target.PSObject.Properties.Name.Contains('targetUrl') -or [string]::IsNullOrWhiteSpace([string]$target.targetUrl)) { $issues.Add('targetUrl is missing or empty') }
    if ($target.PSObject.Properties.Name.Contains('allowNewChatFallback') -and $target.allowNewChatFallback -ne $false) { $issues.Add('allowNewChatFallback must be false') }
    if ($target.PSObject.Properties.Name.Contains('allowRandomRecentChatFallback') -and $target.allowRandomRecentChatFallback -ne $false) { $issues.Add('allowRandomRecentChatFallback must be false') }
    if ($target.PSObject.Properties.Name.Contains('targetUrl') -and $target.targetUrl -and ([string]$target.targetUrl) -notlike 'https://chatgpt.com/*') { $issues.Add('targetUrl must point to chatgpt.com') }
  }

  $allowNewChatFallbackValue = $null
  $allowRandomRecentChatFallbackValue = $null
  if ($null -ne $target -and $target.PSObject.Properties.Name.Contains('allowNewChatFallback')) {
    $allowNewChatFallbackValue = $target.allowNewChatFallback
  }
  if ($null -ne $target -and $target.PSObject.Properties.Name.Contains('allowRandomRecentChatFallback')) {
    $allowRandomRecentChatFallbackValue = $target.allowRandomRecentChatFallback
  }

  [pscustomobject]@{
    ok = ($issues.Count -eq 0)
    targetPath = $paths.Target
    targetUrlPresent = ($null -ne $target -and $target.PSObject.Properties.Name.Contains('targetUrl') -and ![string]::IsNullOrWhiteSpace([string]$target.targetUrl))
    allowNewChatFallback = $allowNewChatFallbackValue
    allowRandomRecentChatFallback = $allowRandomRecentChatFallbackValue
    issues = @($issues)
  }
}

function Test-ZipHasRepoOverlay {
  param([Parameter(Mandatory=$true)][string]$ZipPath)
  try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction SilentlyContinue
    $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    try {
      $hasRepo = $false
      $hasOverlay = $false
      foreach ($entry in $zip.Entries) {
        $name = $entry.FullName.Replace('\\','/')
        if ($name -like 'repo/*') { $hasRepo = $true }
        if ($name -like 'repo/.overlay/*.json') { $hasOverlay = $true }
      }
      return ($hasRepo -and $hasOverlay)
    } finally { $zip.Dispose() }
  } catch { return $false }
}

function Get-SearchRoots {
  param([Parameter(Mandatory=$true)][string]$AutoOpsRoot)
  $downloads = Join-Path $env:USERPROFILE 'Downloads'
  @(
    $downloads,
    (Join-Path $AutoOpsRoot '01_apply_approved'),
    (Join-Path $AutoOpsRoot '02_hotfix_approved'),
    (Join-Path $AutoOpsRoot '03_pending_review'),
    (Join-Path $AutoOpsRoot '08_processing'),
    (Join-Path $AutoOpsRoot '05_blocked')
  ) | Where-Object { Test-Path $_ }
}

function Find-ExpectedZipCandidate {
  param(
    [Parameter(Mandatory=$true)][string]$AutoOpsRoot,
    [Parameter(Mandatory=$true)][string]$ExpectedName
  )

  $roots = Get-SearchRoots -AutoOpsRoot $AutoOpsRoot
  $exact = @()
  foreach ($root in $roots) {
    $exact += Get-ChildItem $root -File -Filter $ExpectedName -ErrorAction SilentlyContinue
  }
  if ($exact.Count -gt 0) {
    $winner = $exact | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    return [pscustomobject]@{ found = $true; strategy = 'exact_expectedZipFilename'; path = $winner.FullName; name = $winner.Name; lastWriteTime = $winner.LastWriteTime }
  }

  $patterns = @('*phase138*.zip', '*generation_lease*.zip', '*expected_zip_fallback*.zip')
  foreach ($pattern in $patterns) {
    $matches = @()
    foreach ($root in $roots) { $matches += Get-ChildItem $root -File -Filter $pattern -ErrorAction SilentlyContinue }
    $valid = @($matches | Where-Object { Test-ZipHasRepoOverlay -ZipPath $_.FullName })
    if ($valid.Count -gt 0) {
      $winner = $valid | Sort-Object LastWriteTime -Descending | Select-Object -First 1
      return [pscustomobject]@{ found = $true; strategy = "fallback:$pattern"; path = $winner.FullName; name = $winner.Name; lastWriteTime = $winner.LastWriteTime }
    }
  }

  $all = @()
  foreach ($root in $roots) { $all += Get-ChildItem $root -File -Filter '*.zip' -ErrorAction SilentlyContinue }
  $validAll = @($all | Where-Object { Test-ZipHasRepoOverlay -ZipPath $_.FullName })
  if ($validAll.Count -gt 0) {
    $winner = $validAll | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    return [pscustomobject]@{ found = $true; strategy = 'fallback:newest_repo_overlay_zip'; path = $winner.FullName; name = $winner.Name; lastWriteTime = $winner.LastWriteTime }
  }

  [pscustomobject]@{ found = $false; strategy = 'none'; path = $null; name = $null; lastWriteTime = $null }
}

function Get-LatestPhasePromptOrCommand {
  param([Parameter(Mandatory=$true)][string]$AutoOpsRoot)
  $paths = Get-ControlPaths -AutoOpsRoot $AutoOpsRoot
  $items = @()
  if (Test-Path $paths.BridgeOutbox) { $items += Get-ChildItem $paths.BridgeOutbox -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'phase\d+|autopilot|chatgpt|artifact' } }
  if (Test-Path $paths.CommandInbox) { $items += Get-ChildItem $paths.CommandInbox -File -Filter '*.json' -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'phase\d+|autopilot' } }
  if ($items.Count -eq 0) { return $null }
  return ($items | Sort-Object LastWriteTime -Descending | Select-Object -First 1)
}

function Get-ExpectedZipFromPromptOrCommand {
  param(
    [Parameter(Mandatory=$true)][string]$AutoOpsRoot,
    [Parameter(Mandatory=$true)][string]$DefaultExpectedZip
  )
  $latest = Get-LatestPhasePromptOrCommand -AutoOpsRoot $AutoOpsRoot
  if ($null -eq $latest) { return [pscustomobject]@{ expectedZipFilename = $DefaultExpectedZip; source = 'default'; sourcePath = $null } }

  $text = Get-Content $latest.FullName -Raw -ErrorAction SilentlyContinue
  if ($latest.Extension -eq '.json') {
    try {
      $json = $text | ConvertFrom-Json
      if ($json.PSObject.Properties.Name.Contains('expectedZipFilename') -and ![string]::IsNullOrWhiteSpace([string]$json.expectedZipFilename)) {
        return [pscustomobject]@{ expectedZipFilename = [string]$json.expectedZipFilename; source = 'command_json'; sourcePath = $latest.FullName }
      }
    } catch { }
  }

  $match = [regex]::Match($text, 's\.e\.r\.a_[a-zA-Z0-9_\-]+_overlay\.zip')
  if ($match.Success) { return [pscustomobject]@{ expectedZipFilename = $match.Value; source = 'prompt_text_regex'; sourcePath = $latest.FullName } }

  [pscustomobject]@{ expectedZipFilename = $DefaultExpectedZip; source = 'default_after_prompt_scan'; sourcePath = $latest.FullName }
}

function Get-ActiveGenerationLease {
  param([Parameter(Mandatory=$true)][string]$AutoOpsRoot)
  $paths = Get-ControlPaths -AutoOpsRoot $AutoOpsRoot
  if (!(Test-Path $paths.LeaseDir)) { return $null }
  $now = (Get-Date).ToUniversalTime()
  $leases = @()
  foreach ($file in (Get-ChildItem $paths.LeaseDir -File -Filter '*.json' -ErrorAction SilentlyContinue)) {
    $lease = Read-JsonFileOrNull -Path $file.FullName
    if ($null -eq $lease) { continue }
    if (!$lease.PSObject.Properties.Name.Contains('leaseUntil')) { continue }
    $until = [datetime]::Parse([string]$lease.leaseUntil).ToUniversalTime()
    if ($until -gt $now) {
      $leases += [pscustomobject]@{ path = $file.FullName; lease = $lease; leaseUntil = $until }
    }
  }
  if ($leases.Count -eq 0) { return $null }
  return ($leases | Sort-Object leaseUntil -Descending | Select-Object -First 1)
}

function New-GenerationLease {
  param(
    [Parameter(Mandatory=$true)][string]$AutoOpsRoot,
    [Parameter(Mandatory=$true)][string]$ExpectedName,
    [Parameter(Mandatory=$true)][int]$Minutes,
    [string]$Reason = 'phase138 generation quiet window'
  )
  $paths = Get-ControlPaths -AutoOpsRoot $AutoOpsRoot
  New-Item -ItemType Directory -Force $paths.LeaseDir | Out-Null
  New-Item -ItemType Directory -Force $paths.EvidenceDir | Out-Null
  $now = (Get-Date).ToUniversalTime()
  $lease = [ordered]@{
    schemaVersion = 1
    phase = 138
    kind = 'generation_lease'
    expectedZipFilename = $ExpectedName
    active = $true
    reason = $Reason
    startedAt = $now.ToString('o')
    leaseUntil = $now.AddMinutes($Minutes).ToString('o')
    doNotRefresh = $true
    doNotResubmit = $true
    doNotEscalateBeforeLeaseExpires = $true
    savedChatGptTargetOnly = $true
    allowNewChatFallback = $false
    allowRandomRecentChatFallback = $false
  }
  $nameSafe = ($ExpectedName -replace '[^A-Za-z0-9_\-\.]','_')
  $path = Join-Path $paths.LeaseDir ("phase138-$nameSafe-generation-lease.json")
  Write-JsonNoBom -Path $path -Value $lease
  return [pscustomobject]@{ path = $path; lease = $lease }
}

function Clear-GenerationLeases {
  param([Parameter(Mandatory=$true)][string]$AutoOpsRoot)
  $paths = Get-ControlPaths -AutoOpsRoot $AutoOpsRoot
  if (!(Test-Path $paths.LeaseDir)) { return @() }
  $cleared = @()
  foreach ($file in Get-ChildItem $paths.LeaseDir -File -Filter '*.json' -ErrorAction SilentlyContinue) {
    $destDir = Join-Path $paths.LeaseDir 'archive'
    New-Item -ItemType Directory -Force $destDir | Out-Null
    $dest = Join-Path $destDir ($file.BaseName + '-' + (Get-Date -Format 'yyyyMMdd_HHmmss') + $file.Extension)
    if ($Apply) { Move-Item $file.FullName $dest -Force }
    $cleared += $file.FullName
  }
  return $cleared
}

function Archive-StalePromptReferences {
  param(
    [Parameter(Mandatory=$true)][string]$AutoOpsRoot,
    [int]$OlderThanMinutes = 45
  )
  $paths = Get-ControlPaths -AutoOpsRoot $AutoOpsRoot
  $archived = @()
  if (!(Test-Path $paths.BridgeOutbox)) { return $archived }
  New-Item -ItemType Directory -Force $paths.StaleArchive | Out-Null
  $cutoff = (Get-Date).AddMinutes(-1 * $OlderThanMinutes)
  foreach ($file in Get-ChildItem $paths.BridgeOutbox -File -ErrorAction SilentlyContinue) {
    if ($file.LastWriteTime -gt $cutoff) { continue }
    if ($file.Name -notmatch 'phase138|artifact|chatgpt|autopilot') { continue }
    $dest = Join-Path $paths.StaleArchive ($file.BaseName + '-' + (Get-Date -Format 'yyyyMMdd_HHmmss') + $file.Extension)
    if ($Apply) { Move-Item $file.FullName $dest -Force }
    $archived += [pscustomobject]@{ source = $file.FullName; archivedTo = $dest }
  }
  return $archived
}

function Write-GuardEvidence {
  param(
    [Parameter(Mandatory=$true)][string]$AutoOpsRoot,
    [Parameter(Mandatory=$true)][string]$Role,
    [Parameter(Mandatory=$true)][string]$Decision,
    [Parameter(Mandatory=$true)]$Details
  )
  $paths = Get-ControlPaths -AutoOpsRoot $AutoOpsRoot
  New-Item -ItemType Directory -Force $paths.EvidenceDir | Out-Null
  $stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd_HHmmssZ')
  $path = Join-Path $paths.EvidenceDir ("phase138-$Role-$Decision-$stamp.json")
  Write-JsonNoBom -Path $path -Value ([ordered]@{
    schemaVersion = 1
    phase = 138
    role = $Role
    decision = $Decision
    details = $Details
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
  })
  return $path
}

function New-RuntimeWrapperScriptText {
@'
param(
  [Parameter(Mandatory=$true)][ValidateSet('PhoneControl','ArtifactWatcher')][string]$Role,
  [Parameter(Mandatory=$true)][string]$OriginalVbsPath,
  [string]$AutoOps = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$DefaultExpectedZipFilename = 's.e.r.a_phase138_artifact_watcher_generation_lease_expected_zip_fallback_v1_overlay.zip',
  [int]$LeaseMinutes = 12
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-JsonNoBom {
  param([string]$Path, $Value, [int]$Depth = 24)
  $parent = Split-Path -Parent $Path
  if ($parent) { New-Item -ItemType Directory -Force $parent | Out-Null }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $json = $Value | ConvertTo-Json -Depth $Depth
  [System.IO.File]::WriteAllText($Path, $json + [Environment]::NewLine, $utf8NoBom)
}

function Read-JsonFileOrNull { param([string]$Path) if (!(Test-Path $Path)) { return $null } try { return (Get-Content $Path -Raw | ConvertFrom-Json) } catch { return $null } }
function Paths { $c=Join-Path $AutoOps '00_control_center'; [pscustomobject]@{ Control=$c; LeaseDir=Join-Path $c 'generation_leases'; EvidenceDir=Join-Path $c 'evidence\phase138-artifact-watcher-generation-lease-expected-zip-fallback-v1'; BridgeOutbox=Join-Path $AutoOps '15_bridge_outbox'; CommandInbox=Join-Path $c 'command_inbox' } }

function Test-ZipHasRepoOverlay { param([string]$ZipPath) try { Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction SilentlyContinue; $zip=[System.IO.Compression.ZipFile]::OpenRead($ZipPath); try { $hasRepo=$false; $hasOverlay=$false; foreach($e in $zip.Entries){$n=$e.FullName.Replace('\\','/'); if($n -like 'repo/*'){$hasRepo=$true}; if($n -like 'repo/.overlay/*.json'){$hasOverlay=$true}}; return ($hasRepo -and $hasOverlay) } finally { $zip.Dispose() } } catch { return $false } }
function SearchRoots { $downloads=Join-Path $env:USERPROFILE 'Downloads'; @($downloads,(Join-Path $AutoOps '01_apply_approved'),(Join-Path $AutoOps '02_hotfix_approved'),(Join-Path $AutoOps '03_pending_review'),(Join-Path $AutoOps '08_processing'),(Join-Path $AutoOps '05_blocked')) | Where-Object { Test-Path $_ } }
function FindZip { param([string]$ExpectedName) $roots=SearchRoots; $exact=@(); foreach($r in $roots){$exact+=Get-ChildItem $r -File -Filter $ExpectedName -ErrorAction SilentlyContinue}; if($exact.Count -gt 0){$w=$exact|Sort-Object LastWriteTime -Descending|Select-Object -First 1; return [pscustomobject]@{found=$true; strategy='exact_expectedZipFilename'; path=$w.FullName; name=$w.Name}}; foreach($p in @('*phase138*.zip','*generation_lease*.zip','*expected_zip_fallback*.zip')){$m=@(); foreach($r in $roots){$m+=Get-ChildItem $r -File -Filter $p -ErrorAction SilentlyContinue}; $v=@($m|Where-Object{Test-ZipHasRepoOverlay $_.FullName}); if($v.Count -gt 0){$w=$v|Sort-Object LastWriteTime -Descending|Select-Object -First 1; return [pscustomobject]@{found=$true; strategy="fallback:$p"; path=$w.FullName; name=$w.Name}}}; return [pscustomobject]@{found=$false; strategy='none'; path=$null; name=$null} }
function LatestSignal { $p=Paths; $items=@(); if(Test-Path $p.BridgeOutbox){$items+=Get-ChildItem $p.BridgeOutbox -File -ErrorAction SilentlyContinue | Where-Object {$_.Name -match 'phase\d+|autopilot|chatgpt|artifact'}}; if(Test-Path $p.CommandInbox){$items+=Get-ChildItem $p.CommandInbox -File -Filter '*.json' -ErrorAction SilentlyContinue | Where-Object {$_.Name -match 'phase\d+|autopilot'}}; if($items.Count -eq 0){return $null}; return ($items|Sort-Object LastWriteTime -Descending|Select-Object -First 1) }
function ExpectedName { $latest=LatestSignal; if($null -eq $latest){return $DefaultExpectedZipFilename}; $text=Get-Content $latest.FullName -Raw -ErrorAction SilentlyContinue; if($latest.Extension -eq '.json'){try{$j=$text|ConvertFrom-Json; if($j.PSObject.Properties.Name.Contains('expectedZipFilename') -and ![string]::IsNullOrWhiteSpace([string]$j.expectedZipFilename)){return [string]$j.expectedZipFilename}}catch{}}; $m=[regex]::Match($text,'s\.e\.r\.a_[a-zA-Z0-9_\-]+_overlay\.zip'); if($m.Success){return $m.Value}; return $DefaultExpectedZipFilename }
function ActiveLease { $p=Paths; if(!(Test-Path $p.LeaseDir)){return $null}; $now=(Get-Date).ToUniversalTime(); $leases=@(); foreach($f in Get-ChildItem $p.LeaseDir -File -Filter '*.json' -ErrorAction SilentlyContinue){$l=Read-JsonFileOrNull $f.FullName; if($null -eq $l -or !$l.PSObject.Properties.Name.Contains('leaseUntil')){continue}; $until=[datetime]::Parse([string]$l.leaseUntil).ToUniversalTime(); if($until -gt $now){$leases+=[pscustomobject]@{path=$f.FullName; lease=$l; leaseUntil=$until}}}; if($leases.Count -eq 0){return $null}; return ($leases|Sort-Object leaseUntil -Descending|Select-Object -First 1) }
function NewLease { param([string]$ExpectedName,[string]$Reason) $p=Paths; New-Item -ItemType Directory -Force $p.LeaseDir | Out-Null; $now=(Get-Date).ToUniversalTime(); $lease=[ordered]@{schemaVersion=1; phase=138; kind='generation_lease'; expectedZipFilename=$ExpectedName; active=$true; reason=$Reason; startedAt=$now.ToString('o'); leaseUntil=$now.AddMinutes($LeaseMinutes).ToString('o'); doNotRefresh=$true; doNotResubmit=$true; doNotEscalateBeforeLeaseExpires=$true; savedChatGptTargetOnly=$true; allowNewChatFallback=$false; allowRandomRecentChatFallback=$false}; $safe=($ExpectedName -replace '[^A-Za-z0-9_\-\.]','_'); $path=Join-Path $p.LeaseDir "phase138-$safe-generation-lease.json"; Write-JsonNoBom $path $lease; return [pscustomobject]@{path=$path; lease=$lease} }
function Evidence { param([string]$Decision,$Details) $p=Paths; New-Item -ItemType Directory -Force $p.EvidenceDir | Out-Null; $stamp=(Get-Date).ToUniversalTime().ToString('yyyyMMdd_HHmmssZ'); $path=Join-Path $p.EvidenceDir "phase138-$Role-$Decision-$stamp.json"; Write-JsonNoBom $path ([ordered]@{schemaVersion=1; phase=138; role=$Role; decision=$Decision; details=$Details; createdAt=(Get-Date).ToUniversalTime().ToString('o')}); return $path }

$expected=ExpectedName
$zip=FindZip $expected
if($zip.found){ Evidence 'allow_delegate_expected_zip_found' ([ordered]@{expectedZipFilename=$expected; zip=$zip; originalVbsPath=$OriginalVbsPath}) | Out-Null; Start-Process -FilePath 'wscript.exe' -ArgumentList ('"' + $OriginalVbsPath + '"') -WindowStyle Hidden; exit 0 }

$lease=ActiveLease
if($null -ne $lease){ Evidence 'skip_active_generation_lease' ([ordered]@{expectedZipFilename=$expected; leasePath=$lease.path; leaseUntil=$lease.leaseUntil.ToString('o'); doNotRefresh=$true; doNotResubmit=$true; originalVbsPath=$OriginalVbsPath}) | Out-Null; exit 0 }

$signal=LatestSignal
if($null -ne $signal -and $signal.LastWriteTime -gt (Get-Date).AddMinutes(-30)){ $newLease=NewLease $expected "recent $Role signal detected; quiet window before browser retry"; Evidence 'create_generation_lease_and_skip' ([ordered]@{expectedZipFilename=$expected; signal=$signal.FullName; leasePath=$newLease.path; leaseMinutes=$LeaseMinutes; doNotRefresh=$true; doNotResubmit=$true}) | Out-Null; exit 0 }

Evidence 'allow_delegate_no_active_generation' ([ordered]@{expectedZipFilename=$expected; originalVbsPath=$OriginalVbsPath}) | Out-Null
Start-Process -FilePath 'wscript.exe' -ArgumentList ('"' + $OriginalVbsPath + '"') -WindowStyle Hidden
exit 0
'@
}

function Install-RuntimeGuard {
  param(
    [Parameter(Mandatory=$true)][string]$AutoOpsRoot,
    [Parameter(Mandatory=$true)][string]$DefaultExpectedZip,
    [Parameter(Mandatory=$true)][int]$Minutes,
    [Parameter(Mandatory=$true)][bool]$DoApply
  )

  $targetCheck = Test-SavedChatGptTargetContract -AutoOpsRoot $AutoOpsRoot
  if (!$targetCheck.ok) { throw 'Saved ChatGPT target contract failed: ' + (($targetCheck.issues) -join '; ') }

  $paths = Get-ControlPaths -AutoOpsRoot $AutoOpsRoot
  New-Item -ItemType Directory -Force $paths.RuntimeGuardDir | Out-Null
  New-Item -ItemType Directory -Force $paths.EvidenceDir | Out-Null

  $wrapperPath = Join-Path $paths.RuntimeGuardDir 'phase138-artifact-watcher-safe-wrapper.ps1'
  $wrapperText = New-RuntimeWrapperScriptText
  if ($DoApply) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($wrapperPath, $wrapperText + [Environment]::NewLine, $utf8NoBom)
  }

  $launchers = @(
    [pscustomobject]@{ role = 'PhoneControl'; file = 'SERA_Phone_Control_Watcher-action1.vbs' },
    [pscustomobject]@{ role = 'ArtifactWatcher'; file = 'SERA_ChatGPT_Artifact_Watcher-action1.vbs' }
  )

  $results = @()
  foreach ($launcher in $launchers) {
    $vbsPath = Join-Path $paths.LauncherDir $launcher.file
    if (!(Test-Path $vbsPath)) {
      $results += [pscustomobject]@{ role = $launcher.role; launcher = $vbsPath; status = 'missing_launcher_skipped' }
      continue
    }

    $current = Get-Content $vbsPath -Raw
    $alreadyWrapped = ($current -like '*phase138-artifact-watcher-safe-wrapper.ps1*')
    $backupPath = Join-Path $paths.RuntimeGuardDir ($launcher.file + '.phase138-original.vbs')

    if (!$alreadyWrapped) {
      if ($DoApply) { Copy-Item $vbsPath $backupPath -Force }
    } elseif (!(Test-Path $backupPath)) {
      $results += [pscustomobject]@{ role = $launcher.role; launcher = $vbsPath; status = 'already_wrapped_but_backup_missing' }
      continue
    }

    $escapedWrapper = $wrapperPath.Replace('"','""')
    $escapedBackup = $backupPath.Replace('"','""')
    $escapedAutoOps = $AutoOpsRoot.Replace('"','""')
    $wrappedCommand = 'CreateObject("Wscript.Shell").Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File ""' + $escapedWrapper + '"" -Role ""' + $launcher.role + '"" -OriginalVbsPath ""' + $escapedBackup + '"" -AutoOps ""' + $escapedAutoOps + '"" -DefaultExpectedZipFilename ""' + $DefaultExpectedZip + '"" -LeaseMinutes ' + $Minutes + '", 0, False'

    if ($DoApply) {
      $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
      [System.IO.File]::WriteAllText($vbsPath, $wrappedCommand + [Environment]::NewLine, $utf8NoBom)
    }

    if ($alreadyWrapped) {
      $launcherStatus = 'already_wrapped'
    } elseif ($DoApply) {
      $launcherStatus = 'wrapped'
    } else {
      $launcherStatus = 'dry_run_would_wrap'
    }
    $results += [pscustomobject]@{ role = $launcher.role; launcher = $vbsPath; backup = $backupPath; status = $launcherStatus }
  }

  if ($DoApply) { $configMode = 'installed' } else { $configMode = 'dry_run' }

  $config = [ordered]@{
    schemaVersion = 1
    phase = 138
    guard = 'artifact-watcher-generation-lease-expected-zip-fallback-v1'
    mode = $configMode
    defaultExpectedZipFilename = $DefaultExpectedZip
    leaseMinutes = $Minutes
    doNotRefreshWhileLeaseActive = $true
    doNotResubmitWhileLeaseActive = $true
    doNotEscalateBeforeLeaseExpires = $true
    expectedZipExactMatchFirst = $true
    stalePromptReferencesArchived = $true
    savedChatGptTargetOnly = $true
    allowNewChatFallback = $false
    allowRandomRecentChatFallback = $false
    installedAt = (Get-Date).ToUniversalTime().ToString('o')
    wrapperPath = $wrapperPath
    launchers = $results
  }

  $configPath = Join-Path $paths.RuntimeGuardDir 'phase138-runtime-guard-config.json'
  if ($DoApply) { Write-JsonNoBom -Path $configPath -Value $config }
  if ($DoApply) { $installDecision = 'installed' } else { $installDecision = 'dry_run' }
  $evidencePath = Write-GuardEvidence -AutoOpsRoot $AutoOpsRoot -Role 'installer' -Decision $installDecision -Details $config

  [pscustomobject]@{ ok = $true; apply = $DoApply; configPath = $configPath; evidencePath = $evidencePath; launchers = $results }
}

function Uninstall-RuntimeGuard {
  param([Parameter(Mandatory=$true)][string]$AutoOpsRoot, [Parameter(Mandatory=$true)][bool]$DoApply)
  $paths = Get-ControlPaths -AutoOpsRoot $AutoOpsRoot
  $items = @(
    [pscustomobject]@{ role = 'PhoneControl'; file = 'SERA_Phone_Control_Watcher-action1.vbs' },
    [pscustomobject]@{ role = 'ArtifactWatcher'; file = 'SERA_ChatGPT_Artifact_Watcher-action1.vbs' }
  )
  $results = @()
  foreach ($item in $items) {
    $vbsPath = Join-Path $paths.LauncherDir $item.file
    $backupPath = Join-Path $paths.RuntimeGuardDir ($item.file + '.phase138-original.vbs')
    if ((Test-Path $backupPath) -and (Test-Path $vbsPath)) {
      if ($DoApply) { Copy-Item $backupPath $vbsPath -Force }
      if ($DoApply) { $restoreStatus = 'restored' } else { $restoreStatus = 'dry_run_would_restore' }
      $results += [pscustomobject]@{ role = $item.role; launcher = $vbsPath; backup = $backupPath; status = $restoreStatus }
    } else {
      $results += [pscustomobject]@{ role = $item.role; launcher = $vbsPath; backup = $backupPath; status = 'backup_missing_or_launcher_missing' }
    }
  }
  if ($DoApply) { $uninstallDecision = 'uninstalled' } else { $uninstallDecision = 'dry_run_uninstall' }
  $evidencePath = Write-GuardEvidence -AutoOpsRoot $AutoOpsRoot -Role 'installer' -Decision $uninstallDecision -Details ([ordered]@{ launchers = $results })
  [pscustomobject]@{ ok = $true; apply = $DoApply; evidencePath = $evidencePath; launchers = $results }
}

function Invoke-Status {
  param([Parameter(Mandatory=$true)][string]$AutoOpsRoot, [Parameter(Mandatory=$true)][string]$DefaultExpectedZip)
  $paths = Get-ControlPaths -AutoOpsRoot $AutoOpsRoot
  $targetCheck = Test-SavedChatGptTargetContract -AutoOpsRoot $AutoOpsRoot
  $expected = Get-ExpectedZipFromPromptOrCommand -AutoOpsRoot $AutoOpsRoot -DefaultExpectedZip $DefaultExpectedZip
  $zip = Find-ExpectedZipCandidate -AutoOpsRoot $AutoOpsRoot -ExpectedName $expected.expectedZipFilename
  $lease = Get-ActiveGenerationLease -AutoOpsRoot $AutoOpsRoot
  $wrapper = Join-Path $paths.RuntimeGuardDir 'phase138-artifact-watcher-safe-wrapper.ps1'
  $activeLeaseValue = $null
  if ($null -ne $lease) {
    $activeLeaseValue = [pscustomobject]@{
      path = $lease.path
      leaseUntil = $lease.leaseUntil.ToString('o')
      expectedZipFilename = $lease.lease.expectedZipFilename
    }
  }

  [pscustomobject]@{
    ok = $targetCheck.ok
    phase = 138
    guard = 'artifact-watcher-generation-lease-expected-zip-fallback-v1'
    autoOps = $AutoOpsRoot
    target = $targetCheck
    expectedZip = $expected
    zipCandidate = $zip
    activeLease = $activeLeaseValue
    runtimeGuardInstalled = (Test-Path $wrapper)
    wrapperPath = $wrapper
  }
}

if ($InstallRuntimeGuard) {
  $result = Install-RuntimeGuard -AutoOpsRoot $AutoOps -DefaultExpectedZip $ExpectedZipFilename -Minutes $LeaseMinutes -DoApply ([bool]$Apply)
  $result | ConvertTo-Json -Depth 24
  exit 0
}

if ($UninstallRuntimeGuard) {
  $result = Uninstall-RuntimeGuard -AutoOpsRoot $AutoOps -DoApply ([bool]$Apply)
  $result | ConvertTo-Json -Depth 24
  exit 0
}

if ($CreateLease) {
  $targetCheck = Test-SavedChatGptTargetContract -AutoOpsRoot $AutoOps
  if (!$targetCheck.ok) { throw 'Saved ChatGPT target contract failed: ' + (($targetCheck.issues) -join '; ') }
  $expected = Get-ExpectedZipFromPromptOrCommand -AutoOpsRoot $AutoOps -DefaultExpectedZip $ExpectedZipFilename
  $result = New-GenerationLease -AutoOpsRoot $AutoOps -ExpectedName $expected.expectedZipFilename -Minutes $LeaseMinutes -Reason 'manual phase138 lease creation'
  $result | ConvertTo-Json -Depth 24
  exit 0
}

if ($ClearLease) {
  $cleared = Clear-GenerationLeases -AutoOpsRoot $AutoOps
  [pscustomobject]@{ ok = $true; apply = [bool]$Apply; cleared = $cleared } | ConvertTo-Json -Depth 24
  exit 0
}

if ($FindExpectedZip) {
  $expected = Get-ExpectedZipFromPromptOrCommand -AutoOpsRoot $AutoOps -DefaultExpectedZip $ExpectedZipFilename
  $zip = Find-ExpectedZipCandidate -AutoOpsRoot $AutoOps -ExpectedName $expected.expectedZipFilename
  [pscustomobject]@{ ok = $true; expectedZip = $expected; zipCandidate = $zip } | ConvertTo-Json -Depth 24
  exit 0
}

if ($Validate) {
  $targetCheck = Test-SavedChatGptTargetContract -AutoOpsRoot $AutoOps
  $stale = Archive-StalePromptReferences -AutoOpsRoot $AutoOps -OlderThanMinutes 45
  $statusResult = Invoke-Status -AutoOpsRoot $AutoOps -DefaultExpectedZip $ExpectedZipFilename
  $result = [pscustomobject]@{ ok = $targetCheck.ok; phase = 138; target = $targetCheck; stalePromptArchiveDryRun = $stale; status = $statusResult }
  $result | ConvertTo-Json -Depth 24
  if (!$targetCheck.ok) { exit 2 }
  exit 0
}

$statusResult = Invoke-Status -AutoOpsRoot $AutoOps -DefaultExpectedZip $ExpectedZipFilename
$statusResult | ConvertTo-Json -Depth 24
if (!$statusResult.ok) { exit 2 }
exit 0

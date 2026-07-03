param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  [Parameter(Mandatory=$true)][string]$AutoOpsRoot,
  [ValidateSet("Auto","Cdp","ClipboardOnly","SkipBrowser")]
  [string]$BrowserMode = "Auto",
  [int]$WaitForZipMinutes = 240,
  [switch]$Once,
  [switch]$NoMerge
)

$ErrorActionPreference = "Stop"
$Control = Join-Path $AutoOpsRoot "00_control_center"
$CommandInbox = Join-Path $Control "command_inbox"
$BridgeOutbox = Join-Path $AutoOpsRoot "15_bridge_outbox"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$LogDir = Join-Path $Control "production_watchers"
$ArchiveDir = Join-Path $Control "archive"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Log = Join-Path $LogDir "full-auto-json-loop-router-v1-$Stamp.log"
New-Item -ItemType Directory -Force $CommandInbox,$BridgeOutbox,$Downloads13,$Handoff,$LogDir,$ArchiveDir | Out-Null

function Write-Step {
  param([string]$Message)
  $Line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
  Add-Content -Path $Log -Value $Line -Encoding UTF8
  Write-Host $Line
}

function Write-Blocked {
  param([string]$Reason)
  $Text = @(
    "# S.E.R.A. Auto Loop Handoff",
    "",
    "Status: BLOCKED",
    "Reason: $Reason",
    "Log: $Log"
  ) -join "`r`n"
  $Path = Join-Path $Control "CURRENT_CHATGPT_HANDOFF.md"
  $Text | Set-Content $Path -Encoding UTF8
  Set-Clipboard $Text
  throw $Reason
}

function Get-LatestClosedPhase {
  $Max = 0
  Get-ChildItem $Handoff -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "*CLOSED_CLEANLY.md" } |
    ForEach-Object {
      if ($_.Name -match 'phase(\d+)') {
        $n = [int]$Matches[1]
        if ($n -gt $Max) { $Max = $n }
      }
    }
  return $Max
}

function Convert-SlugToTagName {
  param([string]$PhaseSlug)
  if ($PhaseSlug -match '^phase(\d+)_(.+)$') {
    return "phase-$($Matches[1])-" + ($Matches[2] -replace '_','-')
  }
  return ($PhaseSlug -replace '_','-')
}

function Find-CommandJson {
  $LatestClosed = Get-LatestClosedPhase
  Write-Step "Latest CLOSED_CLEANLY phase=$LatestClosed"
  $Candidates = Get-ChildItem $CommandInbox -File -Filter "*.json" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
  foreach ($File in $Candidates) {
    try { $Json = Get-Content $File.FullName -Raw | ConvertFrom-Json } catch { continue }
    $PhaseText = [string]$Json.phase
    if (!$PhaseText -and [string]$Json.phaseSlug -match '^phase(\d+)') { $PhaseText = $Matches[1] }
    if (!$PhaseText) { continue }
    $PhaseInt = [int]$PhaseText
    if ($PhaseInt -le $LatestClosed) {
      $Archive = Join-Path $ArchiveDir "stale-command-phase$PhaseInt-$Stamp-$($File.Name)"
      Move-Item $File.FullName $Archive -Force
      Write-Step "Archived stale command JSON phase=$PhaseInt path=$Archive"
      continue
    }
    if ([string]$Json.expectedZipFilename -eq "") { continue }
    return [pscustomobject]@{ File = $File; Json = $Json; Phase = $PhaseInt }
  }
  return $null
}

function Wait-ForZip {
  param([string]$ExpectedZip,[int]$Minutes)
  $Exact = Join-Path $Downloads13 $ExpectedZip
  $Base = [IO.Path]::GetFileNameWithoutExtension($ExpectedZip)
  $Deadline = (Get-Date).AddMinutes($Minutes)
  while ((Get-Date) -lt $Deadline) {
    if (Test-Path $Exact) { return $Exact }
    $Match = Get-ChildItem $Downloads13 -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -like "$Base*.zip" -or $_.Name -like "*$Base*.zip" } |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
    if ($Match) { Copy-Item $Match.FullName $Exact -Force; return $Exact }
    Start-Sleep -Seconds 10
  }
  return $null
}

Write-Step "FULL_AUTO_JSON_LOOP_ROUTER_START"
cd $RepoRoot

$Command = Find-CommandJson
if (!$Command) { Write-Blocked "No fresh command JSON found in command_inbox." }
$Json = $Command.Json
$Phase = $Command.Phase
$PhaseSlug = [string]$Json.phaseSlug
$ExpectedZip = [string]$Json.expectedZipFilename
$PhaseToken = "phase$Phase"
$PhaseName = "s.e.r.a_${PhaseSlug}_overlay"
$TagName = Convert-SlugToTagName -PhaseSlug $PhaseSlug
$Branch = "work/$TagName"
$HyphenNoWork = $TagName
$Verifier = "scripts\verify-$HyphenNoWork.ps1"
$QaScript = "scripts\$HyphenNoWork.ps1"
$ExpectedSha = [string]$Json.expectedZipSha256

if ($Json.savedChatGptTargetOnly -ne $true -or $Json.allowRandomRecentChatFallback -ne $false -or $Json.allowNewChatFallback -ne $false) {
  Write-Blocked "Command JSON safety flags are invalid."
}

Write-Step "COMMAND_JSON_SELECTED phase=$Phase slug=$PhaseSlug path=$($Command.File.FullName)"

$RequestPath = Join-Path $Control "artifact-watch-request.json"
if (Test-Path $RequestPath) {
  try {
    $Existing = Get-Content $RequestPath -Raw | ConvertFrom-Json
    if ([string]$Existing.phase -ne [string]$Phase) {
      $ArchivedRequest = Join-Path $ArchiveDir "artifact-watch-request-stale-phase$($Existing.phase)-$Stamp.json"
      Copy-Item $RequestPath $ArchivedRequest -Force
      Remove-Item $RequestPath -Force
      Write-Step "Archived stale artifact-watch-request phase=$($Existing.phase)"
    }
  } catch {
    Move-Item $RequestPath (Join-Path $ArchiveDir "artifact-watch-request-unreadable-$Stamp.json") -Force
  }
}

$ProductionRunner = Join-Path $RepoRoot "scripts\sera-production-json-pickup-runner-v1.ps1"
if (!(Test-Path $ProductionRunner)) { Write-Blocked "Production JSON pickup runner missing: $ProductionRunner" }

$Proc = Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoProfile","-ExecutionPolicy","Bypass","-File",$ProductionRunner,"-RepoRoot",$RepoRoot,"-AutoOpsRoot",$AutoOpsRoot,"-Once","-WaitForZipMinutes","0") -WorkingDirectory $RepoRoot -Wait -PassThru -NoNewWindow
if ($Proc.ExitCode -ne 0) { Write-Blocked "Production JSON pickup runner failed with exit $($Proc.ExitCode)" }

if (!(Test-Path $RequestPath)) { Write-Blocked "REQUEST_READY was not created." }
$Request = Get-Content $RequestPath -Raw | ConvertFrom-Json
if ([string]$Request.phase -ne [string]$Phase -or [string]$Request.expectedZipName -ne $ExpectedZip) { Write-Blocked "REQUEST_READY does not match selected command JSON." }
$PromptFile = [string]$Request.promptFile
if (!(Test-Path $PromptFile)) { Write-Blocked "Prompt file missing after REQUEST_READY: $PromptFile" }
Write-Step "REQUEST_READY phase=$Phase prompt=$PromptFile"

$Zip = Wait-ForZip -ExpectedZip $ExpectedZip -Minutes 1
if (!$Zip -and $BrowserMode -ne "SkipBrowser") {
  $Bridge = Join-Path $RepoRoot "scripts\sera-chatgpt-browser-bridge-v1.ps1"
  if (!(Test-Path $Bridge)) { Write-Blocked "Browser bridge missing: $Bridge" }
  $Proc = Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoProfile","-ExecutionPolicy","Bypass","-File",$Bridge,"-PromptFile",$PromptFile,"-ExpectedZipName",$ExpectedZip,"-DownloadDirectory",$Downloads13,"-AutoOpsRoot",$AutoOpsRoot,"-Mode",$(if ($BrowserMode -eq "Auto") { "Auto" } else { $BrowserMode }),"-WaitMinutes",$WaitForZipMinutes) -WorkingDirectory $RepoRoot -Wait -PassThru -NoNewWindow
  if ($Proc.ExitCode -ne 0) { Write-Blocked "Browser bridge failed with exit $($Proc.ExitCode)" }
}

$Zip = Wait-ForZip -ExpectedZip $ExpectedZip -Minutes $WaitForZipMinutes
if (!$Zip) { Write-Blocked "Expected ZIP was not downloaded: $ExpectedZip" }
Write-Step "ZIP_READY_FOR_APPLY $Zip"

$DirectClose = Join-Path $RepoRoot "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1"
if (!(Test-Path $DirectClose)) { Write-Blocked "Direct ZIP closeout script missing: $DirectClose" }

if ($NoMerge) {
  Write-Blocked "NoMerge mode stopped after ZIP download proof."
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $DirectClose `
  -RepoRoot $RepoRoot `
  -AutoOpsRoot $AutoOpsRoot `
  -Phase $Phase `
  -PhaseToken $PhaseToken `
  -PhaseName $PhaseName `
  -Branch $Branch `
  -ExpectedZip $ExpectedZip `
  -ExpectedSha256 $ExpectedSha `
  -Verifier $Verifier `
  -QaScript $QaScript `
  -TagName $TagName

exit $LASTEXITCODE

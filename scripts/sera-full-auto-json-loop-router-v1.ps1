param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [int]$TimeoutMinutes = 30,
  [switch]$LaunchBrowserIfNeeded
)

$ErrorActionPreference = "Stop"

$Control = Join-Path $AutoOpsRoot "00_control_center"
$CommandInbox = Join-Path $Control "command_inbox"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$Runner = Join-Path $RepoRoot "scripts\sera-production-json-pickup-runner-v1.ps1"
$Bridge = Join-Path $RepoRoot "scripts\sera-chatgpt-browser-bridge-v1.ps1"
$DirectCloseout = Join-Path $RepoRoot "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1"

New-Item -ItemType Directory -Force $CommandInbox,$Downloads13,$Handoff | Out-Null

function Write-Step {
  param([string]$Message)
  Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
}

function Write-Blocked {
  param([string]$Reason)

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Path = Join-Path $Handoff "s.e.r.a_full_auto_json_loop-$Stamp-BLOCKED.md"

  @"
Status: BLOCKED
Phase: full_auto_json_loop
Reason: $Reason
Timestamp: $Stamp

Next action:
Fix the blocker, then rerun SERA_RUN_UPLOADED_JSON_LOOP.ps1.
"@ | Set-Content $Path -Encoding UTF8

  Get-Content $Path -Raw | Set-Clipboard
  Write-Host "BLOCKED_HANDOFF: $Path"
}

function Get-PropertyValue {
  param(
    [object]$Object,
    [string]$Name
  )

  if ($Object -and $Object.PSObject.Properties.Name -contains $Name) {
    return [string]$Object.$Name
  }

  return ""
}

foreach ($RequiredPath in @($Runner,$Bridge,$DirectCloseout)) {
  if (!(Test-Path $RequiredPath)) {
    throw "Required full-loop component missing: $RequiredPath"
  }
}

$Command = Get-ChildItem $CommandInbox -File -Filter "*.json" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$Command) {
  Write-Blocked "No uploaded JSON found in command_inbox."
  exit 2
}

Write-Step "FULL_AUTO_LOOP_START command=$($Command.FullName)"

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Runner -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot -Once -WaitForZipMinutes 0
if ($LASTEXITCODE -ne 0) {
  Write-Blocked "Production runner could not create REQUEST_READY."
  exit $LASTEXITCODE
}

$RequestPath = Join-Path $Control "artifact-watch-request.json"
if (!(Test-Path $RequestPath)) {
  Write-Blocked "artifact-watch-request.json was not created."
  exit 2
}

$Request = Get-Content $RequestPath -Raw | ConvertFrom-Json
$PromptFile = [string]$Request.promptFile
$ExpectedZip = [string]$Request.expectedZipName
$Phase = [string]$Request.phase
$PhaseSlug = [string]$Request.phaseSlug
$ExpectedSha = Get-PropertyValue -Object $Request -Name "expectedZipSha256"

if (!(Test-Path $PromptFile)) {
  Write-Blocked "Prompt file missing: $PromptFile"
  exit 2
}

if (!$ExpectedZip) {
  Write-Blocked "Expected ZIP name missing from artifact request."
  exit 2
}

if (!$PhaseSlug) {
  $PhaseSlug = $ExpectedZip -replace "^s\.e\.r\.a_","" -replace "_overlay\.zip$",""
}

$Tail = $PhaseSlug -replace "^phase$Phase[_-]?",""
$TailHyphen = $Tail -replace "_","-"

$PhaseToken = "phase$Phase"
$PhaseName = [System.IO.Path]::GetFileNameWithoutExtension($ExpectedZip)
$Branch = "work/phase$Phase-$TailHyphen"
$Verifier = "scripts\verify-phase$Phase-$TailHyphen.ps1"
$QaScript = "scripts\phase$Phase-$TailHyphen.ps1"
$TagName = "phase-$Phase-$TailHyphen"

Write-Step "REQUEST_READY phase=$Phase expectedZip=$ExpectedZip"

$BridgeArgs = @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  $Bridge,
  "-PromptFile",
  $PromptFile,
  "-ExpectedFilename",
  $ExpectedZip,
  "-DownloadDir",
  $Downloads13,
  "-TimeoutSeconds",
  ([string]($TimeoutMinutes * 60))
)

if ($LaunchBrowserIfNeeded) {
  $BridgeArgs += "-LaunchBrowserIfNeeded"
}

& powershell.exe @BridgeArgs
if ($LASTEXITCODE -ne 0) {
  Write-Blocked "ChatGPT browser bridge did not return the expected artifact."
  exit $LASTEXITCODE
}

$ExpectedZipPath = Join-Path $Downloads13 $ExpectedZip
if (!(Test-Path $ExpectedZipPath)) {
  Write-Blocked "Expected ZIP was not found after bridge: $ExpectedZipPath"
  exit 2
}

Write-Step "ZIP_READY $ExpectedZipPath"
Write-Step "RUN_DIRECT_ZIP_CLOSEOUT phase=$Phase branch=$Branch tag=$TagName"

$CloseoutArgs = @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  $DirectCloseout,
  "-RepoRoot",
  $RepoRoot,
  "-AutoOpsRoot",
  $AutoOpsRoot,
  "-Phase",
  $Phase,
  "-PhaseName",
  $PhaseName,
  "-PhaseToken",
  $PhaseToken,
  "-Branch",
  $Branch,
  "-ExpectedZip",
  $ExpectedZip,
  "-Verifier",
  $Verifier,
  "-QaScript",
  $QaScript,
  "-TagName",
  $TagName
)

if ($ExpectedSha) {
  $CloseoutArgs += "-ExpectedSha256"
  $CloseoutArgs += $ExpectedSha
}

& powershell.exe @CloseoutArgs
$Exit = $LASTEXITCODE

$Latest = Get-ChildItem $Handoff -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match "(CLOSED_CLEANLY|BLOCKED|PASS_GUARANTEED)" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if ($Latest) {
  Get-Content $Latest.FullName -Raw | Set-Clipboard
  Write-Step "FINAL_HANDOFF_COPIED $($Latest.FullName)"
}

if ($Exit -ne 0) {
  exit $Exit
}

Write-Step "FULL_AUTO_LOOP_DONE"
exit 0

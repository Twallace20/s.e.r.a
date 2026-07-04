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

function Find-FinalHandoff {
  $Latest = Get-ChildItem $Handoff -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "(CLOSED_CLEANLY|BLOCKED|PASS_GUARANTEED)" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if ($Latest) {
    Get-Content $Latest.FullName -Raw | Set-Clipboard
    Write-Step "FINAL_HANDOFF_COPIED $($Latest.FullName)"
    return $Latest.FullName
  }

  return $null
}

if (!(Test-Path $Runner)) {
  throw "Production JSON pickup runner missing: $Runner"
}

if (!(Test-Path $Bridge)) {
  throw "ChatGPT browser bridge missing: $Bridge"
}

$Command = Get-ChildItem $CommandInbox -File -Filter "*.json" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$Command) {
  Write-Blocked "No uploaded JSON found in command_inbox."
  exit 2
}

Write-Step "FULL_AUTO_LOOP_START command=$($Command.FullName)"

$FirstArgs = @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  $Runner,
  "-RepoRoot",
  $RepoRoot,
  "-AutoOpsRoot",
  $AutoOpsRoot,
  "-Once",
  "-WaitForZipMinutes",
  "0"
)

& powershell.exe @FirstArgs
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

if (!(Test-Path $PromptFile)) {
  Write-Blocked "Prompt file missing: $PromptFile"
  exit 2
}

if (!$ExpectedZip) {
  Write-Blocked "Expected ZIP name missing from artifact request."
  exit 2
}

Write-Step "REQUEST_READY phase=$($Request.phase) expectedZip=$ExpectedZip"

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

$SecondArgs = @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  $Runner,
  "-RepoRoot",
  $RepoRoot,
  "-AutoOpsRoot",
  $AutoOpsRoot,
  "-Once",
  "-WaitForZipMinutes",
  "0"
)

& powershell.exe @SecondArgs
$Exit = $LASTEXITCODE

$Final = Find-FinalHandoff
if ($Exit -ne 0) {
  if (!$Final) {
    Write-Blocked "Production closeout runner failed after ZIP download."
  }
  exit $Exit
}

if (!$Final) {
  Write-Blocked "Loop ended without a final handoff."
  exit 2
}

Write-Step "FULL_AUTO_LOOP_DONE $Final"
exit 0

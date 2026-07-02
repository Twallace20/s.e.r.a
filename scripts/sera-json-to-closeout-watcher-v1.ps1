param(
  [ValidateSet("RunOnce","SelfTest")]
  [string]$Mode = "RunOnce",
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Control = Join-Path $AutoOpsRoot "00_control_center"
$CommandInbox = Join-Path $Control "command_inbox"
$BridgeOutbox = Join-Path $AutoOpsRoot "15_bridge_outbox"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"

New-Item -ItemType Directory -Force $Control,$CommandInbox,$BridgeOutbox,$Handoff,$Downloads13 | Out-Null

function Write-Status {
  param([string]$Status,[string]$Message)
  Write-Host "$Status :: $Message"
}

function Read-CommandJson {
  param([string]$Path)

  $Json = Get-Content $Path -Raw | ConvertFrom-Json
  $Phase = if ($Json.phase) { [int]$Json.phase } elseif ($Json.phaseStart) { [int]$Json.phaseStart } else { $null }
  $Slug = [string]$Json.phaseSlug
  $ExpectedZip = if ($Json.expectedZipFilename) { [string]$Json.expectedZipFilename } elseif ($Json.expectedZipName) { [string]$Json.expectedZipName } else { "" }

  if (!$Phase -or !$Slug -or !$ExpectedZip) { return $null }

  [pscustomobject]@{
    Path = $Path
    Json = $Json
    Phase = $Phase
    Slug = $Slug
    ExpectedZip = $ExpectedZip
  }
}

function Write-Request {
  param($Command)

  $PromptPath = Join-Path $BridgeOutbox "phase$($Command.Phase)-$($Command.Slug)-watcher-v1.md"
  $RequestPath = Join-Path $Control "artifact-watch-request.json"
  $LeasePath = Join-Path $Control "artifact-generation-lease.json"

  $Prompt = @(
    "S.E.R.A. PHASE REQUEST",
    "",
    "Return the downloadable overlay ZIP for:",
    "",
    "Phase $($Command.Phase) - $($Command.Slug)",
    "",
    "Expected ZIP filename:",
    $Command.ExpectedZip,
    "",
    "Runtime proof note:",
    "This prompt was created by the repo-managed SERA JSON-to-closeout watcher v1."
  ) -join "`r`n"

  $Prompt | Set-Content $PromptPath -Encoding UTF8

  [ordered]@{
    ok = $true
    status = "REQUEST_READY_BRIDGE_EXTERNAL"
    phase = "$($Command.Phase)"
    phaseSlug = $Command.Slug
    expectedZipName = $Command.ExpectedZip
    promptFile = $PromptPath
    commandJson = $Command.Path
    createdAtUtc = (Get-Date).ToUniversalTime().ToString("o")
  } | ConvertTo-Json -Depth 10 | Set-Content $RequestPath -Encoding UTF8

  [ordered]@{
    ok = $true
    phase = "$($Command.Phase)"
    phaseSlug = $Command.Slug
    expectedZipName = $Command.ExpectedZip
    promptFile = $PromptPath
    commandJson = $Command.Path
    createdAtUtc = (Get-Date).ToUniversalTime().ToString("o")
  } | ConvertTo-Json -Depth 10 | Set-Content $LeasePath -Encoding UTF8

  $Prompt | Set-Content (Join-Path $Control "CURRENT_CHATGPT_HANDOFF.prompt.md") -Encoding UTF8

  return $PromptPath
}

if ($Mode -eq "SelfTest") {
  $TestJson = Join-Path $CommandInbox "autopilot-command-phase999_selftest.json"

  [ordered]@{
    phase = 999
    phaseSlug = "phase999_selftest"
    expectedZipFilename = "s.e.r.a_phase999_selftest_overlay.zip"
    commandId = "phase999-selftest"
  } | ConvertTo-Json -Depth 10 | Set-Content $TestJson -Encoding UTF8

  $Command = Read-CommandJson -Path $TestJson

  if (!$Command) { throw "SelfTest command parse failed." }

  $Prompt = Write-Request -Command $Command

  if (!(Test-Path $Prompt)) { throw "SelfTest prompt was not written." }
  if (!(Test-Path (Join-Path $Control "artifact-watch-request.json"))) { throw "SelfTest request was not written." }
  if (!(Test-Path (Join-Path $Control "artifact-generation-lease.json"))) { throw "SelfTest lease was not written." }

  Write-Status "SELFTEST_PASS" "prompt/request/lease generated"
  exit 0
}

$Commands = Get-ChildItem $CommandInbox -File -Filter "*.json" -ErrorAction SilentlyContinue |
  ForEach-Object {
    try { Read-CommandJson -Path $_.FullName } catch { $null }
  } |
  Where-Object { $_ } |
  Sort-Object Phase

if (!$Commands) {
  Write-Status "IDLE" "no runnable command JSON"
  exit 0
}

$Selected = $Commands | Select-Object -First 1
$PromptPath = Write-Request -Command $Selected
Write-Status "REQUEST_READY" $PromptPath

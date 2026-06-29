param(
  [switch]$Once,
  [int]$MaxPhases = 1,
  [switch]$DryRun,
  [int]$Phase = 0,
  [string]$Title = "",
  [string]$ExpectedZipName = "",
  [string]$PromptFile = "",
  [switch]$InitControlCenter,
  [switch]$EnableAutopilotForThisRun
)

$ErrorActionPreference = "Stop"

$Repo = Split-Path -Parent $PSScriptRoot
Set-Location $Repo

$AutoOps = if ($env:SERA_AUTOOPS_DIR) { $env:SERA_AUTOOPS_DIR } else { Join-Path $env:USERPROFILE "OneDrive\SERA-AutoOps" }
$Control = Join-Path $AutoOps "00_control_center"

if ($InitControlCenter -and (Test-Path ".\scripts\sera-control-center-init.ps1")) {
  powershell -ExecutionPolicy Bypass -File ".\scripts\sera-control-center-init.ps1"
}

if ($EnableAutopilotForThisRun) {
  New-Item -ItemType Directory -Force $Control | Out-Null
  $StatePath = Join-Path $Control "autopilot-state.json"
  if (Test-Path $StatePath) {
    $state = Get-Content $StatePath -Raw | ConvertFrom-Json
  } else {
    $state = [pscustomobject]@{
      schemaVersion = 1
      enabled = $true
      maxConsecutivePhases = 1
      maxRepairAttemptsPerPhase = 2
      allowSafeAutoMerge = $true
      stopOnNeedsAttention = $true
      allowNewChatFallback = $false
      allowRandomRecentChatFallback = $false
      requireSavedChatTarget = $true
    }
  }
  $state.enabled = $true
  $json = ($state | ConvertTo-Json -Depth 20)
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($StatePath, $json + [Environment]::NewLine, $utf8NoBom)
}

$argsList = @()
if ($Once) { $argsList += "--once" }
if ($DryRun) { $argsList += "--dry-run" } else { $argsList += "--execute" }
if ($MaxPhases -gt 0) { $argsList += @("--max-phases", [string]$MaxPhases) }
if ($Phase -gt 0) { $argsList += @("--phase", [string]$Phase) }
if ($Title.Trim().Length -gt 0) { $argsList += @("--title", $Title) }
if ($ExpectedZipName.Trim().Length -gt 0) { $argsList += @("--expected-zip-name", $ExpectedZipName) }
if ($PromptFile.Trim().Length -gt 0) { $argsList += @("--prompt-file", $PromptFile) }

node ".\scripts\sera-autopilot-loop.mjs" @argsList

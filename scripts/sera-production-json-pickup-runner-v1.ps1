param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [int]$WaitForZipMinutes = 0,
  [switch]$Once,
  [switch]$NoApply,
  [switch]$NoClipboard,
  [switch]$SelfTest
)

$ErrorActionPreference = "Stop"

# Phase170 safety markers preserved by the downstream orchestrator: PASS_GUARANTEED, CLOSED_CLEANLY, SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED, WAIT_ONLY_CLOSED.

$Control = Join-Path $AutoOpsRoot "00_control_center"
$CommandInbox = Join-Path $Control "command_inbox"
$BridgeOutbox = Join-Path $AutoOpsRoot "15_bridge_outbox"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$LogDir = Join-Path $Control "production_watchers"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Log = Join-Path $LogDir ("production-json-pickup-runner-v1-{0}.log" -f $Stamp)

New-Item -ItemType Directory -Force $Control,$CommandInbox,$BridgeOutbox,$Downloads13,$Handoff,$LogDir | Out-Null

function Write-Step {
  param([string]$Message)
  $Line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
  Add-Content -Path $Log -Value $Line -Encoding UTF8
  Write-Host $Line
}

function Copy-OwnerText {
  param([string]$Text,[string]$FileName = "CURRENT_CHATGPT_HANDOFF.md")
  if (!$NoClipboard) {
    $Text | Set-Content (Join-Path $Control $FileName) -Encoding UTF8
    Set-Clipboard $Text
  }
}

function Run-ProcessSafe {
  param(
    [string]$Label,
    [string]$FilePath,
    [string[]]$ArgumentVector,
    [string]$WorkingDirectory = $RepoRoot
  )

  foreach ($Item in $ArgumentVector) {
    if ($null -eq $Item -or [string]::IsNullOrWhiteSpace([string]$Item)) {
      throw "$Label received empty/null argument item."
    }
  }

  Write-Step "RUN: $Label"
  Write-Step "$FilePath $($ArgumentVector -join ' ')"

  $SafeLabel = $Label -replace '[^a-zA-Z0-9_-]','_'
  $OutFile = Join-Path $LogDir "$SafeLabel-$Stamp.stdout.log"
  $ErrFile = Join-Path $LogDir "$SafeLabel-$Stamp.stderr.log"
  Remove-Item $OutFile,$ErrFile -Force -ErrorAction SilentlyContinue

  $Proc = Start-Process -FilePath $FilePath `
    -ArgumentList $ArgumentVector `
    -WorkingDirectory $WorkingDirectory `
    -Wait `
    -PassThru `
    -RedirectStandardOutput $OutFile `
    -RedirectStandardError $ErrFile

  $Stdout = if (Test-Path $OutFile) { Get-Content $OutFile -Raw } else { "" }
  $Stderr = if (Test-Path $ErrFile) { Get-Content $ErrFile -Raw } else { "" }

  if ($Stdout) { Add-Content -Path $Log -Value $Stdout -Encoding UTF8; Write-Host $Stdout }
  if ($Stderr) { Add-Content -Path $Log -Value $Stderr -Encoding UTF8; Write-Host $Stderr }

  if ($Proc.ExitCode -ne 0) { throw "$Label failed with exit $($Proc.ExitCode)" }

  return [pscustomobject]@{ stdout = $Stdout; stderr = $Stderr; exitCode = $Proc.ExitCode }
}

function Get-CommandForPhase {
  param([string]$Phase)

  $Candidates = Get-ChildItem $CommandInbox -File -Filter "*.json" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending

  foreach ($File in $Candidates) {
    try {
      $Text = Get-Content -LiteralPath $File.FullName -Raw
      $Json = $Text | ConvertFrom-Json
      if ([string]$Json.phase -eq [string]$Phase) {
        return [pscustomobject]@{ File = $File; Json = $Json; Text = $Text }
      }
    } catch {
      Write-Step "Skipping invalid command JSON: $($File.FullName) :: $($_.Exception.Message)"
    }
  }

  return $null
}

function Get-LatestCommand {
  $Candidates = Get-ChildItem $CommandInbox -File -Filter "*.json" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending

  foreach ($File in $Candidates) {
    try {
      $Text = Get-Content -LiteralPath $File.FullName -Raw
      $Json = $Text | ConvertFrom-Json
      if ($Json.phase -and $Json.phaseSlug -and $Json.expectedZipFilename) {
        return [pscustomobject]@{ File = $File; Json = $Json; Text = $Text }
      }
    } catch {
      Write-Step "Skipping invalid command JSON: $($File.FullName) :: $($_.Exception.Message)"
    }
  }

  return $null
}

function Convert-PhaseSlugToBranchSlug {
  param([string]$PhaseSlug)
  return ($PhaseSlug -replace '_','-')
}

function Convert-BranchSlugToTag {
  param([string]$BranchSlug)
  if ($BranchSlug -match '^phase([0-9]+)-(.+)$') {
    return "phase-$($Matches[1])-$($Matches[2])"
  }
  return $BranchSlug
}

function Wait-ForExactZip {
  param([string]$ZipPath,[int]$Minutes)

  if (Test-Path -LiteralPath $ZipPath) { return $true }
  if ($Minutes -le 0) { return $false }

  $Deadline = (Get-Date).AddMinutes($Minutes)
  $Tick = 0
  while ((Get-Date) -lt $Deadline) {
    if (Test-Path -LiteralPath $ZipPath) { return $true }
    $Tick += 1
    if (($Tick % 6) -eq 0) { Write-Step "WAITING_FOR_ZIP exact=$ZipPath" }
    Start-Sleep -Seconds 10
  }

  return $false
}

function Assert-RequestAndPrompt {
  param([object]$Command)

  $RequestPath = Join-Path $Control "artifact-watch-request.json"
  if (!(Test-Path -LiteralPath $RequestPath)) { throw "artifact-watch-request.json was not created." }

  $Request = Get-Content -LiteralPath $RequestPath -Raw | ConvertFrom-Json
  if ([string]$Request.phase -ne [string]$Command.phase) { throw "artifact-watch-request phase mismatch." }
  if ([string]$Request.expectedZipName -ne [string]$Command.expectedZipFilename) { throw "artifact-watch-request expectedZipName mismatch." }

  $PromptPath = [string]$Request.promptFile
  if ([string]::IsNullOrWhiteSpace($PromptPath) -or !(Test-Path -LiteralPath $PromptPath)) { throw "Prompt file missing: $PromptPath" }

  $PromptText = Get-Content -LiteralPath $PromptPath -Raw
  if ($PromptText -notlike "*Phase $($Command.phase)*" -or $PromptText -notlike "*$($Command.expectedZipFilename)*") {
    throw "Prompt validation failed for phase $($Command.phase)."
  }

  Copy-OwnerText -Text $PromptText -FileName "CURRENT_CHATGPT_HANDOFF.prompt.md"
  return [pscustomobject]@{ Request = $Request; PromptPath = $PromptPath; PromptText = $PromptText; RequestPath = $RequestPath }
}

if ($SelfTest) {
  $UnifiedPath = Join-Path $RepoRoot "scripts\sera-unified-phone-json-to-closeout-v1.ps1"
  $OrchestratorPath = Join-Path $RepoRoot "scripts\sera-json-to-closed-cleanly-orchestrator-v1.ps1"
  if (!(Test-Path -LiteralPath $UnifiedPath)) { throw "Unified script missing: $UnifiedPath" }
  if (!(Test-Path -LiteralPath $OrchestratorPath)) { throw "Orchestrator script missing: $OrchestratorPath" }
  Write-Host "PRODUCTION_JSON_PICKUP_RUNNER_SELFTEST PASS"
  Write-Host "command_inbox: $CommandInbox"
  Write-Host "unified: $UnifiedPath"
  Write-Host "orchestrator: $OrchestratorPath"
  exit 0
}

Write-Step "PRODUCTION_JSON_PICKUP_RUNNER_START"

$UnifiedScript = Join-Path $RepoRoot "scripts\sera-unified-phone-json-to-closeout-v1.ps1"
$OrchestratorScript = Join-Path $RepoRoot "scripts\sera-json-to-closed-cleanly-orchestrator-v1.ps1"
if (!(Test-Path -LiteralPath $UnifiedScript)) { throw "Unified script missing: $UnifiedScript" }
if (!(Test-Path -LiteralPath $OrchestratorScript)) { throw "Orchestrator script missing: $OrchestratorScript" }

$InitialCommand = Get-LatestCommand
if (!$InitialCommand) { Write-Step "NO_COMMAND_JSON_FOUND in command_inbox"; exit 0 }
Write-Step "COMMAND_JSON_FOUND phase=$($InitialCommand.Json.phase) path=$($InitialCommand.File.FullName)"

Run-ProcessSafe -Label "unified runonce request ready" -FilePath "powershell.exe" -ArgumentVector @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  $UnifiedScript,
  "-Mode",
  "RunOnce",
  "-RepoRoot",
  $RepoRoot,
  "-AutoOpsRoot",
  $AutoOpsRoot,
  "-WaitForZipSeconds",
  "0",
  "-NoApply"
) | Out-Null

$RequestPath = Join-Path $Control "artifact-watch-request.json"
if (!(Test-Path -LiteralPath $RequestPath)) { throw "artifact-watch-request.json was not created by unified RunOnce." }
$Request = Get-Content -LiteralPath $RequestPath -Raw | ConvertFrom-Json
$CommandHit = Get-CommandForPhase -Phase ([string]$Request.phase)
if (!$CommandHit) { throw "No command JSON found for request phase $($Request.phase)." }
$Command = $CommandHit.Json
$Prompt = Assert-RequestAndPrompt -Command $Command
Write-Step "REQUEST_READY phase=$($Command.phase) prompt=$($Prompt.PromptPath)"

$ExpectedZip = [string]$Command.expectedZipFilename
$ZipPath = Join-Path $Downloads13 $ExpectedZip
if (!(Wait-ForExactZip -ZipPath $ZipPath -Minutes $WaitForZipMinutes)) {
  Write-Step "WAITING_FOR_ZIP $ZipPath"
  Write-Host "REQUEST_READY: $($Prompt.PromptPath)"
  Write-Host "WAITING_FOR_ZIP: $ZipPath"
  Write-Host "Prompt copied to clipboard."
  exit 0
}

Write-Step "ZIP_FOUND $ZipPath"
if ($NoApply) { Write-Step "NoApply set. Stopping after ZIP_FOUND."; exit 0 }

$PhaseNumber = [int]$Command.phase
$PhaseToken = "phase$PhaseNumber"
$PhaseSlug = [string]$Command.phaseSlug
$BranchSlug = Convert-PhaseSlugToBranchSlug -PhaseSlug $PhaseSlug
$PhaseName = [IO.Path]::GetFileNameWithoutExtension($ExpectedZip)
$Branch = "work/$BranchSlug"
$Verifier = "scripts\verify-$BranchSlug.ps1"
$QaScript = "scripts\$BranchSlug.ps1"
$TagName = Convert-BranchSlugToTag -BranchSlug $BranchSlug
$ExpectedSha256 = ""
if ($Command.PSObject.Properties.Name -contains "expectedZipSha256") { $ExpectedSha256 = [string]$Command.expectedZipSha256 }

$OrchestratorArgs = @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  $OrchestratorScript,
  "-RepoRoot",
  $RepoRoot,
  "-AutoOpsRoot",
  $AutoOpsRoot,
  "-Phase",
  ([string]$PhaseNumber),
  "-PhaseToken",
  $PhaseToken,
  "-PhaseName",
  $PhaseName,
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

if (![string]::IsNullOrWhiteSpace($ExpectedSha256)) {
  $OrchestratorArgs += @(
    "-ExpectedSha256",
    $ExpectedSha256
  )
}

Run-ProcessSafe -Label "json to closed cleanly orchestrator" -FilePath "powershell.exe" -ArgumentVector $OrchestratorArgs | Out-Null

Write-Step "PRODUCTION_JSON_PICKUP_RUNNER_DONE phase=$PhaseNumber"
exit 0

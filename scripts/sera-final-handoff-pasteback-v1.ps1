param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$HandoffPath,
  [string]$FinalHandoffPath,
  [string]$BrowserDebugUrl = "http://127.0.0.1:9222",
  [string]$ExpectedFilename,
  [string]$ExpectedZipFilename,
  [string]$PhaseSlug,
  [switch]$SavedChatGptTargetOnly,
  [switch]$RequireSavedChatGptTargetOnly,
  [int]$MaxPastebackAttempts = 6,
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$RemainingArgs
)

$ErrorActionPreference = "Stop"

if (!$HandoffPath -and $FinalHandoffPath) {
  $HandoffPath = $FinalHandoffPath
}

$HandoffRoot = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $HandoffRoot | Out-Null

function Write-Step {
  param([string]$Message)
  Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
}

function Get-PhaseNameFromHandoff {
  param([string]$Path)

  $Name = [IO.Path]::GetFileName($Path)
  $Match = [regex]::Match($Name, "^(s\.e\.r\.a_.+?_overlay)-\d{8}_\d{6}-")
  if ($Match.Success) {
    return $Match.Groups[1].Value
  }

  return "unknown_phase"
}

function Get-PhaseSlugFromPhaseName {
  param([string]$PhaseName)

  $Out = $PhaseName
  $Out = $Out -replace "^s\.e\.r\.a_", ""
  $Out = $Out -replace "_overlay$", ""
  return $Out
}

function Write-PastebackResult {
  param(
    [string]$Status,
    [string]$Reason,
    [string]$TargetUrl = ""
  )

  $PhaseName = Get-PhaseNameFromHandoff -Path $HandoffPath
  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Path = Join-Path $HandoffRoot "$PhaseName-$Stamp-$Status.md"

  @"
Status: $Status
Phase: $PhaseName
Timestamp: $Stamp
TargetUrl: $TargetUrl

Reason:
$Reason

Final handoff:
$HandoffPath
"@ | Set-Content $Path -Encoding UTF8

  Write-Step "$Status $Path"
  Write-Host $Path
  return $Path
}

function Resolve-ExpectedFilename {
  $Expected = [string]$ExpectedFilename

  if ([string]::IsNullOrWhiteSpace($Expected)) {
    $Expected = [string]$ExpectedZipFilename
  }

  if ([string]::IsNullOrWhiteSpace($Expected) -and -not [string]::IsNullOrWhiteSpace($PhaseSlug)) {
    $Expected = "s.e.r.a_{0}_overlay.zip" -f $PhaseSlug
  }

  if ([string]::IsNullOrWhiteSpace($Expected) -and -not [string]::IsNullOrWhiteSpace($HandoffPath)) {
    $Leaf = Split-Path $HandoffPath -Leaf
    if ($Leaf -match "^(s\.e\.r\.a_.+?_overlay)-\d{8}_\d{6}-") {
      $Expected = "$($Matches[1]).zip"
    }
  }

  if ([string]::IsNullOrWhiteSpace($Expected)) {
    $Expected = "unknown_expected_filename.zip"
  }

  return $Expected
}

function Test-RetryablePastebackReason {
  param([string]$Text)

  if ([string]::IsNullOrWhiteSpace($Text)) {
    return $true
  }

  $Retryable = @(
    "CDP returned no string value",
    "Promise was collected",
    "send_button_not_found",
    "composer not ready",
    "send control not ready",
    "stale target focus",
    "target tab not focused",
    "Browser pasteback failed",
    "RawResult"
  )

  foreach ($Pattern in $Retryable) {
    if ($Text -like "*$Pattern*") {
      return $true
    }
  }

  return $false
}

function Get-LatestPastebackFile {
  param(
    [string]$PhaseName,
    [string]$Suffix,
    [datetime]$Since
  )

  return Get-ChildItem $HandoffRoot -File -Filter "$PhaseName-*$Suffix.md" -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -ge $Since.AddSeconds(-5) } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}

function Invoke-TargetFocusBestEffort {
  param(
    [string]$PhaseSlugValue,
    [string]$Expected
  )

  try {
    $TargetRoot = Join-Path $AutoOpsRoot "00_control_center\chatgpt_targets"
    $TargetPath = Join-Path $TargetRoot "$PhaseSlugValue-saved-chatgpt-target.json"

    if (!(Test-Path $TargetPath)) {
      return
    }

    $Target = Get-Content -LiteralPath $TargetPath -Raw | ConvertFrom-Json
    $TargetId = [string]$Target.targetId
    if ([string]::IsNullOrWhiteSpace($TargetId)) {
      return
    }

    Invoke-RestMethod -Uri "$BrowserDebugUrl/json/activate/$TargetId" -TimeoutSec 3 | Out-Null
    Write-Step "PASTEBACK_TARGET_REFOCUSED targetId=$TargetId expected=$Expected"
    Start-Sleep -Seconds 2
  } catch {
    Write-Step "PASTEBACK_TARGET_REFOCUS_SKIPPED reason=$($_.Exception.Message)"
  }
}

function Get-LegacyPastebackScript {
  $Candidates = @(
    (Join-Path $PSScriptRoot "sera-final-handoff-pasteback-v1.pre_phase186_realfix.ps1"),
    (Join-Path $PSScriptRoot "sera-final-handoff-pasteback-v1.pre_phase185.ps1"),
    (Join-Path $PSScriptRoot "sera-final-handoff-pasteback-v1.pre_phase187_reliability.ps1")
  )

  foreach ($Candidate in $Candidates) {
    if (Test-Path $Candidate) {
      return $Candidate
    }
  }

  throw "Legacy pasteback helper missing. Checked: $($Candidates -join '; ')"
}

if (!$HandoffPath) {
  Write-PastebackResult -Status "PASTEBACK_BLOCKED" -Reason "HandoffPath is required."
  exit 1
}

if (!(Test-Path $HandoffPath)) {
  Write-PastebackResult -Status "PASTEBACK_BLOCKED" -Reason "Final handoff file not found."
  exit 1
}

$HandoffText = Get-Content -LiteralPath $HandoffPath -Raw
if ($HandoffText -notmatch "Status:\s*(CLOSED_CLEANLY|BLOCKED)") {
  Write-PastebackResult -Status "PASTEBACK_SKIPPED_SAFE" -Reason "Handoff is not a final CLOSED_CLEANLY or BLOCKED handoff."
  exit 0
}

$PhaseName = Get-PhaseNameFromHandoff -Path $HandoffPath
if (!$PhaseSlug) {
  $PhaseSlug = Get-PhaseSlugFromPhaseName -PhaseName $PhaseName
}

$Expected = Resolve-ExpectedFilename
Write-Step "PASTEBACK_EXPECTED_FILENAME_RECOVERED $Expected"

$Legacy = Get-LegacyPastebackScript
Write-Step "PASTEBACK_RELIABILITY_WRAPPER legacy=$Legacy"

$LastReason = ""
for ($Attempt = 1; $Attempt -le $MaxPastebackAttempts; $Attempt++) {
  $Started = Get-Date

  Write-Step "PASTEBACK_INTERNAL_RETRY_START attempt=$Attempt max=$MaxPastebackAttempts"
  Invoke-TargetFocusBestEffort -PhaseSlugValue $PhaseSlug -Expected $Expected

  $ArgList = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $Legacy,
    "-RepoRoot", $RepoRoot,
    "-AutoOpsRoot", $AutoOpsRoot,
    "-HandoffPath", $HandoffPath,
    "-PhaseSlug", $PhaseSlug,
    "-ExpectedFilename", $Expected
  )

  if ($SavedChatGptTargetOnly -or $RequireSavedChatGptTargetOnly) {
    $ArgList += "-SavedChatGptTargetOnly"
  }

  & powershell.exe @ArgList
  $Code = $LASTEXITCODE
  if ($null -eq $Code) { $Code = 0 }

  $Posted = Get-LatestPastebackFile -PhaseName $PhaseName -Suffix "PASTEBACK_POSTED_TEXT_MATCH" -Since $Started
  if ($Posted) {
    Write-Step "PASTEBACK_POSTED_TEXT_MATCH $($Posted.FullName)"
    Write-Host "PASTEBACK_POSTED_TEXT_MATCH_FOUND $($Posted.FullName)"
    exit 0
  }

  $Blocked = Get-LatestPastebackFile -PhaseName $PhaseName -Suffix "PASTEBACK_BLOCKED" -Since $Started
  if ($Blocked) {
    $LastReason = Get-Content -LiteralPath $Blocked.FullName -Raw
    Write-Step "PASTEBACK_RETRYABLE_BLOCKED attempt=$Attempt file=$($Blocked.FullName)"
    Write-Host $LastReason
  } else {
    $LastReason = "No PASTEBACK_POSTED_TEXT_MATCH produced. Legacy exit code=$Code"
    Write-Step "PASTEBACK_RETRYABLE_BLOCKED attempt=$Attempt reason=$LastReason"
  }

  if ($Attempt -lt $MaxPastebackAttempts -and (Test-RetryablePastebackReason -Text $LastReason)) {
    $Delay = 4 + ($Attempt * 3)
    Write-Step "PASTEBACK_WAIT_BEFORE_RETRY seconds=$Delay"
    Start-Sleep -Seconds $Delay
    continue
  }

  if (!(Test-RetryablePastebackReason -Text $LastReason)) {
    break
  }
}

Write-PastebackResult -Status "PASTEBACK_BLOCKED" -Reason @"
Pasteback did not produce PASTEBACK_POSTED_TEXT_MATCH after $MaxPastebackAttempts internal attempts.

Last reason:
$LastReason
"@
exit 1

# PHASE187_MARKER: PASTEBACK_EXPECTED_FILENAME_RECOVERED
# PHASE187_MARKER: PASTEBACK_INTERNAL_RETRY_START
# PHASE187_MARKER: PASTEBACK_RETRYABLE_BLOCKED
# PHASE187_MARKER: send_button_not_found
# PHASE187_MARKER: Promise was collected
# PHASE187_MARKER: CDP returned no string value
# PHASE187_MARKER: SavedChatGptTargetOnly

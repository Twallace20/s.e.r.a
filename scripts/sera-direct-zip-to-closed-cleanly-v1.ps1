param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",

  [string]$ZipPath,
  [string]$ZipFullPath,
  [string]$Zip,
  [string]$OverlayZipPath,
  [string]$OverlayZipFullPath,
  [string]$OverlayZip,

  [string]$ExpectedFilename,
  [string]$ExpectedZipFilename,

  [string]$PhaseSlug,
  [string]$PhaseName,
  [string]$PhaseToken,
  [int]$Phase,
  [string]$Branch,
  [string]$TagName,

  [switch]$SavedChatGptTargetOnly,

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$RemainingArgs
)

$ErrorActionPreference = "Stop"

$DirectStart = Get-Date
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Downloads13 | Out-Null
New-Item -ItemType Directory -Force $Handoff | Out-Null

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

function Get-ExpectedPhaseName {
  param(
    [string]$PhaseNameValue,
    [string]$PhaseSlugValue,
    [string]$ExpectedZipValue
  )

  if (-not [string]::IsNullOrWhiteSpace($PhaseNameValue)) { return $PhaseNameValue }
  if (-not [string]::IsNullOrWhiteSpace($PhaseSlugValue)) { return "s.e.r.a_{0}_overlay" -f $PhaseSlugValue }
  if ($ExpectedZipValue -match "^(s\.e\.r\.a_.+_overlay)\.zip$") { return $Matches[1] }
  return ""
}

function Test-SeraFinalHandoffIdentityIntegrity {
  param(
    [string]$Path,
    [string]$ExpectedPhaseName,
    [string]$ExpectedPhaseSlug,
    [int]$ExpectedPhase
  )

  # PHASE189_FINAL_HANDOFF_IDENTITY_INTEGRITY_GUARD
  if ([string]::IsNullOrWhiteSpace($Path) -or !(Test-Path $Path)) {
    return [pscustomobject]@{ Ok = $false; Reason = "Final handoff missing." }
  }

  $Text = Get-Content -LiteralPath $Path -Raw

  if ($Text -notmatch "(?m)^Status:\s*CLOSED_CLEANLY\s*$") {
    return [pscustomobject]@{ Ok = $false; Reason = "Final handoff missing exact CLOSED_CLEANLY status line." }
  }

  if (-not [string]::IsNullOrWhiteSpace($ExpectedPhaseName) -and $Text -notmatch [regex]::Escape("Phase: $ExpectedPhaseName")) {
    return [pscustomobject]@{ Ok = $false; Reason = "Final handoff Phase line does not match $ExpectedPhaseName." }
  }

  if (-not [string]::IsNullOrWhiteSpace($ExpectedPhaseSlug) -and $Text -notlike "*$ExpectedPhaseSlug*") {
    return [pscustomobject]@{ Ok = $false; Reason = "Final handoff does not mention current phaseSlug $ExpectedPhaseSlug." }
  }

  if ($ExpectedPhase -gt 0 -and $Text -notlike "*Phase$ExpectedPhase*") {
    return [pscustomobject]@{ Ok = $false; Reason = "Final handoff does not mention current Phase$ExpectedPhase." }
  }

  $ForbiddenResultPatterns = @(
    "Result:\s*Phase180\s+closed cleanly",
    "Result:\s*Phase186\s+closed cleanly",
    "Result:\s*Phase187\s+closed cleanly",
    "Result:\s*Phase188\s+closed cleanly"
  )

  foreach ($Pattern in $ForbiddenResultPatterns) {
    if ($Text -match $Pattern) {
      return [pscustomobject]@{ Ok = $false; Reason = "STALE_HANDOFF_REJECTED: older phase appears as result phase: $Pattern" }
    }
  }

  return [pscustomobject]@{ Ok = $true; Reason = "FINAL_HANDOFF_IDENTITY_VALIDATED" }
}

$Expected = [string]$ExpectedFilename

if ([string]::IsNullOrWhiteSpace($Expected)) {
  $Expected = [string]$ExpectedZipFilename
}

if ([string]::IsNullOrWhiteSpace($Expected) -and -not [string]::IsNullOrWhiteSpace($PhaseSlug)) {
  $Expected = "s.e.r.a_{0}_overlay.zip" -f $PhaseSlug
}

if ([string]::IsNullOrWhiteSpace($PhaseToken) -and -not [string]::IsNullOrWhiteSpace($PhaseSlug)) {
  $PhaseToken = Convert-SlugToBranchTail -Slug $PhaseSlug
}

if ([string]::IsNullOrWhiteSpace($Branch) -and -not [string]::IsNullOrWhiteSpace($PhaseSlug)) {
  $Branch = "work/" + (Convert-SlugToBranchTail -Slug $PhaseSlug)
}

if ([string]::IsNullOrWhiteSpace($TagName) -and -not [string]::IsNullOrWhiteSpace($PhaseSlug)) {
  $TagName = Convert-SlugToTagName -Slug $PhaseSlug
}

if ([string]::IsNullOrWhiteSpace($PhaseName)) {
  $PhaseName = Get-ExpectedPhaseName -PhaseNameValue $PhaseName -PhaseSlugValue $PhaseSlug -ExpectedZipValue $Expected
}

$Kebab = ""
if (-not [string]::IsNullOrWhiteSpace($PhaseSlug)) {
  $Kebab = Convert-SlugToBranchTail -Slug $PhaseSlug
}

$VerifierRelative = ""
$QaRelative = ""

if (-not [string]::IsNullOrWhiteSpace($Kebab)) {
  $VerifierRelative = "scripts\verify-$Kebab.ps1"
  $QaRelative = "scripts\$Kebab.ps1"
}

$VerifierFull = ""
$QaFull = ""

if ($VerifierRelative) {
  $VerifierFull = Join-Path $RepoRoot $VerifierRelative
}

if ($QaRelative) {
  $QaFull = Join-Path $RepoRoot $QaRelative
}

$CandidateValues = @(
  $ZipPath,
  $ZipFullPath,
  $Zip,
  $OverlayZipPath,
  $OverlayZipFullPath,
  $OverlayZip
) | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) }

$OriginalZipArgumentWasBlank = (@($CandidateValues).Count -eq 0)

function Resolve-SeraOverlayZip {
  param(
    [string[]]$Candidates,
    [string]$ExpectedName,
    [string]$PhaseSlugValue
  )

  foreach ($Candidate in @($Candidates)) {
    $Value = [string]$Candidate

    if ([IO.Path]::IsPathRooted($Value) -and (Test-Path $Value)) {
      Write-Host "ZIP_PATH_RESOLVED_FROM_ARGUMENT $Value"
      return (Resolve-Path $Value).Path
    }

    $CandidateInDownloads = Join-Path $Downloads13 $Value
    if (Test-Path $CandidateInDownloads) {
      Write-Host "ZIP_PATH_RESOLVED_FROM_DOWNLOADS13 $CandidateInDownloads"
      return (Resolve-Path $CandidateInDownloads).Path
    }
  }

  if (-not [string]::IsNullOrWhiteSpace($ExpectedName)) {
    $ExpectedPath = Join-Path $Downloads13 $ExpectedName

    if (Test-Path $ExpectedPath) {
      Write-Host "ZIP_PATH_RESOLVED_FROM_EXPECTED_FILENAME $ExpectedPath"
      return (Resolve-Path $ExpectedPath).Path
    }

    $FreshExact = Get-ChildItem $Downloads13 -File -Filter $ExpectedName -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1

    if ($FreshExact) {
      Write-Host "ZIP_PATH_RESOLVED_FROM_DOWNLOADS13 $($FreshExact.FullName)"
      return $FreshExact.FullName
    }
  }

  if (-not [string]::IsNullOrWhiteSpace($PhaseSlugValue)) {
    $FreshBySlug = Get-ChildItem $Downloads13 -File -Filter "*$PhaseSlugValue*.zip" -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1

    if ($FreshBySlug) {
      Write-Host "ZIP_PATH_RESOLVED_FROM_DOWNLOADS13 $($FreshBySlug.FullName)"
      return $FreshBySlug.FullName
    }
  }

  $Searched = @($Downloads13, $RepoRoot) -join "; "
  throw "ZIP missing: expectedFilename=$ExpectedName phaseSlug=$PhaseSlugValue searchedDirectories=$Searched originalZipArgument=$($Candidates -join ',')"
}

$ResolvedZip = Resolve-SeraOverlayZip -Candidates $CandidateValues -ExpectedName $Expected -PhaseSlugValue $PhaseSlug

if ($OriginalZipArgumentWasBlank) {
  Write-Host "ZIP_PATH_ARGUMENT_WAS_BLANK_RECOVERED $ResolvedZip"
}

if ([string]::IsNullOrWhiteSpace($Expected)) {
  $Expected = Split-Path $ResolvedZip -Leaf
}

$LegacyCandidates = @(
  (Join-Path $PSScriptRoot "sera-direct-zip-to-closed-cleanly-v1.pre_phase186_realfix.ps1"),
  (Join-Path $PSScriptRoot "sera-direct-zip-to-closed-cleanly-v1.pre_phase187_phase_token_fix.ps1"),
  (Join-Path $PSScriptRoot "sera-direct-zip-to-closed-cleanly-v1.pre_phase185.ps1")
)

$Legacy = $null
foreach ($Candidate in $LegacyCandidates) {
  if (Test-Path $Candidate) {
    $Legacy = $Candidate
    break
  }
}

if (!$Legacy) {
  throw "Legacy direct closeout missing. Checked: $($LegacyCandidates -join '; ')"
}

$CommandInfo = Get-Command $Legacy
$InvokeParams = @{}

$PossibleParams = @{
  RepoRoot = $RepoRoot
  AutoOpsRoot = $AutoOpsRoot

  ZipPath = $ResolvedZip
  ZipFullPath = $ResolvedZip
  Zip = $ResolvedZip
  OverlayZipPath = $ResolvedZip
  OverlayZipFullPath = $ResolvedZip
  OverlayZip = $ResolvedZip

  ExpectedFilename = $Expected
  ExpectedZipFilename = $Expected

  PhaseSlug = $PhaseSlug
  PhaseName = $PhaseName
  PhaseToken = $PhaseToken
  Phase = $Phase
  Branch = $Branch
  TagName = $TagName

  VerifierScript = $VerifierRelative
  VerifierScriptPath = $VerifierFull
  VerifierPath = $VerifierFull
  VerifyScript = $VerifierRelative
  VerifyScriptPath = $VerifierFull
  VerifyPath = $VerifierFull

  QaScript = $QaRelative
  QaScriptPath = $QaFull
  QaPath = $QaFull
  QualityGateScript = $QaRelative
  QualityGateScriptPath = $QaFull
}

foreach ($Key in $PossibleParams.Keys) {
  if ($CommandInfo.Parameters.ContainsKey($Key) -and -not [string]::IsNullOrWhiteSpace([string]$PossibleParams[$Key])) {
    $InvokeParams[$Key] = $PossibleParams[$Key]
  }
}

if ($SavedChatGptTargetOnly -and $CommandInfo.Parameters.ContainsKey("SavedChatGptTargetOnly")) {
  $InvokeParams["SavedChatGptTargetOnly"] = $true
}

Write-Host "DIRECT_CLOSEOUT_WRAPPER_INVOKE legacy=$Legacy"
Write-Host "DIRECT_CLOSEOUT_WRAPPER_ZIP $ResolvedZip"
Write-Host "DIRECT_CLOSEOUT_WRAPPER_EXPECTED_FILENAME $Expected"
Write-Host "DIRECT_CLOSEOUT_WRAPPER_PHASE_TOKEN $PhaseToken"
Write-Host "DIRECT_CLOSEOUT_WRAPPER_PHASE_NAME $PhaseName"
Write-Host "DIRECT_CLOSEOUT_WRAPPER_VERIFIER $VerifierRelative"
Write-Host "DIRECT_CLOSEOUT_WRAPPER_QA $QaRelative"
Write-Host "PHASE189_FINAL_HANDOFF_IDENTITY_INTEGRITY_GUARD enabled"

& $Legacy @InvokeParams

$Code = $LASTEXITCODE
if ($null -eq $Code) { $Code = 0 }

if ($Code -eq 0 -and -not [string]::IsNullOrWhiteSpace($PhaseName)) {
  $LatestClosed = Get-ChildItem $Handoff -File -Filter "$PhaseName-*CLOSED_CLEANLY.md" -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -ge $DirectStart.AddSeconds(-30) } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if ($LatestClosed) {
    $Integrity = Test-SeraFinalHandoffIdentityIntegrity -Path $LatestClosed.FullName -ExpectedPhaseName $PhaseName -ExpectedPhaseSlug $PhaseSlug -ExpectedPhase $Phase
    if (-not $Integrity.Ok) {
      Write-Host "STALE_HANDOFF_REJECTED $($Integrity.Reason) path=$($LatestClosed.FullName)"
      exit 1
    }

    Write-Host "FINAL_HANDOFF_IDENTITY_VALIDATED $($LatestClosed.FullName)"
  } else {
    Write-Host "FINAL_HANDOFF_IDENTITY_VALIDATION_SKIPPED no fresh CLOSED_CLEANLY handoff found for $PhaseName"
  }
}

exit $Code

# PHASE187_COMPAT_FIX: PhaseToken is passed as a named parameter, never as verifier script path.
# PHASE187_COMPAT_FIX: VerifierScript is derived from PhaseSlug.
# PHASE187_COMPAT_FIX: QaScript is derived from PhaseSlug.
# PHASE187_COMPAT_FIX: ZIP_PATH_ARGUMENT_WAS_BLANK_RECOVERED
# PHASE187_COMPAT_FIX: ZIP_PATH_RESOLVED_FROM_EXPECTED_FILENAME
# PHASE187_COMPAT_FIX: ZIP_PATH_RESOLVED_FROM_DOWNLOADS13
# PHASE189_FINAL_HANDOFF_IDENTITY_INTEGRITY_GUARD
# FINAL_HANDOFF_IDENTITY_VALIDATED
# STALE_HANDOFF_REJECTED

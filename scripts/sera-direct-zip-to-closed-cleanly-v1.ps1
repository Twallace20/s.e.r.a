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

$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
New-Item -ItemType Directory -Force $Downloads13 | Out-Null

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
Write-Host "DIRECT_CLOSEOUT_WRAPPER_VERIFIER $VerifierRelative"
Write-Host "DIRECT_CLOSEOUT_WRAPPER_QA $QaRelative"

& $Legacy @InvokeParams

$Code = $LASTEXITCODE
if ($null -eq $Code) { $Code = 0 }
exit $Code

# PHASE187_COMPAT_FIX: PhaseToken is passed as a named parameter, never as verifier script path.
# PHASE187_COMPAT_FIX: VerifierScript is derived from PhaseSlug.
# PHASE187_COMPAT_FIX: QaScript is derived from PhaseSlug.
# PHASE187_COMPAT_FIX: ZIP_PATH_ARGUMENT_WAS_BLANK_RECOVERED
# PHASE187_COMPAT_FIX: ZIP_PATH_RESOLVED_FROM_EXPECTED_FILENAME
# PHASE187_COMPAT_FIX: ZIP_PATH_RESOLVED_FROM_DOWNLOADS13
# PHASE187_COMPAT_FIX: expectedFilename and searchedDirectories included in ZIP missing errors.

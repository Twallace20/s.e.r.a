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
  [int]$Phase,
  [string]$Branch,
  [string]$TagName,

  [switch]$SavedChatGptTargetOnly,

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$RemainingArgs
)

$ErrorActionPreference = "Stop"

$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$LogDir = Join-Path $AutoOpsRoot "00_control_center\logs"
New-Item -ItemType Directory -Force $Downloads13 | Out-Null
New-Item -ItemType Directory -Force $LogDir | Out-Null

$Expected = [string]$ExpectedFilename
if ([string]::IsNullOrWhiteSpace($Expected)) {
  $Expected = [string]$ExpectedZipFilename
}

if ([string]::IsNullOrWhiteSpace($Expected) -and -not [string]::IsNullOrWhiteSpace($PhaseSlug)) {
  $Expected = "s.e.r.a_{0}_overlay.zip" -f $PhaseSlug
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

$Legacy = Join-Path $PSScriptRoot "sera-direct-zip-to-closed-cleanly-v1.pre_phase185.ps1"

if (!(Test-Path $Legacy)) {
  throw "Legacy direct closeout missing: $Legacy"
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
  Phase = $Phase
  Branch = $Branch
  TagName = $TagName
}

foreach ($Key in $PossibleParams.Keys) {
  if ($CommandInfo.Parameters.ContainsKey($Key)) {
    $InvokeParams[$Key] = $PossibleParams[$Key]
  }
}

if ($SavedChatGptTargetOnly -and $CommandInfo.Parameters.ContainsKey("SavedChatGptTargetOnly")) {
  $InvokeParams["SavedChatGptTargetOnly"] = $true
}

Write-Host "DIRECT_CLOSEOUT_WRAPPER_INVOKE legacy=$Legacy"
Write-Host "DIRECT_CLOSEOUT_WRAPPER_ZIP $ResolvedZip"
Write-Host "DIRECT_CLOSEOUT_WRAPPER_EXPECTED_FILENAME $Expected"

if ($RemainingArgs -and $RemainingArgs.Count -gt 0) {
  & $Legacy @InvokeParams @RemainingArgs
} else {
  & $Legacy @InvokeParams
}

$Code = $LASTEXITCODE
if ($null -eq $Code) { $Code = 0 }
exit $Code

# PHASE185_MARKER: ZIP_PATH_ARGUMENT_WAS_BLANK_RECOVERED
# PHASE185_MARKER: ZIP_PATH_RESOLVED_FROM_EXPECTED_FILENAME
# PHASE185_MARKER: ZIP_PATH_RESOLVED_FROM_DOWNLOADS13
# PHASE185_MARKER: ZIP missing reason includes expectedFilename and searchedDirectories

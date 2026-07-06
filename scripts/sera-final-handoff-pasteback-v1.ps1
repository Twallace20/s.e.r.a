param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$HandoffPath,
  [string]$PhaseSlug,
  [string]$ExpectedFilename,
  [string]$ExpectedZipFilename,
  [switch]$SavedChatGptTargetOnly,

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$RemainingArgs
)

$ErrorActionPreference = "Stop"

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

Write-Host "PASTEBACK_EXPECTED_FILENAME_RECOVERED $Expected"

$Legacy = Join-Path $PSScriptRoot "sera-final-handoff-pasteback-v1.pre_phase185.ps1"

if (!(Test-Path $Legacy)) {
  throw "Legacy pasteback helper missing: $Legacy"
}

$CommandInfo = Get-Command $Legacy
$InvokeParams = @{}

$PossibleParams = @{
  RepoRoot = $RepoRoot
  AutoOpsRoot = $AutoOpsRoot
  HandoffPath = $HandoffPath
  PhaseSlug = $PhaseSlug
  ExpectedFilename = $Expected
  ExpectedZipFilename = $Expected
}

foreach ($Key in $PossibleParams.Keys) {
  if ($CommandInfo.Parameters.ContainsKey($Key)) {
    $InvokeParams[$Key] = $PossibleParams[$Key]
  }
}

if ($SavedChatGptTargetOnly -and $CommandInfo.Parameters.ContainsKey("SavedChatGptTargetOnly")) {
  $InvokeParams["SavedChatGptTargetOnly"] = $true
}

if ($RemainingArgs -and $RemainingArgs.Count -gt 0) {
  & $Legacy @InvokeParams @RemainingArgs
} else {
  & $Legacy @InvokeParams
}

$Code = $LASTEXITCODE
if ($null -eq $Code) { $Code = 0 }
exit $Code

# PHASE185_MARKER: PASTEBACK_EXPECTED_FILENAME_RECOVERED
# PHASE185_MARKER: ExpectedFilename fallback prevents missing argument failure

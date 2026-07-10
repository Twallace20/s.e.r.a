param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)
$ErrorActionPreference = "Stop"
$CasesPath = Join-Path $RepoRoot "tests\fixtures\phase200-repeat-full-autopilot\cases.json"
if (!(Test-Path -LiteralPath $CasesPath)) { throw "Missing Phase200 fixture cases: $CasesPath" }
$Cases = Get-Content -LiteralPath $CasesPath -Raw | ConvertFrom-Json
$Failures = @()
$Required = @(
  'confirmedPromptSubmit','exactDomDownload','verified','qa','merged','pushMain','pushTag',
  'remoteMain','remoteTag','handoffIdentity','zipSha','postCloseoutCleanRepo','noMidRunRepair'
)
foreach ($Case in @($Cases.cases)) {
  $G = $Case.gates
  $All = $true
  foreach ($Name in $Required) {
    if ($G.PSObject.Properties.Name -notcontains $Name) { $All = $false; continue }
    if ($G.$Name -ne $true) { $All = $false }
  }
  $Actual = if ($All) { 'CLOSED_CLEANLY' } else { 'BLOCKED' }
  if ($Actual -ne [string]$Case.expectedStatus) {
    $Failures += "$($Case.name): expected=$($Case.expectedStatus) actual=$Actual"
  }
}
if ($Failures.Count -gt 0) {
  Write-Host "PHASE200_FIXTURE_PROOF_FAIL"
  $Failures | ForEach-Object { Write-Host $_ }
  exit 1
}
Write-Host "PHASE200_FIXTURE_PROOF_PASS cases=$(@($Cases.cases).Count)"
exit 0

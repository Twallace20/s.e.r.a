[CmdletBinding()]
param([string]$RepoRoot = (Get-Location).Path)
$ErrorActionPreference = "Stop"
$Gate = Join-Path $PSScriptRoot "sera-post-closeout-clean-repo-endurance-autopilot-v1.ps1"
$CasesPath = Join-Path $RepoRoot "tests\fixtures\phase199-clean-repo-endurance\cases.json"
if (!(Test-Path -LiteralPath $Gate)) { throw "Missing gate script: $Gate" }
if (!(Test-Path -LiteralPath $CasesPath)) { throw "Missing fixture cases: $CasesPath" }
$Cases = Get-Content -LiteralPath $CasesPath -Raw | ConvertFrom-Json
$Failures = @()
foreach ($Case in @($Cases.cases)) {
  $Args = @("-NoProfile","-ExecutionPolicy","Bypass","-File",$Gate)
  foreach ($Flag in @($Case.flags)) { $Args += "-$Flag" }
  $Raw = & powershell.exe @Args | Out-String
  $JsonLine = ($Raw -split "`r?`n" | Where-Object { $_.Trim().StartsWith("{") } | Select-Object -Last 1)
  if (!$JsonLine) { $Failures += "$($Case.name): no JSON returned; raw=$Raw"; continue }
  $Result = $JsonLine | ConvertFrom-Json
  if ([string]$Result.status -ne [string]$Case.expect) {
    $Failures += "$($Case.name): expected=$($Case.expect) actual=$($Result.status) reason=$($Result.reason)"
  }
}
if ($Failures.Count -gt 0) {
  Write-Host "PHASE199_FIXTURE_PROOF_FAIL"
  $Failures | ForEach-Object { Write-Host $_ }
  exit 1
}
Write-Host "PHASE199_FIXTURE_PROOF_PASS cases=$(@($Cases.cases).Count)"
exit 0

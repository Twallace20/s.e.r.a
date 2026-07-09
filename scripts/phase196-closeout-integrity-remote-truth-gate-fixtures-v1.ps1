[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)
$ErrorActionPreference = "Stop"
$FixturesPath = Join-Path $RepoRoot "tests\fixtures\phase196-closeout-integrity\cases.json"
$Gate = Join-Path $RepoRoot "scripts\sera-closeout-integrity-remote-truth-gate-v1.ps1"
if (!(Test-Path -LiteralPath $FixturesPath)) { throw "Missing fixtures: $FixturesPath" }
if (!(Test-Path -LiteralPath $Gate)) { throw "Missing gate script: $Gate" }
$Fixtures = Get-Content -LiteralPath $FixturesPath -Raw | ConvertFrom-Json
$Failures = @()
foreach ($Case in @($Fixtures.cases)) {
  $Temp = Join-Path $env:TEMP ("phase196-fixture-{0}.json" -f ([guid]::NewGuid().ToString('N')))
  $Case.context | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $Temp -Encoding UTF8
  $Json = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Gate -ContextJson $Temp -AutoOpsRoot $AutoOpsRoot | Out-String
  Remove-Item -LiteralPath $Temp -Force -ErrorAction SilentlyContinue
  $Result = $Json | ConvertFrom-Json
  if ([string]$Result.status -ne [string]$Case.expectStatus) {
    $Failures += "$($Case.name): expected=$($Case.expectStatus) actual=$($Result.status) reason=$($Result.reason)"
  }
}
if ($Failures.Count -gt 0) { throw "Phase196 fixture failures:`n$($Failures -join "`n")" }
Write-Host "PHASE196_FIXTURE_PROOF_PASS cases=$(@($Fixtures.cases).Count)"

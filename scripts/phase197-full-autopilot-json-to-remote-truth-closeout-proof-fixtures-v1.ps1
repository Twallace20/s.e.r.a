[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)
$ErrorActionPreference = "Stop"
$FixturesPath = Join-Path $RepoRoot "tests\fixtures\phase197-full-autopilot\cases.json"
$Gate = Join-Path $RepoRoot "scripts\sera-full-autopilot-json-to-remote-truth-closeout-proof-v1.ps1"
if (!(Test-Path -LiteralPath $FixturesPath)) { throw "Missing fixtures: $FixturesPath" }
if (!(Test-Path -LiteralPath $Gate)) { throw "Missing gate script: $Gate" }
$Fixtures = Get-Content -LiteralPath $FixturesPath -Raw | ConvertFrom-Json
$Failures = @()
foreach ($Case in @($Fixtures.cases)) {
  $Temp = Join-Path $env:TEMP ("phase197-fixture-{0}.json" -f ([guid]::NewGuid().ToString('N')))
  $Case.context | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $Temp -Encoding UTF8
  $Json = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Gate -ContextJson $Temp -AutoOpsRoot $AutoOpsRoot | Out-String
  Remove-Item -LiteralPath $Temp -Force -ErrorAction SilentlyContinue
  try { $Result = $Json | ConvertFrom-Json } catch { $Failures += "$($Case.name): gate did not emit JSON. raw=$Json"; continue }
  if ([string]$Result.status -ne [string]$Case.expectStatus) {
    $Failures += "$($Case.name): expected=$($Case.expectStatus) actual=$($Result.status) reason=$($Result.reason)"
  }
}
if ($Failures.Count -gt 0) { throw "Phase197 fixture failures:`n$($Failures -join "`n")" }
Write-Host "PHASE197_FULL_AUTOPILOT_FIXTURE_PROOF_PASS cases=$(@($Fixtures.cases).Count)"

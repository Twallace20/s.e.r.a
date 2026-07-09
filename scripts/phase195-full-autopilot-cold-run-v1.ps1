param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$PhaseSlug = "phase195_full_autopilot_cold_run_v1",
  [string]$ExpectedZipFilename = "s.e.r.a_phase195_full_autopilot_cold_run_v1_overlay.zip"
)

$ErrorActionPreference = "Stop"

$RealQa = Join-Path $RepoRoot "scripts\qa-phase195-full-autopilot-cold-run-v1.ps1"

if (!(Test-Path -LiteralPath $RealQa)) {
  throw "Real Phase195 QA script missing: $RealQa"
}

Write-Host "PHASE195_QA_ALIAS_DELEGATING_TO=$RealQa"

& powershell -NoProfile -ExecutionPolicy Bypass `
  -File $RealQa `
  -RepoRoot $RepoRoot `
  -AutoOpsRoot $AutoOpsRoot `
  -PhaseSlug $PhaseSlug `
  -ExpectedZipFilename $ExpectedZipFilename

exit $LASTEXITCODE

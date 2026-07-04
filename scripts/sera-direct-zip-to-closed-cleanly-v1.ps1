param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Runner = Join-Path $RepoRoot "scripts\sera-production-json-pickup-runner-v1.ps1"
if (!(Test-Path $Runner)) {
  throw "Production runner missing: $Runner"
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Runner -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot -Once -WaitForZipMinutes 0
exit $LASTEXITCODE

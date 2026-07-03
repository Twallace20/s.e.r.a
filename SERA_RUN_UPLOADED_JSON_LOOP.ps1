param(
  [string]$RepoRoot = $PSScriptRoot,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [ValidateSet("Auto","Cdp","ClipboardOnly","SkipBrowser")]
  [string]$BrowserMode = "Auto",
  [int]$WaitForZipMinutes = 240,
  [switch]$Once,
  [switch]$NoMerge
)

$ErrorActionPreference = "Stop"

$Router = Join-Path $RepoRoot "scripts\sera-full-auto-json-loop-router-v1.ps1"
if (!(Test-Path $Router)) {
  throw "S.E.R.A. full auto loop router missing: $Router"
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Router `
  -RepoRoot $RepoRoot `
  -AutoOpsRoot $AutoOpsRoot `
  -BrowserMode $BrowserMode `
  -WaitForZipMinutes $WaitForZipMinutes `
  -Once:$Once `
  -NoMerge:$NoMerge

exit $LASTEXITCODE

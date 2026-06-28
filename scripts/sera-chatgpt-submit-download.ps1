param(
  [switch]$DryRun,
  [switch]$Execute,
  [string]$PromptFile,
  [string]$ExpectedZipName
)

$ErrorActionPreference = "Stop"

$Repo = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Repo

$NodeScript = Join-Path $Repo "scripts\chatgpt-bridge-submit-download.mjs"
if (!(Test-Path $NodeScript)) {
  throw "Missing ChatGPT bridge submit/download script: $NodeScript"
}

$argsList = @()
if ($Execute) { $argsList += "--execute" }
if ($DryRun) { $argsList += "--dry-run" }
if ($PromptFile) { $argsList += @("--prompt-file", $PromptFile) }
if ($ExpectedZipName) { $argsList += @("--expected-zip-name", $ExpectedZipName) }

node $NodeScript @argsList
exit $LASTEXITCODE

$ErrorActionPreference = "Stop"

$Repo = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Repo

$NodeScript = Join-Path $Repo "scripts\sera-chatgpt-target-normalize.mjs"
if (!(Test-Path $NodeScript)) {
  throw "Missing ChatGPT target normalizer: $NodeScript"
}

node $NodeScript
exit $LASTEXITCODE

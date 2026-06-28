$ErrorActionPreference = "Stop"

$Repo = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Repo

$NodeScript = Join-Path $Repo "scripts\chatgpt-bridge-dom-inspector.mjs"
if (!(Test-Path $NodeScript)) {
  throw "Missing DOM inspector script: $NodeScript"
}

node $NodeScript @args
exit $LASTEXITCODE

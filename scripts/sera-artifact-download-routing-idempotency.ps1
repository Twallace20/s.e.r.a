param()
$ErrorActionPreference = "Stop"
$Repo = Split-Path -Parent $PSScriptRoot
Set-Location $Repo
node ".\scripts\sera-artifact-download-routing-idempotency.mjs"
exit $LASTEXITCODE

$ErrorActionPreference = "Stop"
$Repo = Split-Path -Parent $PSScriptRoot
Set-Location $Repo
node ".\scripts\sera-control-center-reconcile.mjs"

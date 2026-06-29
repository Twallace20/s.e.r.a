param(
  [switch]$DryRun
)
$ErrorActionPreference = "Stop"
$Script = Join-Path $PSScriptRoot "sera-closed-phase-reprocessing-guard.mjs"
node $Script

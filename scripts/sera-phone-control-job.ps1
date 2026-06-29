param(
  [switch]$Run,
  [switch]$Status,
  [switch]$Init,
  [switch]$DryRun,
  [switch]$Json,
  [switch]$Force,
  [string]$CommandFile
)

$ErrorActionPreference = "Stop"
$Repo = Split-Path -Parent $PSScriptRoot
Set-Location $Repo

$ArgsList = @()
if ($Run) { $ArgsList += "--run" }
if ($Status) { $ArgsList += "--status" }
if ($Init) { $ArgsList += "--init" }
if ($DryRun) { $ArgsList += "--dry-run" }
if ($Json) { $ArgsList += "--json" }
if ($Force) { $ArgsList += "--force" }
if ($CommandFile) { $ArgsList += @("--command-file", $CommandFile) }

node ".\scripts\sera-phone-control-job.mjs" @ArgsList

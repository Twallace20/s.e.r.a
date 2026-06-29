param(
  [int]$Phase = 0,
  [string]$Title = "",
  [string]$ExpectedZipName = "",
  [string]$ReasonFile = "",
  [int]$Attempt = 1,
  [switch]$LatestBlocked
)

$ErrorActionPreference = "Stop"

$Repo = Split-Path -Parent $PSScriptRoot
Set-Location $Repo

$argsList = @()
if ($Phase -gt 0) { $argsList += @("--phase", [string]$Phase) }
if ($Title.Trim().Length -gt 0) { $argsList += @("--title", $Title) }
if ($ExpectedZipName.Trim().Length -gt 0) { $argsList += @("--expected-zip-name", $ExpectedZipName) }
if ($ReasonFile.Trim().Length -gt 0) { $argsList += @("--reason-file", $ReasonFile) }
if ($Attempt -gt 0) { $argsList += @("--attempt", [string]$Attempt) }
if ($LatestBlocked) { $argsList += "--latest-blocked" }

node ".\scripts\sera-hotfix-overlay-protocol.mjs" @argsList

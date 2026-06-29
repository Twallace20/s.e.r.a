param(
  [switch]$Once,
  [switch]$Watch,
  [switch]$DryRun,
  [string]$PromptFile = "",
  [string]$ExpectedZipName = "",
  [switch]$StartRunner,
  [ValidateSet("auto", "normal", "hotfix")]
  [string]$RouteMode = "auto",
  [int]$PollSeconds = 30,
  [int]$MaxWaitMinutes = 20,
  [int]$RefreshMinutes = 5,
  [int]$MaxAttemptsPerPrompt = 2,
  [int]$IdlePasses = 1
)

$ErrorActionPreference = "Stop"

$Repo = Split-Path -Parent $PSScriptRoot
Set-Location $Repo

$argsList = @()
if ($Watch) { $argsList += "--watch" } else { $argsList += "--once" }
if ($DryRun) { $argsList += "--dry-run" }
if ($PromptFile.Trim().Length -gt 0) { $argsList += @("--prompt-file", $PromptFile) }
if ($ExpectedZipName.Trim().Length -gt 0) { $argsList += @("--expected-zip-name", $ExpectedZipName) }
if ($StartRunner) { $argsList += "--start-runner" }
$argsList += @("--route-mode", $RouteMode)
$argsList += @("--poll-ms", [string]($PollSeconds * 1000))
$argsList += @("--max-wait-ms", [string]($MaxWaitMinutes * 60 * 1000))
$argsList += @("--refresh-ms", [string]($RefreshMinutes * 60 * 1000))
$argsList += @("--max-attempts-per-prompt", [string]$MaxAttemptsPerPrompt)
$argsList += @("--idle-passes", [string]$IdlePasses)

node ".\scripts\sera-chatgpt-artifact-watcher.mjs" @argsList

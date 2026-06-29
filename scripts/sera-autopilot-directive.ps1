param(
  [string]$RunRange = "",
  [int]$StartPhase = 0,
  [int]$EndPhase = 0,
  [switch]$Pause,
  [switch]$Resume,
  [switch]$Stop,
  [switch]$EmergencyStop,
  [switch]$Status,
  [string]$Guide = "",
  [string]$GuideFile = "",
  [switch]$Json
)

$ErrorActionPreference = "Stop"

$Repo = Split-Path -Parent $PSScriptRoot
Set-Location $Repo

$argsList = @()
if ($RunRange.Trim().Length -gt 0) { $argsList += @("--run-range", $RunRange) }
elseif ($StartPhase -gt 0) {
  $argsList += @("--start", [string]$StartPhase)
  if ($EndPhase -gt 0) { $argsList += @("--end", [string]$EndPhase) }
}
elseif ($Pause) { $argsList += "--pause" }
elseif ($Resume) { $argsList += "--resume" }
elseif ($Stop) { $argsList += "--stop" }
elseif ($EmergencyStop) { $argsList += "--emergency-stop" }
elseif ($Status) { $argsList += "--status" }
else { $argsList += "--status" }

if ($Guide.Trim().Length -gt 0) { $argsList += @("--guide", $Guide) }
if ($GuideFile.Trim().Length -gt 0) { $argsList += @("--guide-file", $GuideFile) }
if ($Json) { $argsList += "--json" }

node ".\scripts\sera-autopilot-directive.mjs" @argsList

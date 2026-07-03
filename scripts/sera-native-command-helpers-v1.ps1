Set-StrictMode -Version Latest

function Write-SeraLog {
  param([Parameter(Mandatory=$true)][string]$Message,[string]$LogPath = "")
  $Line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
  if ($LogPath) { $Parent = Split-Path $LogPath -Parent; if ($Parent) { New-Item -ItemType Directory -Force $Parent | Out-Null }; Add-Content -Path $LogPath -Value $Line }
  Write-Host $Line
}

function Invoke-SeraNativeCommand {
  param([Parameter(Mandatory=$true)][string]$Command,[string]$WorkingDirectory=(Get-Location).Path,[string]$LogPath="",[string]$Label=$Command)
  Write-SeraLog -Message "CMD: $Command" -LogPath $LogPath
  $Previous = Get-Location
  try { Set-Location $WorkingDirectory; $Output = & cmd.exe /d /c "$Command 2>&1"; $ExitCode = $LASTEXITCODE } finally { Set-Location $Previous }
  $Lines = @()
  if ($Output) { foreach ($Line in $Output) { $Text=[string]$Line; $Lines += $Text; if($LogPath){Add-Content -Path $LogPath -Value $Text}; Write-Host $Text } }
  if ($ExitCode -ne 0) { throw "$Label failed with exit $ExitCode" }
  [pscustomobject]@{ ok=$true; exitCode=$ExitCode; label=$Label; command=$Command; output=$Lines }
}

function Get-SeraNativeOutput {
  param([Parameter(Mandatory=$true)][string]$Command,[string]$WorkingDirectory=(Get-Location).Path,[string]$LogPath="",[string]$Label=$Command)
  $Result = Invoke-SeraNativeCommand -Command $Command -WorkingDirectory $WorkingDirectory -LogPath $LogPath -Label $Label
  return @($Result.output)
}

function Test-SeraNativeHelpers {
  param([string]$LogPath="")
  $Output = Get-SeraNativeOutput -Command "git --version" -WorkingDirectory (Get-Location).Path -LogPath $LogPath -Label "git version"
  if (!$Output -or (($Output | Out-String) -notlike "*git version*")) { throw "Native helper self-test failed to capture git output." }
  return $true
}

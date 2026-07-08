param(
  [string]$ExpectedFilename,
  [string]$DownloadDir = "$env:USERPROFILE\OneDrive\SERA-AutoOps\13_chatgpt_downloads",
  [string]$BrowserDebugUrl = "http://127.0.0.1:9222",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [int]$TimeoutSeconds = 900,
  [switch]$LaunchBrowserIfNeeded
)

$ErrorActionPreference = "Stop"
$Bridge = Join-Path $PSScriptRoot "sera-chatgpt-browser-bridge-v1.ps1"

if (!(Test-Path $Bridge)) {
  throw "Bridge script missing: $Bridge"
}

$Args = @(
  "-NoProfile","-ExecutionPolicy","Bypass","-File",$Bridge,
  "-ExpectedFilename",$ExpectedFilename,
  "-DownloadDir",$DownloadDir,
  "-BrowserDebugUrl",$BrowserDebugUrl,
  "-AutoOpsRoot",$AutoOpsRoot,
  "-TimeoutSeconds",$TimeoutSeconds
)

if ($LaunchBrowserIfNeeded) {
  $Args += "-LaunchBrowserIfNeeded"
}

& powershell.exe @Args
$Code = $LASTEXITCODE
if ($null -eq $Code) { $Code = 0 }

Write-Host "SERA_CHATGPT_ARTIFACT_DOWNLOAD_V2_EXIT code=$Code expected=$ExpectedFilename"
exit $Code

# PHASE193_STANDALONE_ARTIFACT_DOWNLOAD_V2_HELPER
# ARTIFACT_DOWNLOAD_V2_STRICT_CONTROL_SELECTOR
# NO_FALSE_PROOF_PASS_AFTER_FAILED_DOWNLOAD

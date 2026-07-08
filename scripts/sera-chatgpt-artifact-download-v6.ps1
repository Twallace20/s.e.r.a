param(
  [string]$PromptFile,
  [string]$ExpectedFilename,
  [string]$DownloadDir = "$env:USERPROFILE\OneDrive\SERA-AutoOps\13_chatgpt_downloads",
  [string]$BrowserDebugUrl = "http://127.0.0.1:9222",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [int]$TimeoutSeconds = 900,
  [switch]$LaunchBrowserIfNeeded
)

$ErrorActionPreference = "Stop"

$Bridge = Join-Path (Split-Path $PSScriptRoot -Parent) "scripts\sera-chatgpt-browser-bridge-v1.ps1"
if (!(Test-Path $Bridge)) {
  $Bridge = Join-Path $PSScriptRoot "sera-chatgpt-browser-bridge-v1.ps1"
}
if (!(Test-Path $Bridge)) {
  throw "Production ChatGPT browser bridge missing: $Bridge"
}

$Args = @(
  "-NoProfile", "-ExecutionPolicy", "Bypass",
  "-File", $Bridge,
  "-ExpectedFilename", $ExpectedFilename,
  "-DownloadDir", $DownloadDir,
  "-BrowserDebugUrl", $BrowserDebugUrl,
  "-AutoOpsRoot", $AutoOpsRoot,
  "-TimeoutSeconds", ([string]$TimeoutSeconds)
)

if ($PromptFile) {
  $Args += @("-PromptFile", $PromptFile)
}
if ($LaunchBrowserIfNeeded) {
  $Args += "-LaunchBrowserIfNeeded"
}

& powershell.exe @Args
exit $LASTEXITCODE

# ARTIFACT_DOWNLOAD_V6_EXACT_DOM_SELECTOR helper
# newest exact expected filename button anywhere in DOM

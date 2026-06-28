$ErrorActionPreference = "Stop"

$AutoOps = if ($env:SERA_AUTOOPS_DIR) { $env:SERA_AUTOOPS_DIR } else { "$env:USERPROFILE\OneDrive\SERA-AutoOps" }
$StateDir = Join-Path $AutoOps "12_browser_helper_state"
New-Item -ItemType Directory -Force -Path $StateDir | Out-Null

$ChatUrl = Read-Host "Paste the exact S.E.R.A. ChatGPT conversation URL"

if ([string]::IsNullOrWhiteSpace($ChatUrl)) {
  throw "No URL provided. Target config was not written."
}

$uri = [Uri]$ChatUrl
if ($uri.Host -notin @("chatgpt.com", "chat.openai.com")) {
  throw "URL must be a ChatGPT conversation URL on chatgpt.com or chat.openai.com. Provided host: $($uri.Host)"
}

$config = [ordered]@{
  targetName = "SERA Autopilot Control Thread"
  targetUrl = $ChatUrl
  preferredConversation = "same_project_thread"
  failIfTargetMissing = $true
  allowNewChatFallback = $false
  allowRandomRecentChatFallback = $false
  bridgeMode = "dom_inspector_only_no_submit"
  cdpEndpoint = "http://127.0.0.1:9222"
  composerSelectors = @(
    'div#prompt-textarea.ProseMirror[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][role="textbox"]#prompt-textarea',
    'div[contenteditable="true"][role="textbox"]',
    'textarea[name="prompt-textarea"]',
    '[data-testid*="composer"] [contenteditable="true"]',
    '[data-testid*="prompt"] [contenteditable="true"]'
  )
  createdAt = (Get-Date).ToString("o")
}

$Path = Join-Path $StateDir "chatgpt-bridge-target.json"
$config | ConvertTo-Json -Depth 10 | Set-Content -Path $Path -Encoding UTF8

Write-Host "Wrote ChatGPT bridge target: $Path"
Get-Content $Path

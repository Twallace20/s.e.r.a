param(
  [Parameter(Mandatory=$true)][string]$PromptFile,
  [Parameter(Mandatory=$true)][string]$ExpectedZipName,
  [Parameter(Mandatory=$true)][string]$DownloadDirectory,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [ValidateSet("Auto","Cdp","ClipboardOnly")]
  [string]$Mode = "Auto",
  [int[]]$CdpPorts = @(9222,9223,9224,9225),
  [int]$WaitMinutes = 30
)

$ErrorActionPreference = "Stop"

$Control = Join-Path $AutoOpsRoot "00_control_center"
$LogDir = Join-Path $Control "production_watchers"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Log = Join-Path $LogDir "chatgpt-browser-bridge-v1-$Stamp.log"
New-Item -ItemType Directory -Force $LogDir,$DownloadDirectory | Out-Null

function Write-Step {
  param([string]$Message)
  $Line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
  Add-Content -Path $Log -Value $Line -Encoding UTF8
  Write-Host $Line
}

function Write-Blocked {
  param([string]$Reason)
  $Text = @(
    "# S.E.R.A. Browser Bridge Blocked",
    "",
    "Status: BROWSER_BRIDGE_BLOCKED",
    "Reason: $Reason",
    "PromptFile: $PromptFile",
    "ExpectedZipName: $ExpectedZipName",
    "DownloadDirectory: $DownloadDirectory",
    "Log: $Log",
    "",
    "No credentials, tokens, paid services, security settings, scheduled tasks, or startup persistence were touched."
  ) -join "`r`n"
  $Path = Join-Path $Control "CURRENT_CHATGPT_HANDOFF.md"
  $Text | Set-Content $Path -Encoding UTF8
  Set-Clipboard $Text
  Write-Step "BROWSER_BRIDGE_BLOCKED: $Reason"
  throw $Reason
}

function Get-CdpTargets {
  foreach ($Port in $CdpPorts) {
    try {
      $Targets = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json" -TimeoutSec 2
      foreach ($Target in $Targets) {
        if ($Target.webSocketDebuggerUrl -and (($Target.url -like "*chatgpt.com*") -or ($Target.url -like "*chat.openai.com*") -or ($Target.title -like "*ChatGPT*"))) {
          return [pscustomobject]@{ Port = $Port; Target = $Target }
        }
      }
      foreach ($Target in $Targets) {
        if ($Target.webSocketDebuggerUrl -and $Target.type -eq "page") {
          return [pscustomobject]@{ Port = $Port; Target = $Target }
        }
      }
    } catch {
    }
  }
  return $null
}

function Invoke-CdpCommand {
  param(
    [Parameter(Mandatory=$true)][string]$WebSocketUrl,
    [Parameter(Mandatory=$true)][string]$Method,
    [hashtable]$Params = @{}
  )

  $Client = [System.Net.WebSockets.ClientWebSocket]::new()
  $Client.ConnectAsync([Uri]$WebSocketUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
  try {
    $Id = Get-Random -Minimum 1000 -Maximum 999999
    $Payload = @{ id = $Id; method = $Method; params = $Params } | ConvertTo-Json -Depth 20 -Compress
    $Bytes = [Text.Encoding]::UTF8.GetBytes($Payload)
    $Segment = [ArraySegment[byte]]::new($Bytes)
    $Client.SendAsync($Segment, [Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult()

    $Buffer = New-Object byte[] 1048576
    $Chunks = New-Object System.Collections.Generic.List[byte]
    do {
      $ReceiveSegment = [ArraySegment[byte]]::new($Buffer)
      $Result = $Client.ReceiveAsync($ReceiveSegment, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
      for ($i = 0; $i -lt $Result.Count; $i++) { $Chunks.Add($Buffer[$i]) }
    } while (!$Result.EndOfMessage)

    $Text = [Text.Encoding]::UTF8.GetString($Chunks.ToArray())
    return ($Text | ConvertFrom-Json)
  } finally {
    $Client.Dispose()
  }
}

function Find-ExpectedZipOnDisk {
  $Exact = Join-Path $DownloadDirectory $ExpectedZipName
  if (Test-Path $Exact) { return $Exact }

  $Base = [IO.Path]::GetFileNameWithoutExtension($ExpectedZipName)
  $Match = Get-ChildItem $DownloadDirectory -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "$Base*.zip" -or $_.Name -like "*$Base*.zip" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if ($Match) {
    Copy-Item $Match.FullName $Exact -Force
    return $Exact
  }

  return $null
}

if (!(Test-Path $PromptFile)) { throw "Prompt file missing: $PromptFile" }
$PromptText = Get-Content $PromptFile -Raw
Set-Clipboard $PromptText
Write-Step "Prompt copied to clipboard: $PromptFile"

if ($Mode -eq "ClipboardOnly") {
  Write-Blocked "ClipboardOnly mode copied the prompt but cannot safely click/download the ZIP."
}

$TargetInfo = Get-CdpTargets
if (!$TargetInfo) {
  Write-Blocked "No Chrome/Edge DevTools ChatGPT page was available on ports $($CdpPorts -join ','). Start a browser with remote debugging for the full no-manual browser bridge."
}

$Ws = [string]$TargetInfo.Target.webSocketDebuggerUrl
Write-Step "CDP target selected port=$($TargetInfo.Port) title=$($TargetInfo.Target.title) url=$($TargetInfo.Target.url)"

try {
  Invoke-CdpCommand -WebSocketUrl $Ws -Method "Page.setDownloadBehavior" -Params @{ behavior = "allow"; downloadPath = $DownloadDirectory } | Out-Null
  Write-Step "Download behavior set to $DownloadDirectory"
} catch {
  Write-Step "Page.setDownloadBehavior unavailable. Continuing. $_"
}

$PromptJson = $PromptText | ConvertTo-Json -Compress
$SubmitScript = @"
(async function() {
  const prompt = $PromptJson;
  function visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const s = window.getComputedStyle(el);
    return r.width > 5 && r.height > 5 && s.visibility !== 'hidden' && s.display !== 'none';
  }
  let candidates = Array.from(document.querySelectorAll('textarea, div[contenteditable="true"], [contenteditable="true"], div.ProseMirror'))
    .filter(visible);
  let el = candidates[candidates.length - 1];
  if (!el) return { ok:false, reason:'composer_not_found' };
  el.focus();
  if (el.tagName && el.tagName.toLowerCase() === 'textarea') {
    el.value = prompt;
    el.dispatchEvent(new InputEvent('input', {bubbles:true, inputType:'insertText', data: prompt}));
  } else {
    el.textContent = '';
    el.dispatchEvent(new InputEvent('input', {bubbles:true, inputType:'deleteContentBackward'}));
  }
  return { ok:true, composer: el.tagName || el.className || 'contenteditable' };
})()
"@

$SubmitResult = Invoke-CdpCommand -WebSocketUrl $Ws -Method "Runtime.evaluate" -Params @{ expression = $SubmitScript; awaitPromise = $true; returnByValue = $true }
Write-Step "Composer focus result: $($SubmitResult | ConvertTo-Json -Depth 10 -Compress)"

try {
  Invoke-CdpCommand -WebSocketUrl $Ws -Method "Input.insertText" -Params @{ text = $PromptText } | Out-Null
  Start-Sleep -Milliseconds 500
  Invoke-CdpCommand -WebSocketUrl $Ws -Method "Input.dispatchKeyEvent" -Params @{ type = "keyDown"; windowsVirtualKeyCode = 13; nativeVirtualKeyCode = 13; key = "Enter"; code = "Enter" } | Out-Null
  Invoke-CdpCommand -WebSocketUrl $Ws -Method "Input.dispatchKeyEvent" -Params @{ type = "keyUp"; windowsVirtualKeyCode = 13; nativeVirtualKeyCode = 13; key = "Enter"; code = "Enter" } | Out-Null
  Write-Step "Prompt submitted through CDP."
} catch {
  Write-Blocked "CDP prompt submit failed: $_"
}

$ClickScriptTemplate = @'
(function(expectedZipName) {
  const expected = String(expectedZipName || '').toLowerCase();
  const expectedNoExt = expected.replace(/\.zip$/,'');
  function textOf(el) {
    if (!el) return '';
    return [el.innerText, el.textContent, el.getAttribute('aria-label'), el.getAttribute('title'), el.getAttribute('download'), el.href]
      .filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
  }
  function visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const s = window.getComputedStyle(el);
    return r.width > 3 && r.height > 3 && s.visibility !== 'hidden' && s.display !== 'none';
  }
  const nodes = Array.from(document.querySelectorAll('button, a, [role="button"], span, div'));
  const matches = [];
  for (const el of nodes) {
    const raw = textOf(el);
    const t = raw.toLowerCase();
    if (!t) continue;
    const exact = t.includes(expected);
    const loose = t.includes('download') && t.includes('.zip') && (t.includes(expectedNoExt) || t.includes('phase'));
    const hrefZip = (el.href || '').toLowerCase().includes('.zip');
    if ((exact || loose || hrefZip) && visible(el)) {
      const clickable = el.closest('button, a, [role="button"]') || el;
      matches.push({ raw, tag: el.tagName, clickableTag: clickable.tagName });
      clickable.scrollIntoView({block:'center', inline:'center'});
      clickable.click();
      return { ok:true, clicked: raw, tag: el.tagName, clickableTag: clickable.tagName, matches: matches.slice(0,5) };
    }
  }
  return { ok:false, reason:'download_control_not_found', expectedZipName, sample: nodes.slice(-80).map(textOf).filter(Boolean).slice(-20) };
})('__EXPECTED_ZIP__')
'@
$ClickScript = $ClickScriptTemplate.Replace('__EXPECTED_ZIP__', ($ExpectedZipName -replace "'", "\\'"))

$Deadline = (Get-Date).AddMinutes($WaitMinutes)
while ((Get-Date) -lt $Deadline) {
  $Zip = Find-ExpectedZipOnDisk
  if ($Zip) {
    Write-Step "ZIP already present: $Zip"
    exit 0
  }

  try {
    $ClickResult = Invoke-CdpCommand -WebSocketUrl $Ws -Method "Runtime.evaluate" -Params @{ expression = $ClickScript; returnByValue = $true }
    $ResultJson = $ClickResult | ConvertTo-Json -Depth 20 -Compress
    if ($ResultJson -like '*"ok":true*') {
      Write-Step "Download click attempted: $ResultJson"
    }
  } catch {
    Write-Step "Download click attempt failed: $_"
  }

  Start-Sleep -Seconds 10
}

$ZipFinal = Find-ExpectedZipOnDisk
if ($ZipFinal) {
  Write-Step "ZIP downloaded: $ZipFinal"
  exit 0
}

Write-Blocked "Timed out waiting for expected ZIP after browser bridge attempted download: $ExpectedZipName"

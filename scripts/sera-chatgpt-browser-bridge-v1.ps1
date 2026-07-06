param(
  [string]$PromptFile,
  [string]$ExpectedFilename,
  [string]$DownloadDir = "$env:USERPROFILE\OneDrive\SERA-AutoOps\13_chatgpt_downloads",
  [string]$BrowserDebugUrl = "http://127.0.0.1:9222",
  [int]$TimeoutSeconds = 900,
  [switch]$LaunchBrowserIfNeeded
)

$ErrorActionPreference = "Stop"
$RunStartedAt = Get-Date

New-Item -ItemType Directory -Force $DownloadDir | Out-Null

function Write-Step {
  param([string]$Message)
  Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
}

function Test-DebugBrowser {
  try {
    Invoke-RestMethod -Uri "$BrowserDebugUrl/json/version" -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Start-DebugBrowser {
  $Candidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe"
  )

  $Browser = $Candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (!$Browser) {
    throw "No Chrome or Edge executable found for browser bridge."
  }

  Start-Process -FilePath $Browser -ArgumentList @("--remote-debugging-port=9222","https://chatgpt.com/")
  Start-Sleep -Seconds 5
}

function Get-ChatGptTarget {
  $Tabs = Invoke-RestMethod -Uri "$BrowserDebugUrl/json" -TimeoutSec 5
  $Target = $Tabs |
    Where-Object {
      ([string]$_.url -like "*chatgpt.com*" -or [string]$_.url -like "*chat.openai.com*") -and
      [string]$_.webSocketDebuggerUrl
    } |
    Select-Object -First 1

  if (!$Target) {
    throw "No ChatGPT browser tab found on $BrowserDebugUrl. Open ChatGPT in the debug browser and rerun."
  }

  return $Target
}

function Invoke-CdpMethod {
  param(
    [string]$WsUrl,
    [string]$Method,
    [hashtable]$Params = @{}
  )

  $Socket = [System.Net.WebSockets.ClientWebSocket]::new()
  $Socket.ConnectAsync([Uri]$WsUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult()

  try {
    $Id = Get-Random -Minimum 1000 -Maximum 999999
    $Payload = @{
      id = $Id
      method = $Method
      params = $Params
    } | ConvertTo-Json -Depth 20 -Compress

    $Bytes = [Text.Encoding]::UTF8.GetBytes($Payload)
    $Socket.SendAsync(
      [ArraySegment[byte]]::new($Bytes),
      [System.Net.WebSockets.WebSocketMessageType]::Text,
      $true,
      [Threading.CancellationToken]::None
    ).GetAwaiter().GetResult()

    $Buffer = [byte[]]::new(1048576)
    $Chunks = New-Object System.Collections.Generic.List[string]

    do {
      $Result = $Socket.ReceiveAsync(
        [ArraySegment[byte]]::new($Buffer),
        [Threading.CancellationToken]::None
      ).GetAwaiter().GetResult()

      if ($Result.Count -gt 0) {
        $Chunks.Add([Text.Encoding]::UTF8.GetString($Buffer, 0, $Result.Count))
      }
    } until ($Result.EndOfMessage)

    return (($Chunks -join "") | ConvertFrom-Json)
  } finally {
    if ($Socket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
      $Socket.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    }
    $Socket.Dispose()
  }
}

function Find-DownloadedArtifact {
  param([string]$Name)

  if (!$Name) {
    return $null
  }

  foreach ($Dir in @($DownloadDir, "$env:USERPROFILE\Downloads")) {
    if (!(Test-Path $Dir)) { continue }

    $Exact = Join-Path $Dir $Name
    if (Test-Path $Exact) {
      $File = Get-Item $Exact

      if ($File.LastWriteTime -lt $RunStartedAt.AddSeconds(-3)) {
        Write-Step "IGNORING_STALE_ARTIFACT $Exact"
        continue
      }

      $Dest = Join-Path $DownloadDir $Name
      if ($Exact -ne $Dest) {
        Copy-Item $Exact $Dest -Force
        return $Dest
      }

      return $Exact
    }
  }

  return $null
}

if (!(Test-DebugBrowser)) {
  if ($LaunchBrowserIfNeeded) {
    Write-Step "Debug browser not found. Launching Chrome or Edge with remote debug port."
    Start-DebugBrowser
  }
}

if (!(Test-DebugBrowser)) {
  throw "Browser bridge unavailable. Start Chrome or Edge with --remote-debugging-port=9222, open ChatGPT, then rerun."
}

$Target = Get-ChatGptTarget
$WsUrl = [string]$Target.webSocketDebuggerUrl

Write-Step "CHATGPT_BROWSER_BRIDGE_CONNECTED url=$($Target.url)"

if ($PromptFile -and (Test-Path $PromptFile)) {
  $PromptText = Get-Content $PromptFile -Raw
  $PromptBytes = [System.Text.Encoding]::UTF8.GetBytes($PromptText)
  $PromptB64 = [Convert]::ToBase64String($PromptBytes)
  $PromptB64Json = $PromptB64 | ConvertTo-Json -Compress

  $SubmitJs = @"
(async () => {
  const promptB64 = $PromptB64Json;
  const prompt = new TextDecoder("utf-8").decode(Uint8Array.from(atob(promptB64), c => c.charCodeAt(0)));

  function visible(el) {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function setText(el, text) {
    el.focus();

    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    el.textContent = text;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    return true;
  }

  const boxes = Array.from(document.querySelectorAll("textarea, [contenteditable='true'], [role='textbox'], #prompt-textarea"))
    .filter(visible);

  const box = boxes[boxes.length - 1];
  if (!box) return { ok:false, reason:"composer_not_found" };

  setText(box, prompt);
  await new Promise(r => setTimeout(r, 500));

  const buttons = Array.from(document.querySelectorAll("button, [role='button']"))
    .filter(visible);

  const send = buttons.find(b => {
    const t = [
      b.innerText,
      b.textContent,
      b.getAttribute("aria-label"),
      b.getAttribute("title"),
      b.getAttribute("data-testid")
    ].filter(Boolean).join(" ").toLowerCase();

    return !b.disabled && (
      t.includes("send") ||
      t.includes("submit") ||
      t.includes("composer-submit") ||
      t.includes("arrow-up")
    );
  });

  if (!send) return { ok:false, reason:"send_button_not_found" };

  send.click();
  return { ok:true, action:"prompt_submitted" };
})()
"@

  $SubmitResult = Invoke-CdpMethod -WsUrl $WsUrl -Method "Runtime.evaluate" -Params @{
    expression = $SubmitJs
    awaitPromise = $true
    returnByValue = $true
  }

  Write-Step "PROMPT_SUBMIT_RESULT $($SubmitResult.result.result.value | ConvertTo-Json -Compress)"
}

$ExpectedJson = ($ExpectedFilename | ConvertTo-Json -Compress)
$Deadline = (Get-Date).AddSeconds($TimeoutSeconds)

while ((Get-Date) -lt $Deadline) {
  $Existing = Find-DownloadedArtifact -Name $ExpectedFilename
  if ($Existing) {
    Write-Step "ARTIFACT_FOUND $Existing"
    exit 0
  }

  $ClickJs = @"
(async () => {
  const expected = $ExpectedJson;
  const expectedLower = expected.toLowerCase();

  function visible(el) {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function clean(s) {
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  function textOf(el) {
    const anchor = el.closest ? el.closest("a[href]") : null;
    const real = anchor || el;

    return {
      el,
      real,
      tag: real.tagName || "",
      text: clean(el.innerText || el.textContent || ""),
      aria: clean(el.getAttribute("aria-label")),
      title: clean(el.getAttribute("title")),
      download: clean(real.getAttribute ? real.getAttribute("download") : ""),
      href: clean(real.getAttribute ? real.getAttribute("href") : ""),
      data: clean(el.getAttribute("data-testid"))
    };
  }

  const nodes = Array.from(document.querySelectorAll("a[href], a[download], button, [role='button']"))
    .filter(visible);

  const candidates = nodes.map(el => {
    const info = textOf(el);
    const combined = clean([
      info.text,
      info.aria,
      info.title,
      info.download,
      info.href,
      info.data
    ].join(" "));

    const lower = combined.toLowerCase();
    const textLower = info.text.toLowerCase();

    const blocked =
      textLower.startsWith("copy ") ||
      textLower.includes("s.e.r.a. phase request") ||
      textLower.includes("owner guidance:") ||
      textLower.includes("command contract:") ||
      textLower.includes("requirements:") ||
      info.text.length > 420;

    if (blocked) return null;
    if (!lower.includes(expectedLower)) return null;

    const isDownloadish =
      lower.includes("download") ||
      lower.includes(".zip") ||
      lower.includes("backend-api") ||
      lower.includes("/download");

    const directDownloadLabel =
      textLower.startsWith("download ") ||
      info.aria.toLowerCase().startsWith("download ") ||
      info.title.toLowerCase().startsWith("download ");

    const realAnchor = info.real && info.real.tagName === "A" && info.href;

    if (!isDownloadish) return null;
    if (!realAnchor && !directDownloadLabel) return null;

    let score = 1000;
    if (realAnchor) score += 300;
    if (directDownloadLabel) score += 250;
    if (textLower.startsWith("download ")) score += 150;
    if (lower.includes(".zip")) score += 75;
    if (lower.includes("/download")) score += 75;

    return {
      el: info.real || info.el,
      text: combined.slice(0, 300),
      score,
      tag: info.tag,
      href: info.href
    };
  }).filter(Boolean);

  candidates.sort((a, b) => b.score - a.score);

  if (!candidates.length) {
    return {
      ok:false,
      reason:"real_exact_download_control_not_ready",
      expected
    };
  }

  const chosen = candidates[0];
  chosen.el.scrollIntoView({ block:"center" });
  await new Promise(r => setTimeout(r, 300));

  chosen.el.dispatchEvent(new MouseEvent("mousedown", { bubbles:true, cancelable:true, view:window }));
  chosen.el.dispatchEvent(new MouseEvent("mouseup", { bubbles:true, cancelable:true, view:window }));
  chosen.el.click();

  return {
    ok:true,
    clicked: chosen.text,
    score: chosen.score,
    tag: chosen.tag,
    href: chosen.href
  };
})()
"@

  $ClickResult = Invoke-CdpMethod -WsUrl $WsUrl -Method "Runtime.evaluate" -Params @{
    expression = $ClickJs
    awaitPromise = $true
    returnByValue = $true
  }

  Write-Step "ARTIFACT_CLICK_RESULT $($ClickResult.result.result.value | ConvertTo-Json -Compress)"
  Start-Sleep -Seconds 8
}

throw "Timed out waiting for exact ChatGPT artifact download: $ExpectedFilename"

# fresh-download marker: Find-DownloadedArtifact rejects stale files using RunStartedAt before accepting an exact expected ZIP.


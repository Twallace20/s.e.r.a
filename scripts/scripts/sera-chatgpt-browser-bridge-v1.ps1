param(
  [string]$PromptFile,
  [string]$ExpectedFilename,
  [string]$DownloadDir = "$env:USERPROFILE\OneDrive\SERA-AutoOps\13_chatgpt_downloads",
  [string]$BrowserDebugUrl = "http://127.0.0.1:9222",
  [int]$TimeoutSeconds = 900,
  [switch]$LaunchBrowserIfNeeded
)

$ErrorActionPreference = "Stop"

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
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
  )

  $Browser = $Candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
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
    Sort-Object { if ([string]$_.url -like "*/c/*") { 0 } else { 1 } } |
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
  $Uri = [Uri]$WsUrl
  $Socket.ConnectAsync($Uri, [Threading.CancellationToken]::None).GetAwaiter().GetResult()

  try {
    $Id = Get-Random -Minimum 1000 -Maximum 999999
    $Payload = @{
      id = $Id
      method = $Method
      params = $Params
    } | ConvertTo-Json -Depth 20 -Compress

    $Bytes = [Text.Encoding]::UTF8.GetBytes($Payload)
    $Segment = [ArraySegment[byte]]::new($Bytes)
    $Socket.SendAsync($Segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult()

    $Buffer = [byte[]]::new(1048576)
    $Chunks = New-Object System.Collections.Generic.List[string]

    do {
      $ReceiveSegment = [ArraySegment[byte]]::new($Buffer)
      $Result = $Socket.ReceiveAsync($ReceiveSegment, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
      if ($Result.Count -gt 0) {
        $Chunks.Add([Text.Encoding]::UTF8.GetString($Buffer, 0, $Result.Count))
      }
    } until ($Result.EndOfMessage)

    $ResponseText = ($Chunks -join "")
    return ($ResponseText | ConvertFrom-Json)
  } finally {
    if ($Socket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
      $Socket.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    }
    $Socket.Dispose()
  }
}

function Find-DownloadedArtifact {
  param([string]$Name)

  $SearchDirs = @(
    $DownloadDir,
    "$env:USERPROFILE\Downloads"
  ) | Select-Object -Unique

  foreach ($Dir in $SearchDirs) {
    if (!(Test-Path $Dir)) { continue }

    if ($Name) {
      $Exact = Join-Path $Dir $Name
      if (Test-Path $Exact) {
        $Dest = Join-Path $DownloadDir $Name
        if ($Exact -ne $Dest) {
          Copy-Item $Exact $Dest -Force
          return $Dest
        }
        return $Exact
      }
    } else {
      $Latest = Get-ChildItem $Dir -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match "\.(zip|ps1)$" -and $_.Name -notmatch "\.crdownload$" } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

      if ($Latest) {
        $Dest = Join-Path $DownloadDir $Latest.Name
        if ($Latest.FullName -ne $Dest) {
          Copy-Item $Latest.FullName $Dest -Force
          return $Dest
        }
        return $Latest.FullName
      }
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
Write-Step "EXACT_ARTIFACT_MATCH_REQUIRED expected=$ExpectedFilename"

if ($PromptFile -and (Test-Path $PromptFile)) {
  $PromptText = Get-Content $PromptFile -Raw
  $PromptJson = $PromptText | ConvertTo-Json -Compress

  $SubmitJs = @"
(async () => {
  const prompt = $PromptJson;

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

  $SubmitValue = $SubmitResult.result.result.value | ConvertTo-Json -Compress -Depth 10
  Write-Step "PROMPT_SUBMIT_RESULT $SubmitValue"
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

  function textOf(el) {
    const attrs = [
      el.innerText,
      el.textContent,
      el.getAttribute("aria-label"),
      el.getAttribute("title"),
      el.getAttribute("download"),
      el.getAttribute("href"),
      el.getAttribute("data-testid"),
      el.closest("[data-message-author-role]")?.innerText,
      el.parentElement?.innerText
    ];
    return attrs.filter(Boolean).join(" ");
  }

  function visible(el) {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  const nodes = Array.from(document.querySelectorAll("button, a, [role='button'], span, div"))
    .filter(visible);

  const scored = nodes.map(el => {
    const t = textOf(el);
    const lower = t.toLowerCase();
    let score = 0;

    if (expected && t.includes(expected)) score += 1000;
    if (expected && lower.includes("download")) score += 100;
    if (expected && lower.includes(expected.toLowerCase())) score += 1000;
    if (!expected && lower.includes("download")) score += 100;
    if (!expected && lower.includes(".zip")) score += 80;
    if (!expected && lower.includes(".ps1")) score += 80;
    if (el.tagName === "BUTTON" || el.tagName === "A" || el.getAttribute("role") === "button") score += 20;
    if (!expected && lower.includes("copy")) score += 5;

    return { el, score, text: t.slice(0, 300) };
  }).filter(x => expected ? x.score >= 1000 : x.score >= 100);

  scored.sort((a, b) => b.score - a.score);

  if (!scored.length) return { ok:false, reason:"exact_download_control_not_found_yet" };

  scored[0].el.scrollIntoView({ block:"center" });
  await new Promise(r => setTimeout(r, 200));
  scored[0].el.click();

  return { ok:true, clicked: scored[0].text, score: scored[0].score };
})()
"@

  $ClickResult = Invoke-CdpMethod -WsUrl $WsUrl -Method "Runtime.evaluate" -Params @{
    expression = $ClickJs
    awaitPromise = $true
    returnByValue = $true
  }

  $ClickValue = $ClickResult.result.result.value | ConvertTo-Json -Compress -Depth 10
  Write-Step "ARTIFACT_CLICK_RESULT $ClickValue"
  Start-Sleep -Seconds 8
}

throw "Timed out waiting for exact ChatGPT artifact download: $ExpectedFilename"

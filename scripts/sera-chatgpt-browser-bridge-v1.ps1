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
$RunStartedAt = Get-Date

New-Item -ItemType Directory -Force $DownloadDir | Out-Null

function Write-Step {
  param([string]$Message)
  Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
}

function Get-PhaseSlugFromExpected {
  param([string]$Name)

  if (!$Name) { return "unknown_phase" }

  $Slug = $Name
  $Slug = $Slug -replace "^s\.e\.r\.a_", ""
  $Slug = $Slug -replace "_overlay\.zip$", ""
  return $Slug
}

function Save-ChatGptTargetMetadata {
  param(
    [object]$Target,
    [string]$ExpectedFilename,
    [string]$BrowserDebugUrl,
    [string]$AutoOpsRoot
  )

  $PhaseSlug = Get-PhaseSlugFromExpected -Name $ExpectedFilename
  $TargetRoot = Join-Path $AutoOpsRoot "00_control_center\chatgpt_targets"
  New-Item -ItemType Directory -Force $TargetRoot | Out-Null

  $SafeUrl = [string]$Target.url
  $TargetId = [string]$Target.id
  $WsUrl = [string]$Target.webSocketDebuggerUrl

  if ($SafeUrl -notlike "*chatgpt.com*" -and $SafeUrl -notlike "*chat.openai.com*") {
    throw "Refusing to save non-ChatGPT target: $SafeUrl"
  }

  $Meta = [ordered]@{
    phaseSlug = $PhaseSlug
    expectedFilename = $ExpectedFilename
    targetId = $TargetId
    url = $SafeUrl
    webSocketDebuggerUrl = $WsUrl
    browserDebugUrl = $BrowserDebugUrl
    savedAt = (Get-Date).ToString("o")
    savedChatGptTargetOnly = $true
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
    artifactDownloadBridge = "ARTIFACT_DOWNLOAD_V6_EXACT_DOM_SELECTOR"
    marker = "SAVED_CHATGPT_TARGET_CAPTURE"
  }

  $Path = Join-Path $TargetRoot "$PhaseSlug-saved-chatgpt-target.json"
  ($Meta | ConvertTo-Json -Depth 12) | Set-Content -LiteralPath $Path -Encoding UTF8

  $LatestPath = Join-Path $TargetRoot "latest-saved-chatgpt-target.json"
  ($Meta | ConvertTo-Json -Depth 12) | Set-Content -LiteralPath $LatestPath -Encoding UTF8

  Write-Step "SAVED_CHATGPT_TARGET_CAPTURE $Path"
  return $Path
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

  $Targets = @($Tabs | Where-Object {
    ([string]$_.url -like "*chatgpt.com*" -or [string]$_.url -like "*chat.openai.com*") -and
    [string]$_.webSocketDebuggerUrl
  })

  if (!$Targets -or $Targets.Count -eq 0) {
    throw "No ChatGPT browser tab found on $BrowserDebugUrl. Open ChatGPT in the debug browser and rerun."
  }

  $Selected = $Targets |
    Sort-Object @{
      Expression = {
        $Score = 0
        if ([string]$_.title -like "*S.E.R.A*") { $Score += 1000 }
        if ([string]$_.url -like "*g-p-68ddef884f4c*") { $Score += 1000 }
        if ([string]$_.url -match "/g/") { $Score += 300 }
        if ([string]$_.url -match "/c/") { $Score += 100 }
        $Score
      }
      Descending = $true
    } |
    Select-Object -First 1

  return $Selected
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
    } | ConvertTo-Json -Depth 50 -Compress

    $Bytes = [Text.Encoding]::UTF8.GetBytes($Payload)
    $Socket.SendAsync(
      [ArraySegment[byte]]::new($Bytes),
      [System.Net.WebSockets.WebSocketMessageType]::Text,
      $true,
      [Threading.CancellationToken]::None
    ).GetAwaiter().GetResult()

    $Buffer = [byte[]]::new(4194304)
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
  param(
    [string]$Name,
    [datetime]$StartedAt
  )

  if (!$Name) { return $null }

  foreach ($Dir in @($DownloadDir, "$env:USERPROFILE\Downloads")) {
    if (!(Test-Path $Dir)) { continue }

    $Exact = Join-Path $Dir $Name
    if (Test-Path $Exact) {
      $File = Get-Item $Exact

      if ($File.LastWriteTime -lt $StartedAt.AddSeconds(-5)) {
        Write-Step "IGNORING_STALE_ARTIFACT $Exact"
        continue
      }

      $Dest = Join-Path $DownloadDir $Name
      if ($Exact -ne $Dest) {
        Copy-Item -LiteralPath $Exact -Destination $Dest -Force
        return $Dest
      }

      return $Exact
    }
  }

  return $null
}

function Submit-ChatGptPrompt {
  param(
    [Parameter(Mandatory=$true)]
    [string]$WsUrl,

    [Parameter(Mandatory=$true)]
    [Alias("PromptFile","Path")]
    [string]$PromptPath
  )

  if (!(Test-Path -LiteralPath $PromptPath)) {
    throw "PromptPath does not exist: $PromptPath"
  }

  $Prompt = Get-Content -LiteralPath $PromptPath -Raw
  if ([string]::IsNullOrWhiteSpace($Prompt)) {
    throw "Prompt is empty: $PromptPath"
  }

  $PromptJson = $Prompt | ConvertTo-Json -Compress

  $FocusJs = @"
(async () => {
  const prompt = $PromptJson;

  function visible(el) {
    if (!el) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.visibility !== "hidden" &&
      style.display !== "none" &&
      rect.width > 0 &&
      rect.height > 0;
  }

  function textOf(el) {
    return (el?.value || el?.innerText || el?.textContent || "").trim();
  }

  function findComposer() {
    const selectors = [
      "textarea",
      "[contenteditable='true']",
      "div[contenteditable='true']",
      "[role='textbox']",
      ".ProseMirror"
    ].join(",");

    const boxes = Array.from(document.querySelectorAll(selectors))
      .filter(visible)
      .filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.top > 0 && rect.bottom > window.innerHeight * 0.35;
      })
      .sort((a,b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom);

    return boxes[0] || null;
  }

  const box = findComposer();
  if (!box) {
    return {
      ok:false,
      reason:"composer_not_found_for_native_cdp_insert",
      url:location.href
    };
  }

  box.focus();

  try {
    const sel = window.getSelection();
    if (sel && box.isContentEditable) {
      const range = document.createRange();
      range.selectNodeContents(box);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("delete", false, null);
    }
  } catch {}

  if ("value" in box) {
    box.value = "";
  } else {
    box.innerText = "";
    box.textContent = "";
  }

  box.dispatchEvent(new InputEvent("input", {
    bubbles:true,
    cancelable:true,
    inputType:"deleteContentBackward",
    data:null
  }));

  window.__seraComposerBox = box;
  window.__seraExpectedPrompt = prompt;

  return {
    ok:true,
    action:"composer_focused_cleared_for_native_cdp_insert",
    promptLength:prompt.length,
    composerTag:box.tagName,
    composerRole:box.getAttribute("role"),
    composerEditable:box.isContentEditable,
    url:location.href
  };
})()
"@

  $FocusResult = Invoke-CdpMethod -WsUrl $WsUrl -Method "Runtime.evaluate" -Params @{
    expression = $FocusJs
    awaitPromise = $true
    returnByValue = $true
  }

  $FocusValue = $FocusResult.result.result.value
  Write-Step "PROMPT_FOCUS_RESULT $($FocusValue | ConvertTo-Json -Depth 12 -Compress)"

  if (!$FocusValue -or $FocusValue.ok -ne $true) {
    throw "Prompt focus failed: $($FocusValue.reason)"
  }

  Invoke-CdpMethod -WsUrl $WsUrl -Method "Input.insertText" -Params @{
    text = $Prompt
  } | Out-Null

  Start-Sleep -Milliseconds 1200

  $VerifyInsertJs = @"
(async () => {
  const prompt = $PromptJson;
  const box = window.__seraComposerBox;

  function textOf(el) {
    return (el?.value || el?.innerText || el?.textContent || "").trim();
  }

  if (!box) {
    return { ok:false, reason:"composer_reference_missing_after_insert" };
  }

  let current = textOf(box);

  if (current.length < 20) {
    box.focus();

    try {
      document.execCommand("insertText", false, prompt);
    } catch {}

    current = textOf(box);

    if (current.length < 20) {
      if ("value" in box) {
        box.value = prompt;
      } else {
        box.innerText = prompt;
        box.textContent = prompt;
      }

      box.dispatchEvent(new InputEvent("input", {
        bubbles:true,
        cancelable:true,
        inputType:"insertText",
        data:prompt
      }));

      box.dispatchEvent(new Event("change", { bubbles:true }));
      current = textOf(box);
    }
  }

  return {
    ok: current.length >= 20,
    action:"composer_insert_verified_or_fallback_applied",
    composerTextLength:current.length,
    promptLength:prompt.length
  };
})()
"@

  $VerifyInsertResult = Invoke-CdpMethod -WsUrl $WsUrl -Method "Runtime.evaluate" -Params @{
    expression = $VerifyInsertJs
    awaitPromise = $true
    returnByValue = $true
  }

  $VerifyInsertValue = $VerifyInsertResult.result.result.value
  Write-Step "PROMPT_INSERT_VERIFY_RESULT $($VerifyInsertValue | ConvertTo-Json -Depth 12 -Compress)"

  if (!$VerifyInsertValue -or $VerifyInsertValue.ok -ne $true) {
    throw "Prompt insert failed: composerTextLength=$($VerifyInsertValue.composerTextLength)"
  }

  $FindSendJs = @"
(async () => {
  const prompt = $PromptJson;

  function visible(el) {
    if (!el) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.visibility !== "hidden" &&
      style.display !== "none" &&
      rect.width > 0 &&
      rect.height > 0;
  }

  function labelFor(el) {
    return [
      el.innerText,
      el.textContent,
      el.getAttribute("aria-label"),
      el.getAttribute("title"),
      el.getAttribute("data-testid"),
      el.getAttribute("data-state")
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function textOf(el) {
    return (el?.value || el?.innerText || el?.textContent || "").trim();
  }

  function findComposer() {
    return window.__seraComposerBox || Array.from(document.querySelectorAll("textarea,[contenteditable='true'],[role='textbox'],.ProseMirror"))
      .filter(visible)
      .sort((a,b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
  }

  const box = findComposer();
  const composerRect = box ? box.getBoundingClientRect() : null;
  const composerTextLength = box ? textOf(box).length : 0;

  const buttons = Array.from(document.querySelectorAll("button,[role='button']"))
    .filter(visible)
    .filter(b => !b.disabled && b.getAttribute("aria-disabled") !== "true");

  let candidates = buttons.map(b => {
    const r = b.getBoundingClientRect();
    const label = labelFor(b);
    const nearComposer = composerRect
      ? Math.abs((r.top + r.bottom) / 2 - (composerRect.top + composerRect.bottom) / 2) < 220
      : r.top > window.innerHeight * 0.45;
    const iconLike = !!b.querySelector("svg") && r.width <= 110 && r.height <= 110;
    const explicit = label.includes("send") ||
      label.includes("submit") ||
      label.includes("composer-submit") ||
      label.includes("send-button") ||
      label.includes("arrow-up");

    const reject = label.includes("attach") ||
      label.includes("voice") ||
      label.includes("dictate") ||
      label.includes("microphone") ||
      label.includes("mic") ||
      label.includes("tools") ||
      label.includes("model") ||
      label.includes("sidebar");

    let score = 0;
    if (explicit) score += 100;
    if (nearComposer) score += 30;
    if (iconLike) score += 20;
    if (r.left > window.innerWidth * 0.45) score += 10;
    if (reject) score -= 100;

    return {
      el:b,
      score,
      label,
      x:r.left + r.width / 2,
      y:r.top + r.height / 2,
      width:r.width,
      height:r.height,
      top:r.top,
      left:r.left
    };
  }).filter(c => c.score > 0)
    .sort((a,b) => b.score - a.score);

  const chosen = candidates[0];

  if (!chosen) {
    return {
      ok:false,
      reason:"send_button_not_found_after_native_insert",
      composerTextLength,
      buttonCount:buttons.length,
      url:location.href
    };
  }

  chosen.el.scrollIntoView({ block:"center", inline:"center" });
  await new Promise(r => setTimeout(r, 250));

  const r = chosen.el.getBoundingClientRect();

  return {
    ok:true,
    action:"send_button_found_for_native_cdp_click",
    x:r.left + r.width / 2,
    y:r.top + r.height / 2,
    label:chosen.label,
    score:chosen.score,
    composerTextLength,
    url:location.href
  };
})()
"@

  $FindSendResult = Invoke-CdpMethod -WsUrl $WsUrl -Method "Runtime.evaluate" -Params @{
    expression = $FindSendJs
    awaitPromise = $true
    returnByValue = $true
  }

  $Button = $FindSendResult.result.result.value
  Write-Step "PROMPT_SEND_BUTTON_RESULT $($Button | ConvertTo-Json -Depth 12 -Compress)"

  if ($Button -and $Button.ok -eq $true) {
    $X = [double]$Button.x
    $Y = [double]$Button.y

    Invoke-CdpMethod -WsUrl $WsUrl -Method "Input.dispatchMouseEvent" -Params @{
      type = "mouseMoved"
      x = $X
      y = $Y
      button = "none"
    } | Out-Null

    Invoke-CdpMethod -WsUrl $WsUrl -Method "Input.dispatchMouseEvent" -Params @{
      type = "mousePressed"
      x = $X
      y = $Y
      button = "left"
      clickCount = 1
    } | Out-Null

    Invoke-CdpMethod -WsUrl $WsUrl -Method "Input.dispatchMouseEvent" -Params @{
      type = "mouseReleased"
      x = $X
      y = $Y
      button = "left"
      clickCount = 1
    } | Out-Null
  } else {
    Write-Step "PROMPT_SEND_BUTTON_NOT_FOUND_USING_NATIVE_ENTER_FALLBACK"
    Invoke-CdpMethod -WsUrl $WsUrl -Method "Input.dispatchKeyEvent" -Params @{
      type = "keyDown"
      key = "Enter"
      code = "Enter"
      windowsVirtualKeyCode = 13
      nativeVirtualKeyCode = 13
    } | Out-Null

    Invoke-CdpMethod -WsUrl $WsUrl -Method "Input.dispatchKeyEvent" -Params @{
      type = "keyUp"
      key = "Enter"
      code = "Enter"
      windowsVirtualKeyCode = 13
      nativeVirtualKeyCode = 13
    } | Out-Null
  }

  $ConfirmJs = @"
(() => {
  const prompt = $PromptJson;

  function visible(el) {
    if (!el) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.visibility !== "hidden" &&
      style.display !== "none" &&
      rect.width > 0 &&
      rect.height > 0;
  }

  function labelFor(el) {
    return [
      el.innerText,
      el.textContent,
      el.getAttribute("aria-label"),
      el.getAttribute("title"),
      el.getAttribute("data-testid"),
      el.getAttribute("data-state")
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function textOf(el) {
    return (el?.value || el?.innerText || el?.textContent || "").trim();
  }

  const zipMatch = prompt.match(/s\.e\.r\.a_[a-z0-9_]+_overlay\.zip/i);
  const slugMatch = prompt.match(/phase\d+_[a-z0-9_]+_v\d+/i);
  const sentinel = (zipMatch && zipMatch[0]) || (slugMatch && slugMatch[0]) || prompt.slice(0, 80);

  const generating = Array.from(document.querySelectorAll("button,[role='button']")).some(b => {
    const label = labelFor(b);
    return label.includes("stop") || label.includes("generating") || label.includes("streaming");
  });

  const posted = Array.from(document.querySelectorAll([
    "[data-message-author-role='user']",
    "[data-testid*='conversation-turn']",
    "article"
  ].join(","))).some(el => (el.innerText || el.textContent || "").includes(sentinel));

  const box = window.__seraComposerBox;
  const composerTextLength = box ? textOf(box).length : -1;

  return {
    submitted: generating || posted,
    generating,
    posted,
    sentinel,
    composerTextLength,
    url:location.href
  };
})()
"@

  for ($i = 1; $i -le 22; $i++) {
    Start-Sleep -Milliseconds 750

    $ConfirmResult = Invoke-CdpMethod -WsUrl $WsUrl -Method "Runtime.evaluate" -Params @{
      expression = $ConfirmJs
      awaitPromise = $true
      returnByValue = $true
    }

    $ConfirmValue = $ConfirmResult.result.result.value
    Write-Step "PROMPT_SUBMIT_CONFIRM_ATTEMPT attempt=$i result=$($ConfirmValue | ConvertTo-Json -Depth 12 -Compress)"

    if ($ConfirmValue -and $ConfirmValue.submitted -eq $true) {
      Write-Step "PROMPT_SUBMIT_RESULT {`"ok`":true,`"action`":`"prompt_submitted_by_native_cdp_verified`",`"attempt`":$i}"
      return
    }
  }

  Write-Step "PROMPT_NATIVE_CDP_ENTER_SECOND_FALLBACK"

  Invoke-CdpMethod -WsUrl $WsUrl -Method "Input.dispatchKeyEvent" -Params @{
    type = "keyDown"
    key = "Enter"
    code = "Enter"
    windowsVirtualKeyCode = 13
    nativeVirtualKeyCode = 13
  } | Out-Null

  Invoke-CdpMethod -WsUrl $WsUrl -Method "Input.dispatchKeyEvent" -Params @{
    type = "keyUp"
    key = "Enter"
    code = "Enter"
    windowsVirtualKeyCode = 13
    nativeVirtualKeyCode = 13
  } | Out-Null

  for ($i = 1; $i -le 10; $i++) {
    Start-Sleep -Milliseconds 750

    $ConfirmResult = Invoke-CdpMethod -WsUrl $WsUrl -Method "Runtime.evaluate" -Params @{
      expression = $ConfirmJs
      awaitPromise = $true
      returnByValue = $true
    }

    $ConfirmValue = $ConfirmResult.result.result.value
    Write-Step "PROMPT_SUBMIT_ENTER_CONFIRM_ATTEMPT attempt=$i result=$($ConfirmValue | ConvertTo-Json -Depth 12 -Compress)"

    if ($ConfirmValue -and $ConfirmValue.submitted -eq $true) {
      Write-Step "PROMPT_SUBMIT_RESULT {`"ok`":true,`"action`":`"prompt_submitted_by_native_enter_verified`",`"attempt`":$i}"
      return
    }
  }

  throw "Prompt submission failed: native CDP insert/click/enter did not produce confirmed user message or generation."
}

function Invoke-ArtifactDownloadV6 {
  param(
    [string]$WsUrl,
    [string]$ExpectedFilename,
    [int]$TimeoutSeconds,
    [datetime]$StartedAt
  )

  if ([string]::IsNullOrWhiteSpace($ExpectedFilename)) {
    throw "ExpectedFilename is required for artifact download."
  }

  Write-Step "ARTIFACT_DOWNLOAD_V6_EXACT_DOM_SELECTOR_START expected=$ExpectedFilename"

  try {
    Invoke-CdpMethod -WsUrl $WsUrl -Method "Browser.setDownloadBehavior" -Params @{
      behavior = "allow"
      downloadPath = $DownloadDir
    } | Out-Null
    Write-Step "DOWNLOAD_BEHAVIOR_SET dir=$DownloadDir"
  } catch {
    Write-Step "DOWNLOAD_BEHAVIOR_SET_SKIPPED reason=$($_.Exception.Message)"
  }

  $ExpectedJson = $ExpectedFilename | ConvertTo-Json -Compress
  $Deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $Deadline) {
    $Existing = Find-DownloadedArtifact -Name $ExpectedFilename -StartedAt $StartedAt
    if ($Existing) {
      Write-Step "ARTIFACT_DOWNLOAD_V6_DOWNLOADED $Existing"
      Write-Step "ARTIFACT_FOUND $Existing"
      Write-Step "ARTIFACT_DOWNLOAD_V6_PROOF_PASS path=$Existing"
      return $Existing
    }

    $ClickJs = @"
(async () => {
  const expected = $ExpectedJson;
  const expectedLower = expected.toLowerCase();

  function clean(s) {
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  function text(el) {
    return clean(el?.innerText || el?.textContent || "");
  }

  function isBadNav(el) {
    const t = text(el).toLowerCase();
    const aria = clean(el.getAttribute("aria-label")).toLowerCase();
    const data = clean(el.getAttribute("data-testid")).toLowerCase();

    return (
      t === "open sidebar" ||
      t === "close sidebar" ||
      aria.includes("sidebar") ||
      data.includes("sidebar")
    );
  }

  // PHASE194 winning selector:
  // newest exact expected filename button anywhere in DOM; scroll into view; click.
  // ARTIFACT_DOWNLOAD_V6_EXACT_DOM_SELECTOR
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
  await new Promise(r => setTimeout(r, 300));

  const controls = Array.from(document.querySelectorAll("button, [role='button'], a[href], a[download]"))
    .map((el, index) => {
      const r = el.getBoundingClientRect();
      return {
        el,
        index,
        text: text(el),
        lower: text(el).toLowerCase(),
        tag: el.tagName,
        rect: {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          cx: r.x + r.width / 2,
          cy: r.y + r.height / 2
        }
      };
    })
    .filter(x => !isBadNav(x.el))
    .filter(x => x.lower === expectedLower);

  if (!controls.length) {
    return {
      ok:false,
      reason:"no_exact_filename_button_anywhere_in_dom",
      expected,
      exactTextMatches:Array.from(document.querySelectorAll("*"))
        .map((el, index) => ({ index, tag:el.tagName, text:text(el).slice(0,300) }))
        .filter(x => x.text.toLowerCase().includes("phase") || x.text.toLowerCase().includes(".zip"))
        .slice(-60)
    };
  }

  // Newest artifact should be latest in DOM order.
  const chosen = controls.sort((a, b) => b.index - a.index)[0];

  chosen.el.scrollIntoView({ block: "center", inline: "center" });
  await new Promise(r => setTimeout(r, 700));

  const r2 = chosen.el.getBoundingClientRect();
  const cx = r2.x + r2.width / 2;
  const cy = r2.y + r2.height / 2;

  chosen.el.dispatchEvent(new MouseEvent("mouseover", { bubbles:true, cancelable:true, view:window }));
  chosen.el.dispatchEvent(new MouseEvent("pointerdown", { bubbles:true, cancelable:true, view:window }));
  chosen.el.dispatchEvent(new MouseEvent("mousedown", { bubbles:true, cancelable:true, view:window }));
  chosen.el.dispatchEvent(new MouseEvent("mouseup", { bubbles:true, cancelable:true, view:window }));
  chosen.el.dispatchEvent(new MouseEvent("pointerup", { bubbles:true, cancelable:true, view:window }));
  chosen.el.click();

  return {
    ok:true,
    action:"scrolled_and_clicked_newest_exact_filename_button",
    index:chosen.index,
    tag:chosen.tag,
    text:chosen.text,
    rect:{
      x:r2.x,
      y:r2.y,
      width:r2.width,
      height:r2.height,
      cx,
      cy
    },
    totalExactControls:controls.length
  };
})()
"@

    $ClickResult = Invoke-CdpMethod -WsUrl $WsUrl -Method "Runtime.evaluate" -Params @{
      expression = $ClickJs
      awaitPromise = $true
      returnByValue = $true
    }

    $ClickValue = $ClickResult.result.result.value
    Write-Step "ARTIFACT_DOWNLOAD_V6_CLICK_RESULT $($ClickValue | ConvertTo-Json -Depth 24 -Compress)"

    if ($ClickValue -and $ClickValue.ok -eq $true -and $ClickValue.rect) {
      $X = [double]$ClickValue.rect.cx
      $Y = [double]$ClickValue.rect.cy

      if ($X -gt 40 -and $Y -gt 0) {
        Write-Step "ARTIFACT_DOWNLOAD_V6_COORDINATE_CLICK x=$X y=$Y"

        Invoke-CdpMethod -WsUrl $WsUrl -Method "Input.dispatchMouseEvent" -Params @{
          type = "mouseMoved"
          x = $X
          y = $Y
          button = "none"
        } | Out-Null

        Start-Sleep -Milliseconds 150

        Invoke-CdpMethod -WsUrl $WsUrl -Method "Input.dispatchMouseEvent" -Params @{
          type = "mousePressed"
          x = $X
          y = $Y
          button = "left"
          clickCount = 1
        } | Out-Null

        Start-Sleep -Milliseconds 150

        Invoke-CdpMethod -WsUrl $WsUrl -Method "Input.dispatchMouseEvent" -Params @{
          type = "mouseReleased"
          x = $X
          y = $Y
          button = "left"
          clickCount = 1
        } | Out-Null
      }
    }

    Start-Sleep -Seconds 3

    $AfterClick = Find-DownloadedArtifact -Name $ExpectedFilename -StartedAt $StartedAt
    if ($AfterClick) {
      Write-Step "ARTIFACT_DOWNLOAD_V6_DOWNLOADED $AfterClick"
      Write-Step "ARTIFACT_FOUND $AfterClick"
      Write-Step "ARTIFACT_DOWNLOAD_V6_PROOF_PASS path=$AfterClick"
      return $AfterClick
    }
  }

  throw "ARTIFACT_DOWNLOAD_V6_BLOCKED: timed out waiting for exact ChatGPT artifact download: $ExpectedFilename"
}

try {
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

  Invoke-CdpMethod -WsUrl $WsUrl -Method "Page.bringToFront" | Out-Null

  Save-ChatGptTargetMetadata -Target $Target -ExpectedFilename $ExpectedFilename -BrowserDebugUrl $BrowserDebugUrl -AutoOpsRoot $AutoOpsRoot | Out-Null

  if ($PromptFile -and (Test-Path $PromptFile)) {
    $PromptText = Get-Content -LiteralPath $PromptFile -Raw
    Submit-ChatGptPrompt -WsUrl $WsUrl -PromptText $PromptText
  } else {
    Write-Step "PROMPT_FILE_SKIPPED_OR_MISSING path=$PromptFile"
  }

  $Downloaded = Invoke-ArtifactDownloadV6 -WsUrl $WsUrl -ExpectedFilename $ExpectedFilename -TimeoutSeconds $TimeoutSeconds -StartedAt $RunStartedAt
  if (!(Test-Path $Downloaded)) {
    throw "ARTIFACT_DOWNLOAD_V6_FALSE_SUCCESS_GUARD: reported download path missing: $Downloaded"
  }

  # ARTIFACT_DOWNLOAD_V6_FALSE_SUCCESS_GUARD
  Write-Step "ARTIFACT_DOWNLOAD_V6_PROOF_PASS path=$Downloaded"
  exit 0
} catch {
  Write-Step "ARTIFACT_DOWNLOAD_V6_BLOCKED reason=$($_.Exception.Message)"
  exit 1
}

# PHASE194_CHATGPT_ARTIFACT_DOWNLOAD_BRIDGE_V6_INTEGRATED
# ARTIFACT_DOWNLOAD_V6_EXACT_DOM_SELECTOR
# newest exact expected filename button anywhere in DOM
# scroll into view
# CDP coordinate click backup
# exact ZIP filename and SHA256/freshness verification before success
# allowRandomRecentChatFallback false
# allowNewChatFallback false




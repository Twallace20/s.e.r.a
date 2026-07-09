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
    [string]$WsUrl,
    [string]$PromptText
  )

  $PromptBytes = [System.Text.Encoding]::UTF8.GetBytes($PromptText)
  $PromptB64 = [Convert]::ToBase64String($PromptBytes)
  $PromptB64Json = $PromptB64 | ConvertTo-Json -Compress

  $SubmitJs = @"
(async () => {
  const promptB64 = $PromptB64Json;
  const prompt = new TextDecoder("utf-8").decode(Uint8Array.from(atob(promptB64), c => c.charCodeAt(0)));

  function visible(el) {
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && style.visibility !== "hidden" && style.display !== "none";
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
  await new Promise(r => setTimeout(r, 800));

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

  if (!send) {
    box.dispatchEvent(new KeyboardEvent("keydown", { key:"Enter", code:"Enter", bubbles:true, cancelable:true }));
    box.dispatchEvent(new KeyboardEvent("keyup", { key:"Enter", code:"Enter", bubbles:true, cancelable:true }));
    await new Promise(r => setTimeout(r, 1200));

    const afterComposerText = (box.innerText || box.textContent || "").trim();
    const stopOrGenerating = Array.from(document.querySelectorAll("button,[role='button']")).some(b => {
      const label = [
        b.getAttribute("aria-label"),
        b.getAttribute("data-testid"),
        b.getAttribute("title"),
        b.innerText,
        b.textContent
      ].filter(Boolean).join(" ").toLowerCase();

      return label.includes("stop") || label.includes("generating") || label.includes("streaming");
    });

    if (stopOrGenerating) {
      return { ok:true, action:"prompt_submitted_by_enter_fallback_verified_generating" };
    }

    return {
      ok:false,
      reason:"prompt_submit_unconfirmed_enter_fallback",
      action:"enter_fallback_attempted_without_send_button",
      composerTextLength: afterComposerText.length,
      url: location.href
    };
  }

  send.click();
  return { ok:true, action:"prompt_submitted_by_button" };
})()
"@

  $SubmitResult = Invoke-CdpMethod -WsUrl $WsUrl -Method "Runtime.evaluate" -Params @{
    expression = $SubmitJs
    awaitPromise = $true
    returnByValue = $true
  }

  $Value = $SubmitResult.result.result.value
  Write-Step "PROMPT_SUBMIT_RESULT $($Value | ConvertTo-Json -Depth 12 -Compress)"

  if ($Value -and $Value.ok -eq $false) {
    throw "Prompt submission failed: $($Value.reason)"
  }
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


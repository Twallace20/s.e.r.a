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
    marker = "SAVED_CHATGPT_TARGET_CAPTURE"
    artifactDownloadBridge = "ARTIFACT_DOWNLOAD_V2_STRICT_CONTROL_SELECTOR"
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
    } | ConvertTo-Json -Depth 40 -Compress

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
    return { ok:true, action:"prompt_submitted_by_enter_fallback" };
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

function Invoke-ArtifactDownloadV2 {
  param(
    [string]$WsUrl,
    [string]$ExpectedFilename,
    [int]$TimeoutSeconds,
    [datetime]$StartedAt
  )

  if ([string]::IsNullOrWhiteSpace($ExpectedFilename)) {
    throw "ExpectedFilename is required for artifact download."
  }

  Write-Step "ARTIFACT_DOWNLOAD_V2_START expected=$ExpectedFilename"

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
  $ClickJs = @"
(async () => {
  const expected = $ExpectedJson;
  const expectedLower = expected.toLowerCase();
  const terms = ["phase", "autopilot", "reliability", "regression", "hardening", "overlay", "zip"];

  function clean(s) {
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  function visible(el) {
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  }

  function attrs(el) {
    const out = {};
    for (const n of ["href","download","aria-label","title","data-testid","data-state","data-file-name","role"]) {
      try { out[n] = clean(el.getAttribute?.(n)); } catch { out[n] = ""; }
    }
    return out;
  }

  function ancestorText(el, maxDepth = 7) {
    let cur = el;
    const rows = [];
    for (let i = 0; cur && i < maxDepth; i++, cur = cur.parentElement) {
      const text = clean(cur.innerText || cur.textContent || "");
      rows.push({ depth:i, tag:cur.tagName, text:text.slice(0,1200), len:text.length, attrs:attrs(cur) });
    }
    return rows;
  }

  const controls = Array.from(document.querySelectorAll("a[href], a[download], button, [role='button']"))
    .filter(visible);

  const candidates = [];

  for (const el of controls) {
    const a = attrs(el);
    const selfText = clean(el.innerText || el.textContent || "");
    const combinedSelf = clean([selfText, ...Object.values(a)].join(" "));
    const selfLower = combinedSelf.toLowerCase();

    const ancestors = ancestorText(el, 7);
    const smallContext = clean(ancestors.filter(x => x.len <= 2200).map(x => x.text).join(" "));
    const contextLower = smallContext.toLowerCase();

    const giantContainer = selfText.length > 600 && !a.href && !a.download;
    if (giantContainer) continue;

    const looksLikeDownloadControl =
      el.tagName === "A" ||
      a.href ||
      a.download ||
      selfLower.includes("download") ||
      selfLower.includes(".zip") ||
      selfLower.includes("sandbox") ||
      selfLower.includes("backend-api") ||
      selfLower.includes("file");

    if (!looksLikeDownloadControl) continue;

    let score = 0;

    if (selfLower.includes(expectedLower)) score += 5000;
    if (contextLower.includes(expectedLower)) score += 3000;

    const phaseMatch = expectedLower.match(/phase\d+/);
    const phaseTerm = phaseMatch ? phaseMatch[0] : "";

    if (phaseTerm && selfLower.includes(phaseTerm)) score += 900;
    if (phaseTerm && contextLower.includes(phaseTerm)) score += 650;

    for (const term of terms) {
      if (selfLower.includes(term)) score += 250;
      if (contextLower.includes(term)) score += 90;
    }

    if (a.href && /download|sandbox|backend-api|files|attachment|conversation/.test(a.href.toLowerCase())) score += 1200;
    if (a.download) score += 1000;
    if (el.tagName === "A") score += 800;
    if (el.tagName === "BUTTON") score += 350;
    if (a.role === "button") score += 250;
    if (selfLower.includes("download")) score += 500;
    if (selfLower.includes(".zip")) score += 500;

    const expectedParts = expectedLower
      .replace(/^s\.e\.r\.a_/, "")
      .replace(/_overlay\.zip$/, "")
      .split("_")
      .filter(x => x.length >= 4);

    let partHits = 0;
    for (const part of expectedParts) {
      if (selfLower.includes(part) || contextLower.includes(part)) partHits++;
    }

    if (partHits < Math.min(3, expectedParts.length)) continue;

    candidates.push({
      score,
      tag: el.tagName,
      selfText: selfText.slice(0, 400),
      combinedSelf: combinedSelf.slice(0, 600),
      attrs: a,
      context: smallContext.slice(0, 1200)
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  window.__SERA_ARTIFACT_DOWNLOAD_V2_CANDIDATES__ = candidates.slice(0, 25);

  if (!candidates.length) {
    return {
      ok:false,
      reason:"no_strict_download_candidates",
      expected,
      controlCount:controls.length,
      samples:Array.from(document.querySelectorAll("a[href],button,[role='button']"))
        .filter(visible)
        .slice(-80)
        .map(el => ({ tag:el.tagName, text:clean(el.innerText || el.textContent || "").slice(0,240), attrs:attrs(el) }))
    };
  }

  const controlsAgain = Array.from(document.querySelectorAll("a[href], a[download], button, [role='button']"))
    .filter(visible);

  let target = null;
  let best = -1;

  for (const el of controlsAgain) {
    const a = attrs(el);
    const selfText = clean(el.innerText || el.textContent || "");
    const combinedSelf = clean([selfText, ...Object.values(a)].join(" "));
    const selfLower = combinedSelf.toLowerCase();
    const ancestors = ancestorText(el, 7);
    const smallContext = clean(ancestors.filter(x => x.len <= 2200).map(x => x.text).join(" "));
    const contextLower = smallContext.toLowerCase();

    if (selfText.length > 600 && !a.href && !a.download) continue;

    let score = 0;
    if (selfLower.includes(expectedLower)) score += 5000;
    if (contextLower.includes(expectedLower)) score += 3000;

    const phaseMatch = expectedLower.match(/phase\d+/);
    const phaseTerm = phaseMatch ? phaseMatch[0] : "";
    if (phaseTerm && selfLower.includes(phaseTerm)) score += 900;
    if (phaseTerm && contextLower.includes(phaseTerm)) score += 650;

    for (const term of terms) {
      if (selfLower.includes(term)) score += 250;
      if (contextLower.includes(term)) score += 90;
    }

    if (a.href && /download|sandbox|backend-api|files|attachment|conversation/.test(a.href.toLowerCase())) score += 1200;
    if (a.download) score += 1000;
    if (el.tagName === "A") score += 800;
    if (el.tagName === "BUTTON") score += 350;
    if (a.role === "button") score += 250;
    if (selfLower.includes("download")) score += 500;
    if (selfLower.includes(".zip")) score += 500;

    const expectedParts = expectedLower
      .replace(/^s\.e\.r\.a_/, "")
      .replace(/_overlay\.zip$/, "")
      .split("_")
      .filter(x => x.length >= 4);

    let partHits = 0;
    for (const part of expectedParts) {
      if (selfLower.includes(part) || contextLower.includes(part)) partHits++;
    }

    if (partHits < Math.min(3, expectedParts.length)) continue;

    if (score > best) {
      best = score;
      target = { el, score, selfText, combinedSelf, attrs:a, context:smallContext };
    }
  }

  if (!target) {
    return { ok:false, reason:"candidate_lost_after_rescore", candidates:window.__SERA_ARTIFACT_DOWNLOAD_V2_CANDIDATES__ };
  }

  target.el.scrollIntoView({ block:"center", inline:"center" });
  await new Promise(r => setTimeout(r, 600));
  target.el.dispatchEvent(new MouseEvent("mouseover", { bubbles:true, cancelable:true, view:window }));
  target.el.dispatchEvent(new MouseEvent("pointerdown", { bubbles:true, cancelable:true, view:window }));
  target.el.dispatchEvent(new MouseEvent("mousedown", { bubbles:true, cancelable:true, view:window }));
  target.el.dispatchEvent(new MouseEvent("mouseup", { bubbles:true, cancelable:true, view:window }));
  target.el.dispatchEvent(new MouseEvent("pointerup", { bubbles:true, cancelable:true, view:window }));
  target.el.click();

  return {
    ok:true,
    action:"strict_download_control_clicked",
    score:target.score,
    tag:target.el.tagName,
    selfText:target.selfText.slice(0,400),
    combinedSelf:target.combinedSelf.slice(0,600),
    attrs:target.attrs,
    context:target.context.slice(0,1000),
    topCandidates:window.__SERA_ARTIFACT_DOWNLOAD_V2_CANDIDATES__
  };
})()
"@

  $ClickResult = Invoke-CdpMethod -WsUrl $WsUrl -Method "Runtime.evaluate" -Params @{
    expression = $ClickJs
    awaitPromise = $true
    returnByValue = $true
  }

  $ClickValue = $ClickResult.result.result.value
  Write-Step "ARTIFACT_DOWNLOAD_V2_CLICK_RESULT $($ClickValue | ConvertTo-Json -Depth 20 -Compress)"

  if (!$ClickValue -or $ClickValue.ok -ne $true) {
    throw "ARTIFACT_DOWNLOAD_V2_CLICK_BLOCKED: $($ClickValue | ConvertTo-Json -Depth 20 -Compress)"
  }

  $Deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $Deadline) {
    $Existing = Find-DownloadedArtifact -Name $ExpectedFilename -StartedAt $StartedAt
    if ($Existing) {
      Write-Step "ARTIFACT_DOWNLOAD_V2_DOWNLOADED $Existing"
      Write-Step "ARTIFACT_FOUND $Existing"
      return $Existing
    }

    $Seen = Get-ChildItem $DownloadDir -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -like "*.crdownload" -or $_.Name -like "*phase*" -or $_.Name -like "*.zip" } |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 3

    if ($Seen) {
      Write-Step "ARTIFACT_DOWNLOAD_V2_WAIT_SEEN $($Seen[0].FullName)"
    }

    Start-Sleep -Seconds 3
  }

  throw "Timed out waiting for exact ChatGPT artifact download via V2 selector: $ExpectedFilename"
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

  $Downloaded = Invoke-ArtifactDownloadV2 -WsUrl $WsUrl -ExpectedFilename $ExpectedFilename -TimeoutSeconds $TimeoutSeconds -StartedAt $RunStartedAt
  if (!(Test-Path $Downloaded)) {
    throw "ARTIFACT_DOWNLOAD_V2_FALSE_SUCCESS_GUARD: reported download path missing: $Downloaded"
  }

  Write-Step "ARTIFACT_DOWNLOAD_V2_PROOF_PASS path=$Downloaded"
  exit 0
} catch {
  Write-Step "ARTIFACT_DOWNLOAD_V2_BLOCKED reason=$($_.Exception.Message)"
  exit 1
}

# PHASE193_ARTIFACT_DOWNLOAD_BRIDGE_V2_INTEGRATED
# ARTIFACT_DOWNLOAD_V2_STRICT_CONTROL_SELECTOR
# ARTIFACT_DOWNLOAD_V2_CLICK_RESULT
# ARTIFACT_DOWNLOAD_V2_DOWNLOADED
# ARTIFACT_DOWNLOAD_V2_PROOF_PASS
# ARTIFACT_DOWNLOAD_V2_FALSE_SUCCESS_GUARD
# NO_FALSE_PROOF_PASS_AFTER_FAILED_DOWNLOAD
# SAVED_CHATGPT_TARGET_CAPTURE during prompt submission marker.
# savedChatGptTargetOnly true marker.
# allowRandomRecentChatFallback false marker.
# allowNewChatFallback false marker.

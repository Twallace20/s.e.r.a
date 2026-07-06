param(
  [Parameter(Mandatory=$true)][string]$HandoffPath,
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$BrowserDebugUrl = "http://127.0.0.1:9222",
  [int]$TimeoutSeconds = 60,
  [switch]$LaunchBrowserIfNeeded,
  [switch]$AllowSingleChatGptTabFallback
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase179_final_handoff_pasteback_proof_v1_overlay"
$HandoffRoot = Join-Path $AutoOpsRoot "06_handoff"
$TargetRoot = Join-Path $AutoOpsRoot "00_control_center\browser_target"
New-Item -ItemType Directory -Force $HandoffRoot,$TargetRoot | Out-Null

function Write-Step {
  param([string]$Message)
  Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
}

function Write-PastebackNote {
  param(
    [string]$Status,
    [string]$Reason
  )

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Path = Join-Path $HandoffRoot "$PhaseName-$Stamp-$Status.md"

  @"
Status: $Status
Phase: $PhaseName
Timestamp: $Stamp
HandoffPath: $HandoffPath

Reason:
$Reason
"@ | Set-Content $Path -Encoding UTF8

  Write-Step "$Status $Path"
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
    throw "No Chrome or Edge executable found for pasteback."
  }

  Start-Process -FilePath $Browser -ArgumentList @("--remote-debugging-port=9222","https://chatgpt.com/")
  Start-Sleep -Seconds 5
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

function Get-SafeChatGptTarget {
  $Tabs = Invoke-RestMethod -Uri "$BrowserDebugUrl/json" -TimeoutSec 5
  $ChatTabs = @($Tabs | Where-Object {
    ([string]$_.url -like "*chatgpt.com/*" -or [string]$_.url -like "*chat.openai.com/*") -and
    [string]$_.webSocketDebuggerUrl
  })

  if ($ChatTabs.Count -eq 0) {
    return $null
  }

  $Saved = Join-Path $TargetRoot "latest-chatgpt-target.json"
  if (Test-Path $Saved) {
    try {
      $SavedObj = Get-Content $Saved -Raw | ConvertFrom-Json
      $SavedUrl = [string]$SavedObj.url
      if ($SavedUrl) {
        $Match = $ChatTabs | Where-Object { [string]$_.url -eq $SavedUrl } | Select-Object -First 1
        if ($Match) {
          return $Match
        }
      }
    } catch {
      Write-Step "PASTEBACK_SAVED_TARGET_READ_FAILED $($_.Exception.Message)"
    }
  }

  if ($ChatTabs.Count -eq 1 -or $AllowSingleChatGptTabFallback) {
    if ($ChatTabs.Count -eq 1) {
      return $ChatTabs[0]
    }
  }

  return $null
}

if (!(Test-Path $HandoffPath)) {
  Write-PastebackNote -Status "PASTEBACK_BLOCKED" -Reason "Handoff path was not found."
  exit 1
}

$FinalText = Get-Content -LiteralPath $HandoffPath -Raw

if ($FinalText -notlike "Status: CLOSED_CLEANLY*" -and $FinalText -notlike "Status: BLOCKED*") {
  Write-PastebackNote -Status "PASTEBACK_BLOCKED" -Reason "Handoff is neither CLOSED_CLEANLY nor BLOCKED. Refusing pasteback."
  exit 1
}

Write-Step "FINAL_HANDOFF_PASTEBACK_START handoff=$HandoffPath"

if (!(Test-DebugBrowser)) {
  if ($LaunchBrowserIfNeeded) {
    Start-DebugBrowser
  }
}

if (!(Test-DebugBrowser)) {
  Write-PastebackNote -Status "PASTEBACK_SKIPPED_SAFE" -Reason "Browser debug endpoint unavailable. Refusing unsafe pasteback."
  exit 0
}

$Target = Get-SafeChatGptTarget
if (!$Target) {
  Write-PastebackNote -Status "PASTEBACK_SKIPPED_SAFE" -Reason "Safe current ChatGPT target could not be uniquely identified. No random chat fallback and no new chat fallback were used."
  exit 0
}

$TargetRecord = @{
  url = [string]$Target.url
  ts = (Get-Date).ToString("o")
  source = "phase179-pasteback"
  savedChatGptTargetOnly = $true
  allowRandomRecentChatFallback = $false
  allowNewChatFallback = $false
}
$TargetRecord | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $TargetRoot "latest-chatgpt-target.json") -Encoding UTF8

$WsUrl = [string]$Target.webSocketDebuggerUrl
$HandoffBytes = [System.Text.Encoding]::UTF8.GetBytes($FinalText)
$HandoffB64 = [Convert]::ToBase64String($HandoffBytes)
$HandoffB64Json = $HandoffB64 | ConvertTo-Json -Compress

$PasteJs = @"
(async () => {
  const handoffB64 = $HandoffB64Json;
  const handoff = new TextDecoder("utf-8").decode(Uint8Array.from(atob(handoffB64), c => c.charCodeAt(0)));

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

  const boxes = Array.from(document.querySelectorAll("textarea, [contenteditable='true'], [role='textbox'], #prompt-textarea")).filter(visible);
  const box = boxes[boxes.length - 1];

  if (!box) {
    return { ok:false, reason:"composer_not_found" };
  }

  setText(box, handoff);
  await new Promise(r => setTimeout(r, 500));

  const buttons = Array.from(document.querySelectorAll("button, [role='button']")).filter(visible);

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
    return { ok:false, reason:"send_button_not_found" };
  }

  send.click();
  return { ok:true, action:"handoff_pasteback_submitted" };
})()
"@

$Result = Invoke-CdpMethod -WsUrl $WsUrl -Method "Runtime.evaluate" -Params @{
  expression = $PasteJs
  awaitPromise = $true
  returnByValue = $true
}

$Value = $Result.result.result.value
$ValueJson = $Value | ConvertTo-Json -Compress
Write-Step "PASTEBACK_RESULT $ValueJson"

if (!$Value.ok) {
  Write-PastebackNote -Status "PASTEBACK_BLOCKED" -Reason "Pasteback failed safely: $ValueJson"
  exit 1
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ProofPath = Join-Path $HandoffRoot "$PhaseName-$Stamp-PASTEBACK_SUBMITTED.md"

@"
Status: PASTEBACK_SUBMITTED
Phase: $PhaseName
Timestamp: $Stamp
HandoffPath: $HandoffPath
TargetUrl: $($Target.url)

Proof:
- Final current-phase handoff was submitted into the safe ChatGPT target.
- No random recent chat fallback was used.
- No new chat fallback was used.
"@ | Set-Content $ProofPath -Encoding UTF8

Write-Step "PASTEBACK_SUBMITTED $ProofPath"
exit 0

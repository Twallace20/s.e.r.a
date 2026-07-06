param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [Parameter(Mandatory = $true)][string]$HandoffPath,
  [Parameter(Mandatory = $true)][string]$PhaseSlug,
  [string]$ExpectedFilename = "",
  [switch]$SavedChatGptTargetOnly
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_${PhaseSlug}_overlay"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$TargetPath = Join-Path $AutoOpsRoot "00_control_center\chatgpt_targets\$PhaseSlug-saved-chatgpt-target.json"

New-Item -ItemType Directory -Force $Handoff | Out-Null

function Write-PastebackResult {
  param(
    [string]$Status,
    [string]$Reason
  )

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Path = Join-Path $Handoff "$PhaseName-$Stamp-$Status.md"

  @"
Status: $Status
Phase: $PhaseName
Timestamp: $Stamp
Reason:
$Reason
"@ | Set-Content $Path -Encoding UTF8

  Write-Host "$Status $Path"
  return $Path
}

function Invoke-CdpEvaluate {
  param(
    [string]$WebSocketDebuggerUrl,
    [string]$Expression
  )

  try {
    [void][System.Net.WebSockets.ClientWebSocket]
  } catch {
    try { Add-Type -AssemblyName System.Net.WebSockets -ErrorAction SilentlyContinue } catch {}
    try { Add-Type -AssemblyName System -ErrorAction SilentlyContinue } catch {}
  }

  try {
    [void][System.Net.WebSockets.ClientWebSocket]
  } catch {
    throw "ClientWebSocket type is unavailable in this PowerShell runtime."
  }

  $Client = [System.Net.WebSockets.ClientWebSocket]::new()
  $Uri = [Uri]$WebSocketDebuggerUrl
  $Cancel = [Threading.CancellationToken]::None

  $Client.ConnectAsync($Uri, $Cancel).GetAwaiter().GetResult()

  try {
    $Payload = @{
      id = 1
      method = "Runtime.evaluate"
      params = @{
        expression = $Expression
        awaitPromise = $true
        returnByValue = $true
      }
    } | ConvertTo-Json -Depth 20 -Compress

    $Bytes = [Text.Encoding]::UTF8.GetBytes($Payload)
    $Client.SendAsync(
      [ArraySegment[byte]]::new($Bytes),
      [System.Net.WebSockets.WebSocketMessageType]::Text,
      $true,
      $Cancel
    ).GetAwaiter().GetResult()

    $Buffer = [byte[]]::new(1048576)

    for ($Attempt = 0; $Attempt -lt 30; $Attempt++) {
      $Stream = [IO.MemoryStream]::new()

      do {
        $Segment = [ArraySegment[byte]]::new($Buffer)
        $Result = $Client.ReceiveAsync($Segment, $Cancel).GetAwaiter().GetResult()

        if ($Result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
          throw "CDP websocket closed."
        }

        $Stream.Write($Buffer, 0, $Result.Count)
      } until ($Result.EndOfMessage)

      $JsonText = [Text.Encoding]::UTF8.GetString($Stream.ToArray())
      $Message = $JsonText | ConvertFrom-Json

      if ($Message.id -eq 1) {
        return $Message
      }
    }

    throw "CDP evaluate response timed out."
  } finally {
    $Client.Dispose()
  }
}

if (!(Test-Path $HandoffPath)) {
  Write-PastebackResult "PASTEBACK_BLOCKED" "Handoff path missing: $HandoffPath" | Out-Null
  exit 1
}

if (!(Test-Path $TargetPath)) {
  Write-PastebackResult "PASTEBACK_BLOCKED" "Saved ChatGPT target missing: $TargetPath" | Out-Null
  exit 1
}

$Target = Get-Content -LiteralPath $TargetPath -Raw | ConvertFrom-Json

if ([string]$Target.phaseSlug -ne $PhaseSlug) {
  Write-PastebackResult "PASTEBACK_BLOCKED" "Saved target phaseSlug mismatch." | Out-Null
  exit 1
}

if ($ExpectedFilename -and [string]$Target.expectedFilename -ne $ExpectedFilename) {
  Write-PastebackResult "PASTEBACK_BLOCKED" "Saved target expectedFilename mismatch." | Out-Null
  exit 1
}

if ([string]$Target.url -notlike "*chatgpt.com*" -and [string]$Target.url -notlike "*chat.openai.com*") {
  Write-PastebackResult "PASTEBACK_BLOCKED" "Saved target is not a ChatGPT URL." | Out-Null
  exit 1
}

if ([string]$Target.url -notmatch "/c/") {
  Write-PastebackResult "PASTEBACK_BLOCKED" "Saved target is not a ChatGPT conversation URL." | Out-Null
  exit 1
}

if (![string]$Target.webSocketDebuggerUrl) {
  Write-PastebackResult "PASTEBACK_BLOCKED" "Saved target is missing webSocketDebuggerUrl." | Out-Null
  exit 1
}

$HandoffText = [string](Get-Content -LiteralPath $HandoffPath -Raw)

if (!$HandoffText.StartsWith("Status: CLOSED_CLEANLY") -and !$HandoffText.StartsWith("Status: BLOCKED")) {
  Write-PastebackResult "PASTEBACK_BLOCKED" "Final handoff text does not start with CLOSED_CLEANLY or BLOCKED." | Out-Null
  exit 1
}

$TextLiteral = $HandoffText | ConvertTo-Json -Compress

$Expression = @"
(async () => {
  const text = String($TextLiteral);

  function visible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }

  function setNativeValue(element, value) {
    const proto = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : element instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : null;

    if (proto) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
      descriptor.set.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }

    return false;
  }

  const boxes = Array.from(document.querySelectorAll("textarea, [contenteditable='true'], [role='textbox'], #prompt-textarea"))
    .filter(visible);

  const box = boxes[boxes.length - 1];

  if (!box) {
    return JSON.stringify({ ok: false, reason: "textbox_not_found", url: location.href });
  }

  box.focus();

  let inserted = false;

  if (box.tagName === "TEXTAREA" || box.tagName === "INPUT") {
    inserted = setNativeValue(box, text);
  }

  if (!inserted) {
    box.textContent = text;
    box.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  }

  await new Promise(resolve => setTimeout(resolve, 700));

  const currentText = String(box.value || box.textContent || "");

  if (!currentText.startsWith("Status: CLOSED_CLEANLY") && !currentText.startsWith("Status: BLOCKED")) {
    return JSON.stringify({
      ok: false,
      reason: "textbox_text_mismatch",
      observedPrefix: currentText.slice(0, 80),
      expectedPrefix: text.slice(0, 80),
      url: location.href
    });
  }

  const buttons = Array.from(document.querySelectorAll("button, [role='button']")).filter(visible);

  const send = buttons.find(button => {
    const label = [
      button.getAttribute("aria-label"),
      button.getAttribute("data-testid"),
      button.title,
      button.innerText
    ].filter(Boolean).join(" ").toLowerCase();

    return label.includes("send") || label.includes("submit");
  });

  if (!send) {
    return JSON.stringify({ ok: false, reason: "send_button_not_found", url: location.href });
  }

  send.click();

  return JSON.stringify({
    ok: true,
    action: "pasteback_submitted_plain_text",
    textPrefix: text.slice(0, 120),
    url: location.href
  });
})()
"@

Write-Host "FINAL_HANDOFF_PASTEBACK_START handoff=$HandoffPath"

$RawResult = Invoke-CdpEvaluate -WebSocketDebuggerUrl ([string]$Target.webSocketDebuggerUrl) -Expression $Expression
$RawJson = $RawResult | ConvertTo-Json -Depth 20 -Compress

$Value = [string]$RawResult.result.result.value

if (!$Value) {
  Write-PastebackResult "PASTEBACK_BLOCKED" "CDP returned no string value. RawResult: $RawJson" | Out-Null
  exit 1
}

try {
  $Parsed = $Value | ConvertFrom-Json
} catch {
  Write-PastebackResult "PASTEBACK_BLOCKED" "CDP value was not JSON. Value: $Value RawResult: $RawJson" | Out-Null
  exit 1
}

if ($Parsed.ok -ne $true) {
  $Reason = $Parsed | ConvertTo-Json -Depth 10 -Compress
  Write-PastebackResult "PASTEBACK_BLOCKED" "Browser pasteback failed: $Reason RawResult: $RawJson" | Out-Null
  exit 1
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PostedPath = Join-Path $Handoff "$PhaseName-$Stamp-PASTEBACK_POSTED_TEXT_MATCH.md"

@"
Status: PASTEBACK_POSTED_TEXT_MATCH
Phase: $PhaseName
Timestamp: $Stamp

Proof:
- Final handoff was submitted as plain text to the saved run-scoped ChatGPT target.
- Text prefix matched Status: CLOSED_CLEANLY or Status: BLOCKED before clicking Send.
- PhaseSlug: $PhaseSlug
- ExpectedFilename: $ExpectedFilename
- Target URL: $($Target.url)
- No random chat fallback was used.
- No new chat fallback was used.
"@ | Set-Content $PostedPath -Encoding UTF8

Write-Host "PASTEBACK_POSTED_TEXT_MATCH $PostedPath"
exit 0

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

  Add-Type -AssemblyName System.Net.WebSockets.Client

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
    $Client.SendAsync([ArraySegment[byte]]::new($Bytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $Cancel).GetAwaiter().GetResult()

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

$HandoffText = Get-Content -LiteralPath $HandoffPath -Raw
$TextLiteral = $HandoffText | ConvertTo-Json -Compress

$Expression = @"
(async () => {
  const text = $TextLiteral;

  function visible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }

  const boxes = Array.from(document.querySelectorAll("textarea, [contenteditable='true'], [role='textbox'], #prompt-textarea"))
    .filter(visible);

  const box = boxes[boxes.length - 1];

  if (!box) {
    return { ok: false, reason: "textbox_not_found", url: location.href };
  }

  box.focus();

  if (box.tagName === "TEXTAREA" || box.tagName === "INPUT") {
    box.value = text;
    box.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  } else {
    box.textContent = text;
    box.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  }

  await new Promise(resolve => setTimeout(resolve, 500));

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
    return { ok: false, reason: "send_button_not_found", url: location.href };
  }

  send.click();

  return { ok: true, action: "pasteback_submitted", url: location.href };
})()
"@

Write-Host "FINAL_HANDOFF_PASTEBACK_START handoff=$HandoffPath"

$Result = Invoke-CdpEvaluate -WebSocketDebuggerUrl ([string]$Target.webSocketDebuggerUrl) -Expression $Expression
$Value = $Result.result.result.value

if (!$Value -or $Value.ok -ne $true) {
  $Reason = ($Value | ConvertTo-Json -Depth 10 -Compress)
  Write-PastebackResult "PASTEBACK_BLOCKED" $Reason | Out-Null
  exit 1
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PostedPath = Join-Path $Handoff "$PhaseName-$Stamp-PASTEBACK_POSTED.md"

@"
Status: PASTEBACK_POSTED
Phase: $PhaseName
Timestamp: $Stamp

Proof:
- Final handoff was submitted to the saved run-scoped ChatGPT target.
- PhaseSlug: $PhaseSlug
- ExpectedFilename: $ExpectedFilename
- Target URL: $($Target.url)
- No random chat fallback was used.
- No new chat fallback was used.
"@ | Set-Content $PostedPath -Encoding UTF8

Write-Host "PASTEBACK_POSTED $PostedPath"
exit 0

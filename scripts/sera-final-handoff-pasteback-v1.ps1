param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$HandoffPath,
  [string]$FinalHandoffPath,
  [string]$BrowserDebugUrl = "http://127.0.0.1:9222",
  [string]$ExpectedFilename,
  [string]$PhaseSlug,
  [switch]$SavedChatGptTargetOnly,
  [switch]$RequireSavedChatGptTargetOnly
)

$ErrorActionPreference = "Stop"

if (!$HandoffPath -and $FinalHandoffPath) {
  $HandoffPath = $FinalHandoffPath
}

if (!$HandoffPath) {
  throw "HandoffPath is required."
}

$HandoffRoot = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $HandoffRoot | Out-Null

function Write-Step {
  param([string]$Message)
  Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
}

function Get-PhaseNameFromHandoff {
  param([string]$Path)

  $Name = [IO.Path]::GetFileName($Path)
  $Match = [regex]::Match($Name, "^(s\.e\.r\.a_.+?_overlay)-\d{8}_\d{6}-")
  if ($Match.Success) {
    return $Match.Groups[1].Value
  }

  return "unknown_phase"
}

function Get-PhaseSlugFromPhaseName {
  param([string]$PhaseName)

  $Slug = $PhaseName
  $Slug = $Slug -replace "^s\.e\.r\.a_", ""
  $Slug = $Slug -replace "_overlay$", ""
  return $Slug
}

function Write-PastebackResult {
  param(
    [string]$Status,
    [string]$Reason,
    [string]$TargetUrl = ""
  )

  $PhaseName = Get-PhaseNameFromHandoff -Path $HandoffPath
  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Path = Join-Path $HandoffRoot "$PhaseName-$Stamp-$Status.md"

  @"
Status: $Status
Phase: $PhaseName
Timestamp: $Stamp
TargetUrl: $TargetUrl

Reason:
$Reason

Final handoff:
$HandoffPath
"@ | Set-Content $Path -Encoding UTF8

  Write-Step "$Status $Path"
  Write-Host $Path
  return $Path
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

Write-Step "FINAL_HANDOFF_PASTEBACK_START handoff=$HandoffPath"

if (!(Test-Path $HandoffPath)) {
  Write-PastebackResult -Status "PASTEBACK_BLOCKED" -Reason "Final handoff file not found."
  exit 1
}

$HandoffText = Get-Content -LiteralPath $HandoffPath -Raw
if ($HandoffText -notmatch "Status:\s*(CLOSED_CLEANLY|BLOCKED)") {
  Write-PastebackResult -Status "PASTEBACK_SKIPPED_SAFE" -Reason "Handoff is not a final CLOSED_CLEANLY or BLOCKED handoff."
  exit 0
}

$PhaseName = Get-PhaseNameFromHandoff -Path $HandoffPath
if (!$PhaseSlug) {
  $PhaseSlug = Get-PhaseSlugFromPhaseName -PhaseName $PhaseName
}

$TargetRoot = Join-Path $AutoOpsRoot "00_control_center\chatgpt_targets"
$TargetPath = Join-Path $TargetRoot "$PhaseSlug-saved-chatgpt-target.json"

if (!(Test-Path $TargetPath)) {
  Write-PastebackResult -Status "PASTEBACK_SKIPPED_SAFE" -Reason "Saved ChatGPT target metadata missing for phase slug $PhaseSlug."
  exit 0
}

$Meta = Get-Content -LiteralPath $TargetPath -Raw | ConvertFrom-Json
$SavedUrl = [string]$Meta.url
$SavedTargetId = [string]$Meta.targetId

if ($SavedUrl -notlike "*chatgpt.com*" -and $SavedUrl -notlike "*chat.openai.com*") {
  Write-PastebackResult -Status "PASTEBACK_BLOCKED" -Reason "Saved target is not a ChatGPT URL: $SavedUrl"
  exit 1
}

try {
  $Tabs = Invoke-RestMethod -Uri "$BrowserDebugUrl/json" -TimeoutSec 5
} catch {
  Write-PastebackResult -Status "PASTEBACK_SKIPPED_SAFE" -Reason "Browser debug endpoint unavailable."
  exit 0
}

$Target = $null

$Target = $Tabs |
  Where-Object {
    [string]$_.webSocketDebuggerUrl -and
    [string]$_.id -eq $SavedTargetId -and
    [string]$_.url -eq $SavedUrl
  } |
  Select-Object -First 1

if (!$Target) {
  $Target = $Tabs |
    Where-Object {
      [string]$_.webSocketDebuggerUrl -and
      [string]$_.url -eq $SavedUrl
    } |
    Select-Object -First 1
}

if (!$Target) {
  Write-PastebackResult -Status "PASTEBACK_SKIPPED_SAFE" -Reason "Exact saved ChatGPT target is not currently available. Refusing random fallback." -TargetUrl $SavedUrl
  exit 0
}

$WsUrl = [string]$Target.webSocketDebuggerUrl
$CurrentUrl = [string]$Target.url

if ($CurrentUrl -ne $SavedUrl) {
  Write-PastebackResult -Status "PASTEBACK_BLOCKED" -Reason "Current target URL does not match saved URL. Refusing pasteback." -TargetUrl $CurrentUrl
  exit 1
}

$Message = $HandoffText.Trim()
$MessageB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Message))
$MessageB64Json = $MessageB64 | ConvertTo-Json -Compress

$SubmitJs = @"
(async () => {
  const messageB64 = $MessageB64Json;
  const message = new TextDecoder("utf-8").decode(Uint8Array.from(atob(messageB64), c => c.charCodeAt(0)));

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

  setText(box, message);
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
  return { ok:true, action:"final_handoff_pasteback_submitted" };
})()
"@

$Result = Invoke-CdpMethod -WsUrl $WsUrl -Method "Runtime.evaluate" -Params @{
  expression = $SubmitJs
  awaitPromise = $true
  returnByValue = $true
}

$JsonResult = $Result.result.result.value | ConvertTo-Json -Compress
Write-Step "PASTEBACK_SUBMIT_RESULT $JsonResult"

if ($Result.result.result.value.ok -ne $true) {
  Write-PastebackResult -Status "PASTEBACK_BLOCKED" -Reason "Pasteback submit failed: $JsonResult" -TargetUrl $CurrentUrl
  exit 1
}

Write-PastebackResult -Status "PASTEBACK_POSTED" -Reason "Final handoff was posted into the exact saved ChatGPT target." -TargetUrl $CurrentUrl | Out-Null
Write-Step "PASTEBACK_POSTED exactSavedTarget=$CurrentUrl"
exit 0

# EXACT_SAVED_CHATGPT_TARGET_ONLY marker.
# PASTEBACK_SKIPPED_SAFE marker.
# PASTEBACK_BLOCKED marker.
# PASTEBACK_POSTED marker.
# Supports CLOSED_CLEANLY and BLOCKED handoffs.

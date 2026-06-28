# Phase 112 — ChatGPT Bridge DOM Inspector v1

## Purpose

Phase 112 adds the first browser-observation layer for the S.E.R.A. ChatGPT Bridge. It is intentionally **inspection-only** by default.

It can:

- read the saved ChatGPT bridge target from OneDrive AutoOps state
- connect to a dedicated Chrome DevTools Protocol endpoint
- find the saved ChatGPT tab by URL
- inspect likely composer/textbox selectors
- write structured DOM evidence to `12_browser_helper_state`
- write safe blocked packets to `12_browser_helper_blocked` and `17_needs_attention`

It does **not**:

- submit prompts
- click send buttons
- download files
- type into ChatGPT
- choose a random conversation
- create a new chat as fallback
- use credentials, tokens, paid services, or GitHub/security settings

## Required target file

The bridge target must exist here:

```text
%USERPROFILE%\OneDrive\SERA-AutoOps\12_browser_helper_state\chatgpt-bridge-target.json
```

Expected shape:

```json
{
  "targetName": "SERA Autopilot Control Thread",
  "targetUrl": "https://chatgpt.com/...",
  "failIfTargetMissing": true,
  "allowNewChatFallback": false,
  "allowRandomRecentChatFallback": false,
  "composerSelectors": [
    "div#prompt-textarea.ProseMirror[contenteditable=\"true\"][role=\"textbox\"]",
    "div[contenteditable=\"true\"][role=\"textbox\"]",
    "textarea[name=\"prompt-textarea\"]"
  ]
}
```

Use `scripts/phase112-set-chatgpt-target.ps1` to create this file.

## Chrome DevTools requirement

Phase 112 only inspects a browser that is intentionally launched with Chrome DevTools Protocol enabled. If it cannot reach the CDP endpoint, it writes a blocked packet with exact next steps instead of guessing.

Recommended dedicated Chrome launch command:

```powershell
$ChatUrl = "PASTE_THIS_EXACT_CHATGPT_CONVERSATION_URL"
$Profile = "$env:USERPROFILE\OneDrive\SERA-AutoOps\12_browser_helper_state\chrome-profile"
New-Item -ItemType Directory -Force $Profile | Out-Null
Start-Process "chrome.exe" -ArgumentList @(
  "--remote-debugging-port=9222",
  "--user-data-dir=`"$Profile`"",
  "--no-first-run",
  "--new-window",
  "`"$ChatUrl`""
)
```

## Commands

Run the static phase verifier:

```powershell
node scripts/phase112-verify.mjs
```

Run DOM inspection:

```powershell
node scripts/chatgpt-bridge-dom-inspector.mjs
```

Or use the PowerShell wrapper:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-chatgpt-dom-inspector.ps1
```

## Pass conditions

The inspector can pass only when all of these are true:

1. `chatgpt-bridge-target.json` exists.
2. The target URL is a ChatGPT/OpenAI chat URL.
3. Chrome DevTools Protocol is reachable.
4. A tab matching the saved target URL is open.
5. A visible, editable composer/textbox candidate is found.
6. Evidence is written without prompt submission or download activity.

## Failure behavior

Any missing requirement produces a blocked packet, not an unsafe fallback. The bridge must not use random recent chats, create new chats, or submit prompts during Phase 112.

## Next phase

Phase 113 can add a safer batch-runner contract after Phase 112 proves that the saved-thread DOM target can be found reliably. Prompt submission should remain disabled until an explicit later phase proves dry-run evidence and owner controls.

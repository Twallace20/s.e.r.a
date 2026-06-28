# Phase 113 — ChatGPT Bridge Submit + Download v1

## Purpose

Phase 113 adds the first controlled submit/download bridge for S.E.R.A. AutoOps.

It is designed to turn the proven Phase 112 DOM inspection layer into a carefully gated browser bridge that can:

1. read the saved S.E.R.A. ChatGPT target thread,
2. read a prompt from `15_bridge_outbox`,
3. open only the exact saved ChatGPT tab,
4. find the composer verified by Phase 112,
5. paste and submit the prompt only when explicitly enabled,
6. watch for ZIP links in the latest assistant response,
7. route downloaded ZIPs into `13_chatgpt_downloads`, and
8. write evidence or blocked packets without guessing.

## Safety rules

Phase 113 is not unrestricted browser automation.

It must not:

- use a random recent chat,
- create a new chat fallback,
- submit anything unless `SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE=true`,
- run while `00_control_center/pause/PAUSE_AUTOPILOT.txt` exists,
- submit prompts outside `15_bridge_outbox`,
- submit prompts that appear to request credentials, secrets, paid services, GitHub security changes, or dependency/tool installation approval,
- download non-ZIP artifacts for AutoOps,
- click arbitrary page elements, or
- merge anything by itself.

AutoOps merge safety remains handled by the existing gate and safe merge auto-approver.

## Required folders

```text
%USERPROFILE%\OneDrive\SERA-AutoOps\12_browser_helper_state
%USERPROFILE%\OneDrive\SERA-AutoOps\12_browser_helper_blocked
%USERPROFILE%\OneDrive\SERA-AutoOps\13_chatgpt_downloads
%USERPROFILE%\OneDrive\SERA-AutoOps\15_bridge_outbox
%USERPROFILE%\OneDrive\SERA-AutoOps\17_needs_attention
```

## Required target file

Phase 113 reuses the Phase 112 target file:

```text
12_browser_helper_state\chatgpt-bridge-target.json
```

The bridge refuses to run unless these are true:

```json
{
  "allowNewChatFallback": false,
  "allowRandomRecentChatFallback": false
}
```

## Commands

Static verifier:

```powershell
node scripts/phase113-verify.mjs
```

PowerShell wrapper:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-chatgpt-submit-download.ps1 -DryRun
```

Write the Phase 114 test prompt:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\phase113-write-phase114-test-prompt.ps1
```

Run the controlled execute bridge:

```powershell
$env:SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE = "true"
powershell -ExecutionPolicy Bypass -File .\scripts\sera-chatgpt-submit-download.ps1 -Execute
```

## Phase 114 smoke test

After Phase 113 closes cleanly, the intended test is:

1. write a Phase 114 bridge smoke-test request into `15_bridge_outbox`,
2. run the controlled bridge in execute mode,
3. let this saved ChatGPT thread generate the Phase 114 overlay ZIP,
4. let the bridge download the ZIP into `13_chatgpt_downloads`, and
5. let existing AutoOps process Phase 114.

This tests the new submit/download bridge without expanding code-writing autonomy.

## Pass conditions

Phase 113 passes only when the static verifier confirms:

- the submit/download bridge script exists,
- it has valid Node syntax,
- it requires explicit execute enablement,
- it refuses random/new chat fallback,
- it writes evidence and blocked packets,
- it routes ZIPs to `13_chatgpt_downloads`, and
- it includes the Phase 114 smoke-test prompt writer.

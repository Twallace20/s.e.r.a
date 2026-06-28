# Phase 115 — ChatGPT DOM Download Troubleshooter v1

## Purpose

Phase 115 closes the practical gap found during the Phase 114 bridge test: the prompt/contract layer can be correct while the browser still needs stronger DOM logic to find and download the ZIP from the latest ChatGPT response.

This phase improves the existing Phase 113 submit/download bridge. It does not add unrestricted autonomy. It makes the download side more reliable and more diagnosable.

## What this phase adds

- Expected ZIP name detection from the prompt or `--expected-zip-name`.
- Latest-assistant-response-first download discovery.
- DOM candidate scanning for links, download anchors, buttons, and role buttons.
- Candidate scoring that prefers the expected ZIP name, `.zip` text, and visible download controls.
- Evidence capture for candidate lists and response text snippets.
- Fail-closed troubleshooting packets in `12_browser_helper_blocked` and `17_needs_attention` when the bridge cannot find or click a download control.
- A Phase 116 test prompt writer for the next full continuation smoke test.

## Safety rules

Phase 115 must not:

- use a random recent chat,
- create a new chat fallback,
- click arbitrary non-download page elements,
- submit prompts without `SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE=true`,
- approve merges,
- bypass AutoOps gates,
- use credentials, tokens, paid services, or GitHub/security settings, or
- continue if the expected download is ambiguous.

## Intended normal loop after Phase 115

```text
CLOSED_CLEANLY
→ prompt builder writes grounded next-phase prompt
→ bridge submits prompt to saved ChatGPT thread
→ bridge waits for latest assistant response
→ bridge finds expected ZIP/download DOM candidate
→ bridge downloads ZIP to 13_chatgpt_downloads
→ router sends overlay to 01_apply_approved
→ AutoOps applies/gates/merges/closes
```

## Troubleshooting loop

```text
No ZIP candidate or ambiguous DOM
→ write evidence JSON to 12_browser_helper_state
→ write BLOCKED markdown to 12_browser_helper_blocked
→ write NEEDS_ATTENTION markdown to 17_needs_attention
→ do not click random elements
→ do not continue silently
```

## Commands

Verify static contract:

```powershell
node scripts/phase115-verify.mjs
```

Dry run the bridge:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sera-chatgpt-submit-download.ps1 -DryRun
```

Execute with an expected ZIP name:

```powershell
$env:SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE = "true"
powershell -ExecutionPolicy Bypass -File .\scripts\sera-chatgpt-submit-download.ps1 -Execute -ExpectedZipName "s.e.r.a_phase116_continuation_loop_smoke_test_v1_overlay.zip"
```

Write the Phase 116 continuation test prompt:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\phase115-write-phase116-test-prompt.ps1
```

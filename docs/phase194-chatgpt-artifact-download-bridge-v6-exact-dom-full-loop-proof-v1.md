# Phase194 — ChatGPT Artifact Download Bridge V6 Exact DOM Full Loop Proof v1

## Purpose

Guarantee the full autopilot path by installing the Phase193-proven V6 artifact downloader into the production ChatGPT browser bridge.

## Full autopilot target

1. JSON lands in `command_inbox`.
2. The watcher reads and routes the selected command JSON.
3. S.E.R.A. pastes and submits the prompt into the saved ChatGPT target.
4. S.E.R.A. clicks/downloads the exact ZIP automatically.
5. S.E.R.A. applies the ZIP through direct closeout.
6. S.E.R.A. returns standardized `CLOSED_CLEANLY` or `BLOCKED` handoff/logs.

## Winning selector from Phase193

The proven strategy is:

```text
newest exact expected ZIP filename button anywhere in DOM
-> scroll into view
-> click
-> CDP coordinate click backup
-> verify exact ZIP filename and SHA256/freshness before success
```

## Permanent guards

The bridge must:

- Use only the saved ChatGPT target; no random recent chat fallback.
- Avoid new-chat fallback.
- Set browser download behavior to `13_chatgpt_downloads`.
- Reject sidebar/nav controls.
- Reject stale artifacts.
- Never write `ARTIFACT_DOWNLOAD_V6_PROOF_PASS` until the exact file exists.
- Emit a clear `ARTIFACT_DOWNLOAD_V6_BLOCKED` reason if the exact ZIP cannot be downloaded.

## Installed files

- `scripts/sera-chatgpt-browser-bridge-v1.ps1`
- `scripts/sera-chatgpt-artifact-download-v6.ps1`
- `scripts/verify-phase194-chatgpt-artifact-download-bridge-v6-exact-dom-full-loop-proof-v1.ps1`
- `scripts/phase194-chatgpt-artifact-download-bridge-v6-exact-dom-full-loop-proof-v1.ps1`
- `.sera-proof/phase194_chatgpt_artifact_download_bridge_v6_exact_dom_full_loop_proof_v1.json`
- `.overlay/phase194_chatgpt_artifact_download_bridge_v6_exact_dom_full_loop_proof_v1.json`

# Phase 195 — Full Autopilot Cold Run v1

## Purpose

Use the fresh saved S.E.R.A. ChatGPT target URL and prove a full autopilot cold run from only the command JSON.

This phase intentionally rejects the dangerous shortcuts that can make a run look successful without proving the real loop:

- no preseeded expected ZIP
- no manual download
- no random recent ChatGPT conversation fallback
- no new-chat fallback
- no filename approximation
- no continuing until the exact expected ZIP filename is present and hashed

## Command contract

```json
{
  "commandId": "phase195-full-autopilot-cold-run-v1-fresh-url-20260709065602",
  "runNonce": "phase195-fresh-url-cold-run-20260709065602",
  "phaseSlug": "phase195_full_autopilot_cold_run_v1",
  "expectedZipFilename": "s.e.r.a_phase195_full_autopilot_cold_run_v1_overlay.zip",
  "savedChatGptTargetOnly": true,
  "allowRandomRecentChatFallback": false,
  "allowNewChatFallback": false
}
```

## Required saved URL input

The runner reads a saved ChatGPT target file, defaulting to:

```text
.sera-local/saved-chatgpt-target.json
```

Supported JSON keys are:

```json
{
  "url": "https://chatgpt.com/c/..."
}
```

or:

```json
{
  "savedChatGptUrl": "https://chatgpt.com/c/..."
}
```

The target must be an existing ChatGPT conversation URL. Generic `https://chatgpt.com/`, random recent chat selection, and new-chat fallback are blocked by contract.

## Run command

```powershell
npx tsx scripts/phase195-full-autopilot-cold-run.ts `
  --command commands/phase195-full-autopilot-cold-run-v1.command.json `
  --saved-url-file .sera-local/saved-chatgpt-target.json `
  --chrome-ws-file chrome-ws.json `
  --download-dir 13_chatgpt_downloads `
  --execute
```

Use `--plan-only` to verify contract and saved target resolution without touching ChatGPT:

```powershell
npx tsx scripts/phase195-full-autopilot-cold-run.ts `
  --command commands/phase195-full-autopilot-cold-run-v1.command.json `
  --saved-url-file .sera-local/saved-chatgpt-target.json `
  --plan-only
```

## Autopilot proof gates

A run is not considered complete unless all gates pass:

1. command JSON loads successfully
2. command contract exactly matches Phase 195 requirements
3. saved ChatGPT target URL exists and is an existing conversation target
4. download directory is snapshotted before prompt submission
5. expected ZIP filename is absent before the run starts
6. ChatGPT page opened from saved target URL only
7. command JSON is submitted exactly as the sole task payload
8. newest DOM control containing the exact expected ZIP filename is found
9. control is scrolled into view and clicked
10. browser download is saved into `13_chatgpt_downloads`
11. exact expected ZIP filename exists after download
12. SHA256 is computed
13. proof JSON is written
14. no fallback path was used

## Output proof

The runner writes:

```text
.sera-proof/phase195_full_autopilot_cold_run_v1_runtime_proof.json
```

This runtime proof is separate from the overlay proof included in this ZIP.

## Why this phase matters

Phase 194 proved the exact DOM artifact downloader strategy. Phase 195 proves the harder cold-start contract: from command JSON and a saved S.E.R.A. ChatGPT target only, the local bridge must drive the full loop and retrieve the exact ZIP without preseed or manual intervention.


## Phase 195 verifier hard gate repair

The production closeout hard gate expects this PowerShell verifier to exist after overlay application:

```text
scripts/verify-phase195-full-autopilot-cold-run-v1.ps1
```

This overlay includes that verifier plus a paired QA script:

```text
scripts/qa-phase195-full-autopilot-cold-run-v1.ps1
```

The verifier writes a fresh `VERIFY_PASS` handoff only after the exact expected ZIP, manifest, proof file, command contract, and required Phase 195 overlay files are present. On failure it writes a `BLOCKED` handoff and exits non-zero so QA and merge do not proceed.

The QA script requires the verifier handoff first, then writes `PASS_GUARANTEED` only after the exact ZIP and Phase 195 identity checks pass.

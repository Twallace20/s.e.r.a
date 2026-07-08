# Phase193 — ChatGPT Artifact Download Bridge V2 Integration v1

## Purpose

Phase193 installs the artifact download behavior proven during Phase192 into the production browser bridge.

The goal is to remove manual ZIP downloading from the normal S.E.R.A. flow.

## Why this phase exists

Phase192 proved that S.E.R.A. could close cleanly after the ZIP was present, and separately proved that a stricter DOM selector could click the real ChatGPT artifact button and download the ZIP into `13_chatgpt_downloads`.

The failure was not routing. Downloads are already routed to:

```text
C:\Users\18123\OneDrive\SERA-AutoOps\13_chatgpt_downloads
```

The gap was selector reliability. The earlier bridge could click a large chat/message container instead of the real artifact download control. Phase193 fixes that by integrating the V2 selector.

## The six-part autopilot path

The certified target path is:

1. JSON lands in `command_inbox`.
2. Watcher reads/routes JSON.
3. S.E.R.A. pastes prompt into ChatGPT.
4. S.E.R.A. clicks/downloads the exact ZIP automatically.
5. S.E.R.A. applies ZIP through direct closeout.
6. S.E.R.A. returns either `CLOSED_CLEANLY` or a standardized `BLOCKED` handoff/log.

## What changes

- Replaces `scripts/sera-chatgpt-browser-bridge-v1.ps1` with a V2 bridge that includes the strict artifact selector.
- Adds `scripts/sera-chatgpt-artifact-download-v2.ps1` as a standalone troubleshooting helper.
- Keeps saved ChatGPT target continuity.
- Keeps `allowRandomRecentChatFallback=false`.
- Keeps `allowNewChatFallback=false`.
- Routes downloads to `13_chatgpt_downloads`.
- Rejects giant message containers.
- Clicks real anchor/button/download controls with strong expected-filename context.
- Prevents false proof pass after failed download.

## Manual ZIP download position

Manual ZIP download is not part of the desired autopilot path.

This phase may be bootstrapped using the already-proven Phase192 V2 artifact click method because it is installing the component responsible for future automatic downloads. After Phase193, Phase194 should prove one uninterrupted run from command JSON to final handoff without manual ZIP download, manual probe, or manual resume.

## Proof markers

```text
ARTIFACT_DOWNLOAD_V2_STRICT_CONTROL_SELECTOR
ARTIFACT_DOWNLOAD_V2_CLICK_RESULT
ARTIFACT_DOWNLOAD_V2_DOWNLOADED
ARTIFACT_DOWNLOAD_V2_PROOF_PASS
ARTIFACT_DOWNLOAD_V2_FALSE_SUCCESS_GUARD
NO_FALSE_PROOF_PASS_AFTER_FAILED_DOWNLOAD
PHASE193_ARTIFACT_DOWNLOAD_BRIDGE_V2_INTEGRATED
```

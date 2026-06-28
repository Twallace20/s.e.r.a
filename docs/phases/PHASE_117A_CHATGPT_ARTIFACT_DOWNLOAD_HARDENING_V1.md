# Phase 117A — ChatGPT Artifact Download Hardening v1

Phase 117A hardens the ChatGPT bridge download layer before full guarded autopilot.

It fixes the observed Phase 117 gap where the browser could reach the saved ChatGPT thread but the DOM downloader either clicked non-artifact text, failed to identify generic artifact download buttons, or downloaded outside the AutoOps intake folder.

## Adds

- Ancestor/context-based artifact candidate scoring.
- Generic ChatGPT `Download` button support when the surrounding artifact card mentions the expected ZIP.
- Pointer/mouse event click sequence for artifact controls.
- Download search fallback across AutoOps intake, normal Downloads, and the dedicated CDP profile Downloads folders.
- Safe move into `13_chatgpt_downloads` when Chrome saves to the wrong folder.

## Safety

The bridge still uses only the saved ChatGPT target. It does not select random chats and does not create a new-chat fallback. If it cannot identify a safe artifact candidate, it fails closed.

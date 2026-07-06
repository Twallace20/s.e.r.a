# Phase178 - Foreground Watcher JSON Drop Proof v1

## Purpose

Prove the Phase177 foreground command_inbox watcher by starting `SERA_WATCH_COMMAND_INBOX.ps1` once, then saving the Phase178 command JSON into `command_inbox` without manually running `SERA_RUN_UPLOADED_JSON_LOOP.ps1`.

## Expected behavior

1. The foreground watcher detects the new JSON file.
2. The watcher starts the existing JSON-only full loop.
3. The loop creates REQUEST_READY.
4. The browser bridge submits the prompt to ChatGPT.
5. The exact Phase178 ZIP is clicked and copied into `13_chatgpt_downloads`.
6. Direct ZIP closeout flattens nested overlay paths.
7. The verifier passes.
8. QA produces a fresh PASS_GUARANTEED.
9. Merge, tag, push, branch cleanup, and CLOSED_CLEANLY happen only after the required gates pass.

## Safety constraints

This phase adds no persistence. It does not enable scheduled tasks, login boot behavior, services, security setting changes, dependency installs, credentials, tokens, or paid services.

## Acceptance criteria

- `SERA_WATCH_COMMAND_INBOX.ps1` exists and points at the foreground watcher.
- The foreground watcher exists and invokes the full-loop script.
- Direct closeout keeps `Invoke-RequiredScript` gate semantics.
- A failed verifier or failed QA cannot continue into merge.
- A stale prior-phase handoff is not accepted as final evidence.
- The final handoff is current-phase only.

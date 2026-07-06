# Phase177 - Auto Inbox Trigger and Single Run Abort Guard v1

## Purpose

Remove the need to manually run the JSON-only full loop after saving a command JSON into `command_inbox`, while repairing single-run abort semantics so failed verifier, failed QA, missing script, or missing fresh `PASS_GUARANTEED` cannot be followed by merge or `CLOSED_CLEANLY`.

## What this phase adds

- `SERA_WATCH_COMMAND_INBOX.ps1`
- `scripts/sera-command-inbox-foreground-watcher-v1.ps1`
- Hardened direct ZIP closeout with `Invoke-RequiredScript`.
- Current-phase-only handoff selection.
- Stale handoff refusal.
- Fresh `VERIFY_PASS` before QA.
- Fresh `PASS_GUARANTEED` before merge.

## Safety

This phase adds an explicit foreground watcher only. It does not add persistence, services, credential handling, paid-service access, dependency installs, or security setting changes.

# Phase 165 — Production JSON Watcher Repo Integration v1

## Purpose

Phase165 promotes the JSON-to-closeout watcher pattern into the repo as a supported production workflow.

## Production Phone Flow

JSON upload -> REQUEST_READY prompt -> ChatGPT ZIP -> save/drop exact ZIP into 13_chatgpt_downloads -> automatic apply -> QA Guarantee -> merge approval -> closeout.

## Reliability Rule

The reliable continuation point is the exact ZIP in:

`C:\Users\18123\OneDrive\SERA-AutoOps\13_chatgpt_downloads`

The browser bridge is treated as optional convenience. If the bridge misses the artifact, the watcher writes WAITING_FOR_ZIP and keeps waiting for the exact ZIP.

## Command Inbox Hygiene

Invalid, malformed, example, stale, and already-closed command JSON files are archived into a safe archive folder. They are never deleted.

## QA Hard Stop

PASS_GUARANTEED is only valid after verifier success. QA_BLOCKED prevents MERGE_PENDING movement and prevents the closeout runner from starting.

## Included Scripts

- `scripts/sera-json-to-closeout-watcher-v1.ps1`
- `scripts/sera-command-inbox-hygiene-v1.ps1`
- `scripts/phase165-production-json-watcher-repo-integration-v1.ps1`
- `scripts/verify-phase165-production-json-watcher-repo-integration-v1.ps1`

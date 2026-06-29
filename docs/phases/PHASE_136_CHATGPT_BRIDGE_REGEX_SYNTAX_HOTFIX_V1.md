# Phase 136 — ChatGPT Bridge Regex Syntax Hotfix v1

Status: overlay ready

## Purpose

Repair the ChatGPT bridge submit/download script after the Phase 135 phone proof exposed a JavaScript syntax failure in `scripts/chatgpt-bridge-submit-download.mjs`.

## Failure Proven

The artifact watcher could not start the bridge because Node reported an invalid regular expression near the prompt line splitter. The failure happened before prompt submission, artifact retrieval, routing, or handoff.

## Fix

Replace the malformed split expression with a valid escaped CRLF/LF splitter:

```js
const lines = String(prompt || "").split(/\r?\n/);
```

## Validation

- `node --check scripts/chatgpt-bridge-submit-download.mjs`
- `node scripts/phase136-verify.mjs`
- `npm run sera:gate`

## Safety

This phase changes local bridge parsing only. It does not add dependencies, change credentials, activate paid services, change GitHub settings, or remove owner approval gates.

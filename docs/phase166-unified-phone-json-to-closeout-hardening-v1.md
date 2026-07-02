# Phase 166 — Unified Phone JSON-to-Closeout Hardening v1

## Purpose

Phase166 consolidates the Phase165 recovery lessons into a repo-supported production phone loop.

## Owner phone workflow

`JSON upload -> REQUEST_READY prompt -> ChatGPT ZIP -> exact ZIP in 13_chatgpt_downloads -> automatic apply -> QA Guarantee -> owner-approved merge -> closeout`

## Production rule

The exact ZIP in `C:\Users\18123\OneDrive\SERA-AutoOps\13_chatgpt_downloads` is the authoritative continuation point. The bridge remains optional convenience. If the bridge misses the artifact, the unified loop writes `WAITING_FOR_ZIP` and continues waiting without restarting the phase.

## Hardened failure modes

- browser bridge miss fallback;
- branch drift and local-main commit detection;
- normal native Git output on stderr under `$ErrorActionPreference = "Stop"`;
- empty/null PowerShell argument stripping before `Start-Process`;
- self-test command JSON cleanup;
- stale JSON archival;
- QA hard-stop protection.

## Included scripts

- `scripts/sera-native-command-helpers-v1.ps1`
- `scripts/sera-powershell-argument-builder-v1.ps1`
- `scripts/sera-unified-phone-json-to-closeout-v1.ps1`
- `scripts/phase166-unified-phone-json-to-closeout-hardening-v1.ps1`
- `scripts/verify-phase166-unified-phone-json-to-closeout-hardening-v1.ps1`

## Safety

This phase adds scripts, docs, and verifier coverage only. It does not enable startup persistence, scheduled tasks, credentials, tokens, paid services, GitHub/security settings mutation, or production deployment.

# Phase 138 Runtime Guard Installer Syntax Hotfix v1

## Purpose

Repair the Phase 138 runtime guard installer after it failed at runtime with a PowerShell `if` parsing error during `-InstallRuntimeGuard -Apply`.

## Root Cause

The installed script used inline `if` expressions in object/hash values and command arguments. Windows PowerShell treats `if` as a statement, not a value expression, in those positions, so the installer threw `The term 'if' is not recognized`.

## Change

This hotfix replaces those inline `if` expressions with normal precomputed variables before object construction or function invocation.

## Safety

- Preserves saved ChatGPT target only.
- Preserves no random/new-chat fallback.
- Does not alter credentials, tokens, external accounts, paid services, GitHub settings, or owner-control boundaries.
- Runtime guard installation remains an explicit owner-run command.

## Post-Apply Command

After merge/tag, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\phase138-artifact-watcher-generation-lease-expected-zip-fallback-v1.ps1 `
  -InstallRuntimeGuard `
  -Apply
```

# AutoOps R145 — Runtime Generation Lease + Watcher No-Refresh Enforcement v1

## Purpose

R145 patches the live S.E.R.A. AutoOps browser/artifact watcher path so ChatGPT prompt submission, generation, download, and ZIP routing are protected by a generation lease.

This is a reliability-lane phase. It is not the long-term product-roadmap Phase 145.

## Problem R145 fixes

The Phase 143 phone-autopilot smoke test proved the current browser watcher can still refresh, retry, or resubmit while ChatGPT is typing, generating, or waiting for a downloadable artifact. That creates duplicate prompts, missed downloads, stale handoff confusion, and blocked autopilot loops.

## Runtime behavior

R145 installs a wrapper around the scheduled task:

`SERA ChatGPT Artifact Watcher`

The wrapper enforces:

- one active generation lease
- no browser refresh while a lease is active
- no prompt resubmission while a lease is active
- exact expected ZIP observation and routing
- one deterministic needs-attention packet after lease expiration
- saved ChatGPT target only
- no random recent chat fallback
- no new-chat fallback

## Generation lease

The active lease file lives at:

`%OneDrive%\SERA-AutoOps\00_control_center\generation-lease.json`

Required fields:

- `schemaVersion`
- `commandId`
- `phase`
- `phaseSlug`
- `expectedZipName`
- `promptFile`
- `leaseStatus`
- `leaseStartedAt`
- `leaseExpiresAt`
- `lastObservedAt`
- `submittedAt`
- `downloadedAt`
- `routedAt`
- `completedAt`
- `failureReason`

## Owner diagnostic refresh flag

Automatic refresh is disabled by default. Browser refresh may only happen when the owner creates:

`%OneDrive%\SERA-AutoOps\00_control_center\ALLOW_BROWSER_REFRESH_DIAGNOSTIC.flag`

R145 does not create this flag.

## Apply pattern

After the overlay is applied and merged, install the runtime wrapper:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\autoops-r145-runtime-generation-lease-watcher-no-refresh-enforcement-v1.ps1 -Install
```

Then verify:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-autoops-r145-runtime-generation-lease-watcher-no-refresh-enforcement-v1.ps1 -RepoRoot .
```

## Safety boundaries

R145 does not alter external accounts, paid services, credentials, tokens, GitHub settings, GitHub security settings, or production deployments. It does not self-merge.

## Acceptance criteria

R145 only counts as complete after:

1. overlay files are applied to the repo;
2. verifier passes;
3. build/test/certify pass where applicable;
4. the R145 runtime wrapper is installed;
5. the scheduled watcher is confirmed to route through the R145 wrapper;
6. Phase 143 is retried with one controlled phone JSON command only.

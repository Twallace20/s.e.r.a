# Phase 162 — Runtime Handoff Completion + Snapshot Delivery v1

## Purpose

Phase 162 closes the remaining runtime handoff gaps found during Phase 161.

Phase 161 proved the safe development closeout chain:

```text
PASS
→ QA Guarantee
→ PASS_GUARANTEED
→ safe auto-approval
→ CLOSED_CLEANLY
```

Phase 162 hardens the layer that tells ChatGPT what happened. The system should not require manual hunting through old BLOCKED files, stale snapshots, or terminal scrollback.

## What this phase adds

Phase 162 adds `scripts/phase162-runtime-handoff-completion-snapshot-delivery-v1.ps1`, a runtime handoff finalizer. It is designed to be called by the command inbox sequencer, watchdog, QA Guarantee gate, and merge closeout runner.

It provides:

```text
terminal status resolver
CURRENT_CHATGPT_HANDOFF.md writer
ChatGPT review packet generator
snapshot bundle path attachment
latest snapshot path attachment
stale handoff rejection
duplicate stale BLOCKED mitigation
timeout finalization
nonzero exit on BLOCKED / QA_BLOCKED
safe auto-merge eligibility calculation
QA-approved merge wording
```

## Terminal statuses

The finalizer recognizes:

```text
PASS
BLOCKED
QA_BLOCKED
PASS_GUARANTEED
MERGE_PENDING
CLOSED_CLEANLY
```

For `BLOCKED` and `QA_BLOCKED`, it exits with a nonzero code after writing the current handoff packet. This is intentional. Later stages must not run after a terminal blocked state.

## Current handoff contract

Every terminal status writes:

```text
00_control_center/CURRENT_CHATGPT_HANDOFF.md
<runDir>/CURRENT_CHATGPT_HANDOFF.md
06_handoff/<phase>-<timestamp>-<status>.md
```

The packet includes:

```text
phase
phase number
branch
status
stage
expected ZIP
command JSON
selected JSON
run directory
snapshot bundle path
latest snapshot path
evidence path
created timestamp
safe auto-merge decision
owner boundary status
```

## Snapshot contract

The finalizer does not generate every snapshot itself. Instead, it guarantees that terminal handoffs point to the snapshot bundle and latest snapshot file already produced by the active run.

For timeouts, the finalizer can be called with:

```powershell
-Status BLOCKED -Stage bridge_timeout_10_minutes -Message "Bridge exceeded timeout ..."
```

The caller should stop the child process first, then call the finalizer. The finalizer writes the terminal packet, copies it to the current handoff file, and exits nonzero.

## Stale handoff protection

The finalizer includes selection logic for a later runtime reader:

```text
Prefer handoffs with LastWriteTimeUtc >= activeRunStartedUtc
Prefer terminal precedence:
CLOSED_CLEANLY > PASS_GUARANTEED > PASS > MERGE_PENDING > QA_BLOCKED > BLOCKED
Use latest write time as tie breaker
```

This prevents an old missing-ZIP BLOCKED file from being surfaced after a later PASS or CLOSED_CLEANLY exists.

## QA-approved merge wording

When a merge is approved by QA Guarantee safe auto-approval, closeout language should say:

```text
QA Guarantee-approved merge completed.
```

When the owner manually moves the merge file, closeout language can say:

```text
Owner-approved merge completed.
```

## Verifier

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\verify-phase162-runtime-handoff-completion-snapshot-delivery-v1.ps1
```

The verifier runs only simulated local cases. It does not call ChatGPT, does not require a ZIP, and does not touch credentials or production settings.

## Phase 163 readiness

After Phase 162 closes cleanly, the next full live loop test should prove:

```text
JSON command in command_inbox
→ always-on pickup or one-shot sequencer
→ canonical prompt/request/lease
→ ChatGPT artifact generation
→ exact ZIP download/capture
→ route/apply
→ PASS
→ QA Guarantee
→ PASS_GUARANTEED
→ safe auto-approval
→ CLOSED_CLEANLY
→ CURRENT_CHATGPT_HANDOFF.md surfaced back to ChatGPT
```

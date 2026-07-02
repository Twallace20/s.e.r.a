# Phase 161 — Full Loop Orchestrator + QA Guarantee Gate v1

## Purpose

Phase 161 consolidates the proven Phase160 path into a repeatable simulated phone workflow. It fixes the command inbox problem by treating `command_inbox` as a deterministic queue, not a folder where the newest JSON wins.

## Sequencing rule

The command inbox sequencer selects the smallest runnable phase number above the latest `CLOSED_CLEANLY` phase.

```text
latest CLOSED_CLEANLY phase = max(git phase-* tags, CLOSED_CLEANLY handoffs)
scan command_inbox/*.json
parse phaseStart, phase, phases[0], or phase number from filename
ignore disabled/emergencyStop commands
ignore phases <= latest CLOSED_CLEANLY
select the smallest remaining phase
run exactly one command
```

## Full loop

```text
JSON command in command_inbox
→ command inbox sequencer selects the next phase
→ canonical prompt is written to 15_bridge_outbox
→ artifact-watch-request.json is written
→ artifact-generation-lease.json is written
→ freshness guard verifies request/prompt match expected ZIP
→ ChatGPT bridge submits to saved ChatGPT target only
→ exact ZIP is downloaded to 13_chatgpt_downloads
→ watchdog routes ZIP to 01_apply_approved
→ AutoOps runner applies overlay and writes PASS/BLOCKED/CLOSED_CLEANLY
→ QA Guarantee inspects PASS and real-use evidence
→ PASS_GUARANTEED is created only when deliverables work as intended
→ safe auto-merge may move MERGE_PENDING to MERGE_APPROVED only after PASS_GUARANTEED and no owner boundary
```

## QA Guarantee gate

PASS means the overlay applied and validation completed. Phase 161 adds a stronger status:

```text
PASS_GUARANTEED = PASS + functional proof against the actual deliverables + captured evidence + safe-auto-merge eligibility evaluation
```

The gate requires proof that the phase works as intended, not just that syntax and repo tests passed.

## Owner-required boundaries

Auto-approval is blocked when any of these are present:

- credentials, tokens, or secrets
- paid services
- dependency or tool installs
- GitHub/security settings
- owner-control policy changes
- production deployments
- ambiguous requirements
- failed or partial QA Guarantee

## Runtime snapshots and timeouts

The orchestrator writes snapshots to:

```text
00_control_center/single_flow_runs/<runId>/snapshots/
```

The snapshots capture active command JSON, request/lease state, download/apply folder state, handoff state, git status, and recent head commits.

Fast stages are designed to fail safely. When a timeout is reached, the child process is stopped, a `BLOCKED` handoff is written, and the ChatGPT review packet is copied to the clipboard.

## Verification

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-phase161-full-loop-orchestrator-qa-guarantee-gate-v1.ps1
```

The verifier runs real-use fixture cases:

1. command sequencing with multiple JSON files
2. fresh prompt/request/lease creation
3. stale request rejection
4. BLOCKED handoff creation
5. PASS to PASS_GUARANTEED promotion
6. owner-required boundary blocking safe auto-merge

# Phase 142 — AutoOps Extraction Intake Self-Test + Continuation Queue v1

## Purpose

Phase 142 converts the current phone-to-AutoOps workflow from a fragile one-off chain into a guarded continuation system. It addresses the exact problems observed across Phases 139–141: duplicate generation, stale handoff completion, branch reuse failures, ZIP routing confusion, and the AutoOps extraction/manifest lookup block that had to be manually rescued.

The goal is not fully unattended autonomy yet. The goal is a safe phone-driven operating loop where one phase or a sequential batch can run until it finishes or blocks, and every blocked state produces enough evidence to close it cleanly in the same ChatGPT conversation.

## Operating Model

Phone autopilot is allowed in two guarded modes:

1. **Single phase mode**
   - One JSON command requests one phase.
   - The workflow runs until PASS, CLOSED_CLEANLY, or BLOCKED.
   - A BLOCKED handoff pauses all further work.

2. **Sequential batch mode**
   - One JSON command can list multiple phases.
   - Only one phase is active at a time.
   - The next phase starts only after the current phase is CLOSED_CLEANLY.
   - The batch stops immediately on BLOCKED.

Unattended multi-phase execution remains disabled until the queue proves it can handle blocked states and continuation packets safely.

## Required Fixes

### 1. ZIP extraction self-test before branch creation

AutoOps must verify the ZIP is structurally valid before changing git state.

Required checks:

- The ZIP opens successfully.
- The ZIP contains root `repo/`.
- The expected manifest exists at:
  `repo/.overlay/phase142_autoops_extraction_intake_self_test_continuation_queue_v1.json`
- The expected proof, docs, runtime script, and verifier are present.
- The expected ZIP filename matches the manifest.
- If any check fails, AutoOps writes a BLOCKED packet with a content listing and does not create or switch branches.

### 2. Branch idempotency

If a work branch already exists:

- Switch to the branch when it is clean.
- Reuse it when it points at the expected base or can be fast-forwarded safely.
- Block when it is dirty or diverged unexpectedly.
- Never fail solely because `git switch -c` found an existing branch.

### 3. One-active-command lock

The system must never process multiple phase commands at once.

Required fields:

- `activeCommandId`
- `activePhase`
- `activeRunNonce`
- `expectedZipFilename`
- `startedAt`
- `status`

A second command blocks or waits until the active command is CLOSED_CLEANLY, BLOCKED, or explicitly archived.

### 4. Continuation packet after BLOCKED

A BLOCKED handoff must be treated as a continuation packet, not a dead end.

The packet must include:

- phase slug;
- command ID;
- run nonce;
- expected ZIP filename;
- current branch;
- last safe git state;
- failure reason;
- recovery recommendation: fixed overlay, hotfix overlay, manual rescue, or rollback;
- exact files/folders involved.

### 5. Sequential queue behavior

Batch JSON support is allowed only with strict stop rules:

```json
{
  "mode": "phase_batch",
  "phases": [142, 143, 144],
  "stopOnBlocked": true,
  "requireClosedCleanlyBeforeNext": true,
  "oneActiveCommandOnly": true
}
```

The queue must pause on BLOCKED and wait for a new owner/ChatGPT continuation before moving forward.

### 6. Stale handoff protection

Fresh commands cannot be completed by old handoffs.

A handoff only matches a command when all of these match:

- `commandId`
- `expectedZipFilename`
- `runNonce`
- `phaseSlug`

Phase-only matching is not enough.

### 7. Download and routing proof

The workflow cannot mark a browser/phone run successful until it can show:

- expected ZIP filename;
- final local path;
- SHA256;
- whether the file was moved or copied;
- source folder;
- destination folder;
- file-stability check;
- routing timestamp.

`13_chatgpt_downloads` is a capture/source folder. `01_apply_approved` is the normal overlay apply queue. A source copy may remain in downloads, but routing evidence must make that explicit.

## Safety Boundaries

- Saved ChatGPT target only.
- No random recent-chat fallback.
- No new-chat fallback.
- No credentials.
- No tokens.
- No paid services.
- No external account changes.
- No GitHub settings changes.
- No owner-control boundary changes.
- No self-merge.
- No production deployment.
- No silent auto-merge without approval source evidence.

## Acceptance Criteria

Phase 142 passes when the repository contains the manifest, proof file, documentation, runtime helper, and verifier, and the verifier confirms:

- extraction self-test before branch creation;
- branch-exists idempotency;
- one-active-command lock;
- continuation packet after BLOCKED;
- sequential queue support with stop-on-block;
- stale handoff protection;
- download/routing proof requirements;
- safety gates are preserved.

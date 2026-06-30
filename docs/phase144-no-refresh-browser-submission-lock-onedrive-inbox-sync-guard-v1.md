# Phase 144 — No-Refresh Browser Submission Lock + OneDrive Inbox Sync Guard v1

## Purpose

Phase 144 converts the Phase 143 failed phone smoke test into a concrete reliability guard. The failure pattern was not a repo-build problem. The browser watcher refreshed or retried while ChatGPT was still being typed/generating, the artifact did not reach a stable download state, and the OneDrive command inbox appeared to hydrate only after the owner opened it.

## Required Behavior

S.E.R.A. treats phone autopilot as a guarded pipeline, not a refresh loop.

1. A phone JSON command is accepted only after the file is fully local, readable, and stable across repeated size/hash checks.
2. Phone Control may submit exactly one prompt for a command id.
3. The Artifact Watcher observes during an active generation lease; it does not refresh or resubmit while typing, submitting, generating, or waiting for a download.
4. Refresh is a last-resort diagnostic action, not a normal retry mechanism.
5. Duplicate prompt submission, duplicate expected ZIP generation, or a lease expiry without an artifact produces a deterministic NEEDS_ATTENTION/BLOCKED packet.
6. Download success requires the exact expected ZIP filename, a stable file size, and routing evidence.
7. Hotfix overlays are allowed through manual download/routing until the browser path proves reliable.
8. Batch autopilot remains stop-on-block and one-active-command only.

## OneDrive Inbox Sync Guard

The command inbox must not process cloud-placeholder or partially hydrated files. A command file should be considered ready only when all of the following are true:

- The file exists locally.
- It can be opened exclusively or read consistently.
- Its size is greater than zero.
- Its size and hash are unchanged across a short stability window.
- The JSON parses successfully.
- The command id has not already been accepted.

## Browser No-Refresh Lease

When Phone Control begins typing/submitting a prompt, it must create or update a generation lease. While that lease is active:

- The Artifact Watcher must not refresh the page.
- The Artifact Watcher must not resubmit the prompt.
- The Artifact Watcher must not switch to a random/recent/new chat.
- The Artifact Watcher may only observe, detect the exact expected ZIP, route completed downloads, or emit a blocked packet when the lease expires.

## Acceptance Criteria

- No refresh while prompt typing is active.
- No refresh while generation lease is active.
- No duplicate prompt submission for the same command id.
- OneDrive command files are hydrated/stable before acceptance.
- Exact expected ZIP detection is required.
- Stable downloaded ZIP evidence is required before routing.
- Stale handoffs cannot close a fresh command.
- Blocked handoffs preserve enough evidence to continue cleanly.

## Safety Gates

This phase preserves all safety gates:

- Saved ChatGPT target only.
- No random recent chat fallback.
- No new-chat fallback.
- No credentials or token access.
- No paid services.
- No external account changes.
- No GitHub/security/settings mutations.
- No owner-control boundary changes.
- No production deployment.
- No self-merge.

## Result

After Phase 144, the next phone autopilot test should be retried as a controlled smoke test. If it blocks, the block should be deterministic and useful instead of caused by premature refresh/retry behavior.

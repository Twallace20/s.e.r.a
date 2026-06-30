# Phase 141 — Browser Duplicate Generation Lock + Download Completion Guard v1

## Purpose

Phase 141 fixes the reliability gap observed after Phase 140: the ChatGPT browser flow can generate the same overlay more than once, and the workflow can fail to capture or route the downloaded artifact cleanly. This phase turns duplicate generation and missing download completion into deterministic blocked states instead of ambiguous or silent failures.

## Problem Observed

During the Phase 139 retry path, the requested overlay was generated twice. The artifact existed, but the expected local download/routing flow did not complete cleanly. The system also showed earlier false-complete behavior when a fresh command was matched against an old Phase 139 handoff.

## Required Runtime Behavior

1. **Prompt submission lock**
   - A command may submit exactly one prompt for a given `commandId`, `phase`, and `expectedZipFilename`.
   - Once `promptSubmittedAt` is recorded, the Phone Control Watcher cannot resubmit the prompt unless a new owner-approved command ID is created.
   - Duplicate prompt attempts create a blocked packet.

2. **Generation lease**
   - The Artifact Watcher must treat active generation as a lease window.
   - During the lease, it must not refresh, navigate away, or resubmit.
   - Lease expiry without the expected ZIP creates a blocked packet.

3. **Single expected ZIP source of truth**
   - The expected ZIP filename must be read from one canonical field.
   - Alternate filenames for the same phase are blocked.
   - For Phase 139 history, the rejected alternate filename is:
     `s.e.r.a_phase139_full_autopilot_browser_workflow_smoke_test_v1_overlay.zip`

4. **Download completion evidence**
   - A browser workflow cannot be marked successful until the expected ZIP exists locally, has stopped changing, and has a SHA256 hash.
   - `13_chatgpt_downloads` is a source/capture folder.
   - Routing to `01_apply_approved` or `02_hotfix_approved` must record whether the file was copied or moved.
   - Source copies may remain in `13_chatgpt_downloads`, but the routing evidence must explicitly show the destination.

5. **Stale handoff protection**
   - Fresh commands cannot be completed by old handoff files from the same phase.
   - A handoff only matches a command when it carries the current command ID, expected ZIP filename, and run nonce.

6. **Merge approval source evidence**
   - Auto-merge must record whether the approval source was manual owner movement, safe auto-merge policy, or another approved path.
   - Silent auto-merge without approval source evidence is blocked.
   - Existing S.E.R.A. safety gates remain in force.

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

## Acceptance Criteria

Phase 141 passes when the repository contains the manifest, proof file, runtime helper, and verifier, and the verifier confirms:

- duplicate prompt submission is defined as blocked;
- generation lease is required;
- stale handoff completion is forbidden;
- download-completion evidence is required;
- expected ZIP matching is canonical;
- merge approval source evidence is required;
- safety gates are preserved.

# Phase 140 — Safe Autopilot Recovery + Branch-Idempotent Intake v1

## Decision

Phase 139 is no longer a clean namespace for the next reliability step. It already contains a closed hotfix branch, stale handoff history, duplicate browser generation evidence, and a normal overlay attempt that blocked because the Phase 139 work branch already existed.

The next reliability overlay therefore moves to **Phase 140**.

## Purpose

Phase 140 formalizes the recovery rules needed before more phone-to-browser autopilot tests:

1. Branch creation must be idempotent.
2. Stale handoffs must not falsely complete new commands.
3. Duplicate artifact generation must become a deterministic blocked state with evidence.
4. Download routing semantics must be explicit.
5. Saved ChatGPT target rules must remain strict.

## Why the ZIP can remain in 13_chatgpt_downloads

`13_chatgpt_downloads` is the capture/source folder for files downloaded from ChatGPT. Routing a normal overlay to `01_apply_approved` can be implemented as a **copy** operation. When copy routing is used, the source ZIP correctly remains visible in `13_chatgpt_downloads`.

This is not a failure by itself. The failure occurs only if the same source copy is repeatedly reprocessed without a processed marker, archive move, or idempotency guard.

## Branch idempotency rule

A normal apply must not fail solely because a work branch already exists.

Safe behavior:

- If the target branch exists and is clean, switch to it.
- If the branch exists but belongs to a different purpose, stop with a clear blocked packet and recommend a unique phase or rerun branch.
- If a remote branch exists from a closed hotfix, use a new phase namespace instead of reusing the polluted branch name.

For this sequence, Phase 140 replaces the polluted Phase 139 namespace.

## Stale handoff isolation rule

A command must never mark itself complete from an unrelated prior handoff.

A completion handoff must match all relevant values:

- Current command id
- Current phase id
- Current expected ZIP filename
- Current run evidence path
- Current run timestamp window

A previous `CLOSED_CLEANLY` file for a hotfix is historical evidence only.

## Duplicate generation rule

If ChatGPT artifact generation happens twice for the same expected ZIP, the workflow has not proven the no-duplicate browser flow.

The correct state is:

`BLOCKED_WITH_EVIDENCE`

The workflow should freeze browser watchers, capture the duplicate event, and route any usable artifact manually only after owner approval.

## Safety gates

Phase 140 preserves:

- Saved ChatGPT target only
- No random chat fallback
- No new-chat fallback
- No credentials
- No tokens
- No paid services
- No GitHub settings mutation
- No owner-control boundary changes
- No self-merge
- No production deployment

## Acceptance criteria

Phase 140 passes when the verifier confirms:

- The overlay uses the Phase 140 namespace.
- Branch idempotency guidance exists.
- Stale handoff isolation guidance exists.
- Duplicate generation handling guidance exists.
- Download routing copy-vs-move semantics are documented.
- Safety gates remain in force.

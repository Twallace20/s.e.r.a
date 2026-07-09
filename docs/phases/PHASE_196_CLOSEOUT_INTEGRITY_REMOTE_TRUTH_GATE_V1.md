# Phase 196 - Closeout Integrity Remote Truth Gate v1

## Purpose

Phase196 hardens S.E.R.A. closeout integrity so `CLOSED_CLEANLY` can only be written after the full local and remote truth chain has passed. It also codifies the Phase195/Phase196 lesson: a stale active command must never continue after the router or unified runonce changes the active phase identity.

## Required closeout truth chain

A phase may only close cleanly when all of the following are true for the same phase slug, expected ZIP, command id, and run nonce:

1. Exact expected ZIP exists and, when supplied, matches the expected SHA256.
2. Verifier passed for the current phase.
3. QA passed for the current phase and did not run before the verifier.
4. Merge completed only after verifier and QA passed.
5. `main` was pushed only after merge succeeded.
6. The phase tag was created or moved only after merge succeeded.
7. Remote `origin/main` points at the same commit as local `HEAD`.
8. Local tag and remote tag point at the same verified commit.
9. Final handoff identity includes the current phase, phase slug, tag, local head, remote main, local tag commit, remote tag commit, verifier handoff, QA handoff, and exact ZIP SHA.

## Hard-stop behavior

The gate blocks instead of continuing if any required step fails. In particular:

- QA must not run after a verifier failure.
- Merge, tag, push, cleanup, pasteback, and `CLOSED_CLEANLY` must not run after verifier or QA failure.
- Manifest hash drift must either be handled by an explicit manifest repair step before final verification or result in `BLOCKED`.
- Git calls must not rely on helper/splat behavior that can degrade into plain `git`.

## Active command identity baseline

Phase196 acknowledges and verifies the `PHASE196_ACTIVE_COMMAND_IDENTITY_GUARD` baseline in `SERA_WATCH_COMMAND_INBOX.ps1`. That guard prevents stale Phase195 metadata from continuing after Phase196 request generation by returning `SKIPPED_STALE` and returning to watch.

## Test data for Phase197 confidence

The overlay includes fixture-driven tests and a PowerShell proof script. The fixture cases simulate verifier failure, QA failure, remote main mismatch, remote tag mismatch, wrong-phase handoff identity, and a valid all-pass closeout. Phase197 can reuse these fixtures as part of its full autopilot proof.

# Legacy Browser Automation Retirement

## Status

Retired from active S.E.R.A. architecture.

## Decision

The AutoOps R145–R150 browser, phone-watcher, generation-lease, prompt-submission, expected-ZIP, and artifact-routing subsystem is no longer part of the permanent S.E.R.A. runtime.

These mechanisms depended on:

- ChatGPT browser automation
- saved-chat targeting
- artifact ZIP generation and downloading
- OneDrive command transport
- scheduled watcher wrappers
- phase-specific handoff and lease files

S.E.R.A.'s permanent architecture is local-first and capability-based. ChatGPT, Codex, browsers, OneDrive, ZIP overlays, and remote Git are optional external adapters rather than runtime requirements.

## Why the tests were retired

The implementation had already been intentionally disabled by the Phase 178 foreground-watcher safety cleanup, but older R145–R150 tests continued asserting that the disabled behavior remained active.

Those tests therefore enforced obsolete behavior and prevented the repository from accurately representing its current architecture.

## Preservation policy

The disabled scripts remain temporarily as historical stubs until the Repository Truth milestone completes a caller and dependency inventory.

They must not be restored to active production behavior.

After dependency analysis, each related script will be classified as:

- failure fixture
- legacy reference
- reusable safety concept
- removable dead code

## Replacement proof

The active architecture is now governed by shared execution contracts and terminal attempt states.

A BLOCKED or FAILED attempt cannot transition to validation, certification, completion, commit, merge, or closeout.

The governing regression test is:

`tests/integration/control-plane-terminal-state.test.ts`

# Phase 134 — Phone Control Job Syntax Hotfix v1

## Purpose

Repair the phone-control job syntax regression found by the real phone-triggered Phase 134 test.

## Real-life failure

The phone command reached `running`, then the Node runner exited immediately before creating a bridge outbox prompt or handoff. Evidence showed a JavaScript syntax error in `scripts/sera-phone-control-job.mjs` where a multiline string literal was accidentally emitted inside `.join(...)`.

## Fix

The runner detail join separator is now escaped as `"\r\n"`, keeping the file valid JavaScript and preserving detailed runner diagnostics in future blocked commands.

## Proof of use

The phase verification script checks the patched job file with `node --check` and verifies the escaped join separator is present.

# Unified Control Plane v1

Unified Control Plane v1 is a permanent Runtime-layer subsystem for local attempt coordination.

It owns typed attempt specifications, stage execution records, gate decisions, evidence validation, terminal decision precedence, verification, and closeout records. It does not run shell commands, perform Git actions, invoke models, use the network, install packages, merge, push, tag, or begin SQLite Runtime State.

## Commands

```bash
npm run sera -- control-plane inspect
npm run sera -- control-plane run --spec <relative-json-file>
npm run sera -- control-plane verify --attempt <attempt-id-or-relative-path>
npm run sera -- control-plane closeout --attempt <attempt-id-or-relative-path>
```

## Runtime Output

Control Plane writes generated runtime evidence under `.sera/control-plane/`:

- `attempts/<attempt-id>/attempt.json`
- `attempts/<attempt-id>/specification.json`
- `attempts/<attempt-id>/stage-results.json`
- `attempts/<attempt-id>/evidence-index.json`
- `attempts/<attempt-id>/gate-results.json`
- `attempts/<attempt-id>/terminal-decision.json`
- `attempts/<attempt-id>/closeout.json`
- `attempts/<attempt-id>/events.jsonl`
- `attempts/<attempt-id>/final-report.md`
- `current.json`
- `summary.json`

All persistent paths are repository-relative. Outputs include schema/version, source baseline, model/network flags, warnings, errors, terminal state, evidence, and closeout status.

## Terminal Authority

Terminal decisions use this precedence:

1. owner cancellation
2. fatal Control Plane failure
3. required stage failure
4. required gate failure
5. required evidence missing
6. blocked dependency or permission
7. completed with warnings
8. completed

Required stage and gate failures stop dependent work. Stages marked `safeAfterFailure` may still run finalization evidence.

## Snapshot And Truth Dependency

Control Plane consumes Repository Snapshot and Repository Truth as baseline evidence. It does not duplicate their scanners or classifiers.

When both are required, the sequence is always:

1. `npm run sera -- repository snapshot`
2. confirm completion
3. `npm run sera -- repository truth`
4. confirm completion

Truth warnings do not block by default. A gate can block selected Truth severities through explicit policy.

## Gate Types

Supported gate types are:

- `precondition`
- `permission`
- `capability`
- `execution`
- `verification`
- `evaluation`
- `repeatability`
- `safety`
- `owner-approval`
- `closeout`

## Reference Executor

The v1 reference executor is intentionally narrow:

- emits structured evidence
- validates file existence inside the repository
- compares hashes
- records warnings
- records deterministic failure, block, timeout, and cancellation states
- records no-op stages

It normalizes child outcomes so stderr alone is not failure and exit code alone is not objective success.

## Certification Coverage

Primary evidence:

- `packages/control-plane/src/control-plane.ts`
- `tests/control-plane-v1.test.ts`
- `packages/certs/src/certify.ts`

Certified behaviors include schema validity, required artifact output, portable paths, Snapshot/Truth baseline consumption, terminal precedence, required evidence validation, hash verification, bounded retries, blocked handoff, fail-fast dependency handling, safe-after-failure finalization, closeout separation, inspect reporting, no model use, and no network use.

## Limitations

- No shell command execution.
- No Git merge, push, tag, reset, stash, or branch operation.
- No SQLite Runtime State.
- Owner approval is represented by explicit spec fields in v1.
- Legacy phase, browser, OneDrive, and ZIP workflows remain evidence only and cannot override terminal decisions.

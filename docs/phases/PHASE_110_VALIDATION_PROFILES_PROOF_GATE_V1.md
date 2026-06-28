# Phase 110 — Validation Profiles + Proof Gate v1

## Purpose

Create the efficient validation layer required before S.E.R.A. autopilot can run in batches without repeating the same expensive test/certify/verify chain multiple times.

## What this phase adds

- `npm run sera:quick` for fast phase apply/repair feedback.
- `npm run sera:gate` as the single merge-safe validation command.
- `npm run sera:milestone` for batch-level deep validation.
- `npm run certify:artifacts` so the gate can certify artifacts without re-running the full build/test chain through the old `certify` script.
- Proof-of-use pass registry logic.
- Proof demotion rules after three clean gate passes when related files did not change.
- Safe pending-to-approved decision logic for later AutoOps automation.

## Validation policy

The future AutoOps runner should stop stacking:

```text
npm test
npm run certify
npm run verify
```

Instead, after this phase closes, the local runner should call:

```text
npm run sera:gate
```

`sera:gate` performs the merge-safe checks once:

```text
hygiene
free-core covenant
knowledge source map
build
full test suite once
certification artifact check
proof-of-use
phase110 profile verification
```

## Proof-of-use policy

Proof-of-use should not disappear. It can be demoted from every-phase execution only when:

1. The proof passed at least three successful gates.
2. Related source, fixture, package, or shared files did not change.
3. The current run is not a milestone run.

Milestone validation keeps the deeper proof suite active.

## Pending-to-approved workflow

This phase introduces the decision model for moving a merge packet from:

```text
09_merge_pending
```

to:

```text
03_merge_approved
```

That file move should only happen automatically when policy allows safe auto-merge and pass/gate/proof/rollback/branch/no-needs-attention/no-newer-blocked gates all pass.

This phase does not perform the real move. The real file mover belongs in the local AutoOps runner patch after Phase 110 closes cleanly.

## Safety

This phase does not execute ChatGPT browser automation, Git pushes, tag creation, remote branch deletion, dependency installs, token access, credential handling, paid services, or self-approval outside policy.

# Phase 7 — Active Lessons + Regression Rules v1

## Purpose

Phase 7 creates the first governed bridge from approved lessons to cert-checkable guardrails. Approved lessons can now be activated into auditable regression rules, checked for traceability, and deactivated when they are no longer valid.

## What Changed

- Added active lesson records in `.sera-memory/active-lessons.jsonl`
- Added regression rule records in `.sera-memory/regression-rules.jsonl`
- Added activation/deactivation decision records in `.sera-memory/lesson-activation-decisions.jsonl`
- Added activation and deactivation methods to `@sera/memory`
- Added kernel methods for lesson activation and regression rule checks
- Added CLI commands for active lessons and regression rules
- Added integration tests for activation, duplicate blocking, deactivation, and rule checks
- Upgraded certification level to `active-lessons-v1`

## Safety Rules

- Pending lesson candidates cannot be activated.
- Rejected lesson candidates cannot be activated.
- Missing approved lessons cannot be activated.
- Already active lessons cannot be activated twice.
- Activation requires a human rationale.
- Deactivation requires a human rationale.
- Active lessons do not silently change runtime behavior.
- Regression rules are evidence guardrails, not autonomous policy rewrites.

## New Commands

```bash
npm run sera -- lessons active
npm run sera -- lessons rules
npm run sera -- lessons activations
npm run sera -- lessons activate <approved-lesson-id> "Use as a regression guardrail."
npm run sera -- lessons deactivate <active-lesson-id> "No longer valid."
npm run sera -- lessons check-rules
```

## Certification

Phase 7 is certified when:

- approved lessons can be activated as regression rules
- duplicate or missing activations are blocked
- active regression rules pass traceability checks
- active lessons can be deactivated
- summaries count active and inactive state correctly
- all prior phase certs still pass

Certified level: `active-lessons-v1`.

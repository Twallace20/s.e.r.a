# Phase 97 — Branch Validation Evidence Runner v1

## Purpose

Phase 97 gives S.E.R.A. an approved validation evidence layer for branch-scoped edits. It consumes the Phase 96 branch edit executor pattern and proves that edited branch workspace output can be validated, recorded, and prepared for owner review without granting merge, push, direct project source mutation, or arbitrary command power.

## What Phase 97 Adds

- Owner-approved branch validation suite catalog.
- Branch workspace output validation evidence packet.
- Safe `work/` branch name checks.
- Safe relative target file checks.
- Branch workspace containment checks.
- Expected post-edit SHA-256 validation.
- Expected content-marker validation.
- Validation result records for each check.
- Evidence manifest with prior phase chain.
- Failure evidence for validation mismatch.
- Read-only validation posture after demo fixture preparation.
- Multi-language production doctrine preservation.

## Safety Boundaries

Phase 97 allows evidence generation for approved branch workspace validation. It does not allow:

- Direct project repository source mutation.
- Branch workspace mutation during validation.
- Real local Git branch creation.
- Remote branch creation.
- Git push.
- Merge.
- Arbitrary validation commands.
- Shell execution.
- Scheduler, workflow, or iPhone automation mutation.
- Fleet or away-mode execution.
- Self-approval.
- Self-merge.
- Self-deploy.

## Demo Scope

The demo validates the Phase 96 branch edit executor output in an isolated runtime branch workspace. It checks that `src/phase96-demo.ts` contains the approved post-edit content, matches the expected SHA-256 hash, and records a branch validation evidence packet.

## Completion Criteria

Phase 97 is complete when:

- `npm run phase97:demo` passes.
- `npm run phase97:verify` passes.
- `npm run hygiene` passes.
- `npm run build` passes.
- `npm test` passes with the Phase 97 integration tests included.
- `npm run certify` passes.
- `npm run verify` passes.
- The work branch is merged to `main` by the owner.
- The tag `phase-97-branch-validation-evidence-runner-v1` exists.

## Strategic Meaning

Phase 97 is the bridge between branch workspace editing and merge readiness. S.E.R.A. is no longer only proving that she can apply approved branch-scoped edits; she can now prove that those edits produced validated evidence that an owner can review before merge preparation begins.

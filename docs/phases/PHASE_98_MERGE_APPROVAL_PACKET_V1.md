# Phase 98 — Merge Approval Packet v1

## Purpose

Phase 98 gives S.E.R.A. an owner-reviewable merge approval packet layer. It consumes the Phase 97 branch validation evidence pattern and packages merge readiness, risk, rollback expectations, and evidence lineage without granting merge execution, push, tag, or direct project source mutation power.

## What Phase 98 Adds

- Owner-approved merge approval packet catalog.
- Phase 97 branch validation evidence linkage.
- Safe `work/` target branch checks.
- Safe relative target file checks.
- Merge readiness checklist.
- Final owner merge approval requirement.
- Risk summary for owner review.
- Rollback plan declaration for future merge execution.
- Evidence manifest with prior phase chain.
- Multi-language production doctrine preservation.

## Safety Boundaries

Phase 98 allows merge approval packet generation only. It does not allow:

- Direct project repository source mutation.
- Branch workspace mutation.
- Real local Git branch creation.
- Remote branch creation.
- Git push.
- Merge execution.
- Tag creation.
- Arbitrary commands.
- Shell execution.
- Scheduler, workflow, or iPhone automation mutation.
- Fleet or away-mode execution.
- Self-approval.
- Self-merge.
- Self-deploy.

## Demo Scope

The demo generates a merge approval packet for the Phase 96 branch edit executor output validated by Phase 97. It writes source validation evidence and a merge approval packet into runtime evidence only.

## Completion Criteria

Phase 98 is complete when:

- `npm run phase98:demo` passes.
- `npm run phase98:verify` passes.
- `npm run hygiene` passes.
- `npm run build` passes.
- `npm test` passes with the Phase 98 integration tests included.
- `npm run certify` passes.
- `npm run verify` passes.
- The work branch is merged to `main` by the owner.
- The tag `phase-98-merge-approval-packet-v1` exists.

## Strategic Meaning

Phase 98 is the bridge between validation evidence and owner-approved merge execution. S.E.R.A. can now prepare the packet an owner needs to decide whether a branch should be merged, while still being unable to merge, push, tag, or self-approve.

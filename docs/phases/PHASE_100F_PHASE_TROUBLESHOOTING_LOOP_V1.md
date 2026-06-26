# Phase 100F — Phase Troubleshooting Loop v1

## Purpose

Phase 100F adds a diagnostic troubleshooting loop for failed phase applications. It reads the Phase 100E apply queue lineage, captures failed phase symptoms, summarizes likely causes, drafts owner-reviewable repair guidance, preserves rollback guidance, and writes diagnostic evidence.

## What This Adds

- Phase 100E apply queue lineage.
- Diagnostic evidence packets for failed phase applications.
- Repair guidance manifests for owner review.
- Failed case capture across Phase Factory 100A through 100H.
- Symptom summaries, likely cause summaries, evidence links, validation references, and rollback guidance.
- Multi-language production doctrine preservation.

## Safety Boundaries

Phase 100F is diagnostic-only. It does not autofix, apply overlays, execute patches, mutate project source, create real branches, merge, push, tag, execute shell commands, mutate scheduler/workflow/iPhone automation, execute fleet or away mode, self-approve, self-merge, self-deploy, or deploy to production.

## Completion Criteria

Phase 100F is complete when:

1. `npm run phase100f:demo` passes.
2. `npm run phase100f:verify` passes.
3. `npm run hygiene` passes.
4. `npm run build` passes.
5. `npm test` passes.
6. `npm run certify` passes.
7. `npm run verify` passes.
8. The owner-approved branch is merged, tagged, pushed, and cleaned.

# Phase 94 — Approved Branch Plan Generator v1

## Purpose

Phase 94 converts isolated Phase 93 branch workspace proof into a structured branch plan packet that an owner can review before S.E.R.A. is allowed to create a real branch in a later phase.

This phase also formalizes the Sandbox Learning Doctrine: ambitious domains should not be dismissed just because they are hard. They should be studied, practiced in a safe workspace or simulator, documented, refined, attempted again, validated, and escalated to human expert review when physical, legal, safety-critical, or high-risk.

## What this phase adds

- Exact owner-approved branch plan generation catalog.
- Branch plan JSON artifact.
- Branch plan Markdown artifact.
- Sandbox Learning Doctrine artifact.
- Exact safe `work/` branch name validation.
- Base ref declaration without moving refs.
- Target file declaration.
- Planned change summaries.
- Validation suite declaration.
- Rollback plan declaration.
- Evidence packet declaration.
- Revenue Acceleration Track preservation.
- Ambitious sandbox domain preservation.
- Operator console status and safety gates.

## Sandbox Learning Doctrine

S.E.R.A. should be allowed to attempt ambitious domains through safe practice loops:

1. Study the domain.
2. Create notes.
3. Design safe practice tasks.
4. Attempt in sandbox.
5. Record evidence.
6. Refine notes.
7. Try again.
8. Validate.
9. Escalate when risky.
10. Graduate by approval.

This applies to iOS apps, websites, realistic AI video, AAA-style game prototypes, films, robotics, circuitry, solar/electronics, AI content engines, and business/revenue systems.

## Explicit non-goals

Phase 94 does not create real local Git branches, create remote branches, push to Git remotes, execute patches, mutate repository source, run arbitrary validation commands, create schedulers, mutate workflows, create iPhone automations, execute fleet/away work, self-approve, self-merge, or self-deploy.

## Completion criteria

- `npm run phase94:demo` passes.
- `npm run phase94:verify` passes.
- The generated plan artifact exists under `.sera-approved-branch-plan-generator/`.
- Tests confirm missing approval, self-approval, unsafe branch names, source mutation, real branch creation, and missing doctrine all fail closed.

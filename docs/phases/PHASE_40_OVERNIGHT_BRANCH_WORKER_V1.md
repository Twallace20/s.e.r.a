# Phase 40 — Overnight Branch Worker v1

## Purpose

Phase 40 adds the first local overnight branch worker contract/runtime.

This phase does not run overnight work. It defines the worker plan, required inputs, safety bindings, and owner-review handoff that a future overnight branch worker must satisfy before execution authority is introduced.

## Adds

- Local overnight branch worker runtime.
- Required worker step model.
- Phase packet binding requirement.
- Branch proposal binding requirement.
- Branch readiness binding requirement.
- Remote runner blueprint binding requirement.
- Owner approval queue binding requirement.
- Command allowlist binding requirement.
- Evidence capture bundle binding requirement.
- Emergency stop and session lock requirements.
- Overnight worker JSON report.
- Overnight worker Markdown report.
- History log under `.sera-overnight-branch-worker/`.

## Required worker stages

- Owner approval intake.
- Clean main preflight.
- Phase packet ingestion.
- Branch proposal ingestion.
- Branch readiness confirmation.
- Remote runner blueprint binding.
- Owner approval queue binding.
- Self-hosted adapter binding.
- Command allowlist binding.
- Evidence capture bundle binding.
- Dry-run validation sequence plan.
- Worker artifact plan.
- Emergency stop readiness.
- Session lock readiness.
- Owner review handoff.

## Safety boundaries

Phase 40 does not:

- Activate overnight execution.
- Execute commands.
- Connect to a runner.
- Activate a runner.
- Use a cloud runner.
- Use a self-hosted runner.
- Require secrets.
- Store secrets.
- Mutate source.
- Create branches.
- Switch branches.
- Push branches.
- Open pull requests.
- Apply patches.
- Merge branches.
- Tag releases.
- Delete branches.
- Record owner decisions.
- Accept evidence as owner approved.
- Self-approve.

## Validation

```bash
npm run phase40:demo
npm run phase40:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

## Expected result

The default worker should return `overnightWorkerStatus: ready`, zero blockers, zero failed validations, all worker steps accepted as safe placeholders, and all execution/mutation/runner/owner-decision boundaries disabled.

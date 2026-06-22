# Phase 39 — Evidence Capture Bundle v1

## Purpose

Phase 39 adds a local evidence capture bundle contract/runtime for future owner-reviewed remote or overnight phase work.

This phase gives S.E.R.A. a structured way to describe the proof an owner would review after a future runner session, while keeping all execution, owner-decision recording, runner connectivity, source mutation, and self-approval disabled.

## Adds

- Local evidence capture bundle runtime.
- Required evidence item model.
- Evidence redaction requirement.
- Owner review requirement for every evidence item.
- Evidence bundle JSON report.
- Evidence bundle Markdown report.
- Evidence bundle history log.
- Runtime artifacts under `.sera-evidence-capture-bundle/`.

## Required evidence categories

- Clean main preflight snapshot.
- Phase packet lineage.
- Branch proposal summary.
- Branch readiness report.
- Remote runner blueprint report.
- Owner approval queue report.
- Self-hosted runner adapter contract report.
- Command allowlist gate report.
- Validation command plan.
- Test output summary.
- Certification output summary.
- Full verify output summary.
- Artifact hash summary.
- Emergency stop confirmation.
- Session lock confirmation.
- Owner review handoff summary.

## Safety boundaries

Phase 39 does not:

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
npm run phase39:demo
npm run phase39:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

## Expected result

The default bundle should return `evidenceBundleStatus: ready`, zero blockers, zero failed validations, all evidence items accepted as safe placeholders, and all execution/mutation/runner/owner-decision boundaries disabled.

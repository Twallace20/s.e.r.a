# Phase 31 — Planner / Task Decomposer v2

## Purpose

Phase 31 upgrades S.E.R.A.'s planning layer from simple queued work into a local phase-aware task decomposition system. The goal is to convert a phase objective into ordered tasks, dependencies, validation gates, owner approval checkpoints, evidence requirements, and completion criteria before orchestration or remote work attempts to act on it.

Phase 26 gave S.E.R.A. evaluation scorecards. Phase 27 protected known-good baselines. Phase 28 selected learning priorities. Phase 29 packaged learning by domain. Phase 30 protected source trust. Phase 31 turns trusted objectives into executable plans without giving S.E.R.A. execution or merge authority.

## What this phase adds

- Local planner v2 runtime under `.sera-planner-v2/`
- Phase objective decomposition into ordered tasks
- Task dependency checks
- Validation gate mapping per task
- Evidence requirements per task
- Owner approval checkpoints before risky actions
- Planner reports and history
- Explicit boundary that the planner creates plans only

## Initial decomposition model

The first default plan decomposes a phase into:

- source review
- phase packet review
- implementation review
- validation gate execution
- evidence review
- owner-approved closeout

## Boundary

Phase 31 is planning, task decomposition, dependency mapping, and evidence only.

It does not:

- execute tasks
- execute arbitrary code
- mutate source
- commit, push, merge, tag, or delete branches
- approve its own plan
- activate learning packs
- refresh network sources
- require secrets
- require cloud services
- require paid APIs
- require hosted model providers
- bypass owner approval

## Commands

```powershell
npm run phase31:demo
npm run phase31:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

## Expected proof

```text
S.E.R.A. phase31 planner task decomposer v2: PASS
S.E.R.A. knowledge source map: PASS mapped=87
Test Files 31 passed
Tests 136 passed
S.E.R.A. certify: PASS level=operator-console-v1
```

## Completion criteria

Phase 31 is complete when:

- the planner v2 runtime creates local artifacts
- a phase objective can be decomposed into ordered tasks
- task dependencies validate cleanly
- every task includes evidence requirements
- validation gates and owner approvals are explicit
- no execution, source mutation, cloud, secrets, paid provider dependency, or self-approval exists
- all validation commands pass
- main is pushed, tagged, and cleaned

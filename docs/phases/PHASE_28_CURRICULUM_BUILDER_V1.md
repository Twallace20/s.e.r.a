# Phase 28 — Curriculum Builder v1

## Purpose

Phase 28 adds S.E.R.A.'s first local curriculum builder. The goal is to turn capability gaps, regression baselines, and roadmap goals into a sequenced learning plan before S.E.R.A. receives more autonomy.

Phase 26 gave S.E.R.A. evaluation scorecards. Phase 27 protected known-good baselines. Phase 28 uses those signals to decide what S.E.R.A. should learn next, while preserving owner approval and free-core boundaries.

## What this phase adds

- Local curriculum runtime under `.sera-curriculum/`
- Capability gap ranking
- Curriculum modules mapped to core categories
- Module objectives, activities, completion criteria, and evaluation hooks
- Connection to Phase 27 regression baselines
- Evidence reports and history
- Owner approval requirement before curriculum or learning activation changes

## Core categories

- Coding
- Retrieval
- Tool governance
- Phase execution
- Safety

## Boundary

Phase 28 is planning and evidence only.

It does not:

- execute arbitrary code
- mutate source
- commit, push, merge, tag, or delete branches
- require secrets
- require cloud services
- require paid APIs
- require hosted model providers
- activate learning changes without owner approval

## Commands

```powershell
npm run phase28:demo
npm run phase28:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

## Expected proof

```text
S.E.R.A. phase28 curriculum builder v1: PASS
S.E.R.A. knowledge source map: PASS mapped=75
Test Files 28 passed
Tests 121 passed
S.E.R.A. certify: PASS level=operator-console-v1
```

## Completion criteria

Phase 28 is complete when:

- the curriculum builder creates a local plan
- at least five capability gaps are ranked
- at least five curriculum modules are generated
- the plan is connected to regression baseline evidence
- owner approval boundaries are present
- all validation commands pass
- main is pushed, tagged, and cleaned

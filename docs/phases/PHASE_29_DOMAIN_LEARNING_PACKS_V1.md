# Phase 29 — Domain Learning Packs v1

## Purpose

Phase 29 adds S.E.R.A.'s first local domain learning pack system. The goal is to turn the Phase 28 curriculum plan into structured, reviewable learning packs that can be expanded by domain before S.E.R.A. receives broader learning or remote work authority.

Phase 26 gave S.E.R.A. evaluation scorecards. Phase 27 protected known-good baselines. Phase 28 chose what S.E.R.A. should learn next. Phase 29 packages those learning paths into safe domain packs.

## What this phase adds

- Local domain pack runtime under `.sera-domain-packs/`
- Domain pack manifests for core learning areas
- Pack prerequisites, source requirements, objectives, and evaluation hooks
- Activation and ownership boundaries for learning packs
- Connection to Phase 28 curriculum modules and Phase 27 baselines
- Evidence reports and history
- Owner approval requirement before pack changes or activation

## Initial domain packs

- Local agent engineering
- Retrieval and source trust
- Tool governance
- Client service delivery
- Creative studio and worldbuilding

## Boundary

Phase 29 is packaging and evidence only.

It does not:

- execute arbitrary code
- mutate source
- commit, push, merge, tag, or delete branches
- require secrets
- require cloud services
- require paid APIs
- require hosted model providers
- activate learning packs without owner approval

## Commands

```powershell
npm run phase29:demo
npm run phase29:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

## Expected proof

```text
S.E.R.A. phase29 domain learning packs v1: PASS
S.E.R.A. knowledge source map: PASS mapped=79
Test Files 29 passed
Tests 126 passed
S.E.R.A. certify: PASS level=operator-console-v1
```

## Completion criteria

Phase 29 is complete when:

- the domain pack builder creates a local registry
- at least five domain packs are present
- each pack has objectives, prerequisites, source requirements, and evaluation hooks
- packs connect to curriculum and regression evidence
- owner approval boundaries are present
- all validation commands pass
- main is pushed, tagged, and cleaned

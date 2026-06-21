# Phase 30 — Knowledge Refresh + Source Trust v1

## Purpose

Phase 30 adds S.E.R.A.'s first local knowledge refresh and source trust registry. The goal is to separate source-of-truth material, implementation evidence, test evidence, generated runtime evidence, planning notes, and review-required external references before learning packs or future remote work rely on them.

Phase 26 gave S.E.R.A. evaluation scorecards. Phase 27 protected known-good baselines. Phase 28 chose what S.E.R.A. should learn next. Phase 29 packaged learning by domain. Phase 30 protects the knowledge layer those packs depend on.

## What this phase adds

- Local source trust runtime under `.sera-source-trust/`
- Source trust registry for trusted, generated, and review-required knowledge
- Refresh policy metadata without performing network refreshes
- Evidence requirements for every source entry
- Owner approval boundary for trust changes and external sources
- Stale-source review protection
- Evidence reports and history

## Initial source trust entries

- Phase documentation
- Knowledge source map
- Build validation guide
- Implementation scripts
- Integration tests
- Roadmap documents
- Local runtime reports
- External references placeholder

## Boundary

Phase 30 is classification, policy, and evidence only.

It does not:

- fetch from the network
- execute arbitrary code
- mutate source
- commit, push, merge, tag, or delete branches
- require secrets
- require cloud services
- require paid APIs
- require hosted model providers
- trust external sources without owner approval
- allow stale source use without review

## Commands

```powershell
npm run phase30:demo
npm run phase30:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

## Expected proof

```text
S.E.R.A. phase30 knowledge refresh source trust v1: PASS
S.E.R.A. knowledge source map: PASS mapped=83
Test Files 30 passed
Tests 131 passed
S.E.R.A. certify: PASS level=operator-console-v1
```

## Completion criteria

Phase 30 is complete when:

- the source trust registry creates local runtime artifacts
- at least eight source trust entries are present
- trusted, generated, and review-required sources are separated
- every source requires evidence
- external and stale source boundaries are explicit
- no network refresh, source mutation, cloud, secrets, or paid provider dependency exists
- all validation commands pass
- main is pushed, tagged, and cleaned

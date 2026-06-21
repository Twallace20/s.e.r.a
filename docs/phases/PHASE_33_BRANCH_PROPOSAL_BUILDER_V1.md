# Phase 33 — Branch Proposal Builder v1

## Status

Planned.

## Purpose

Phase 33 adds a local branch proposal builder so S.E.R.A. can convert a generated phase packet into a reviewable branch proposal before any branch is created, switched, pushed, executed, or merged.

This is a bridge between packet generation and future controlled branch work. It lets S.E.R.A. describe the branch, declared files, validation gates, evidence requirements, risk checks, and owner approval gates while preserving a proposal-only boundary.

## What this phase adds

- Local branch proposal runtime at `.sera-branch-proposals/`
- Branch name proposal model
- Packet-to-branch proposal translation
- Declared file model
- Validation command model
- Evidence requirement model
- Risk check model
- Owner approval gate model
- Proposal readiness reports and history

## Boundary

Phase 33 does not create branches, switch branches, push branches, open pull requests, apply patches, execute proposals, mutate source, commit, merge, tag, delete branches, call paid APIs, use hosted model providers, require cloud services, require secrets, refresh network sources, or self-approve proposal activation.

Owner approval is required before branch creation, execution, or merge.

## Validation

Required commands:

```bash
npm run phase33:demo
npm run phase33:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected proof:

```text
S.E.R.A. phase33 branch proposal builder v1: PASS
S.E.R.A. knowledge source map: PASS mapped=95
Test Files 33 passed
Tests 146 passed
S.E.R.A. certify: PASS level=operator-console-v1
```

## Completion criteria

- Phase 33 demo passes.
- Phase 33 verify passes.
- Full hygiene, build, tests, certify, and verify pass.
- Branch proposal evidence is written locally.
- Free-core covenant remains intact through Phase 45.
- Working tree is clean after merge/tag/branch cleanup.

# Phase 22 — Operator Console v2 / Terminal UI

## Purpose

Phase 22 gives S.E.R.A. a richer local command-center view without increasing mutation authority.

Operator Console v2 reads local evidence from the existing runtime stores and renders a terminal-friendly dashboard that helps a human operator see certification posture, phase progress, task activity, memory and lesson state, knowledge state, Phase 21 research evidence, autonomy activity, model-provider posture, and operator evidence artifacts.

## What This Adds

- `scripts/lib/operator-console-v2.mjs`
- `scripts/run-operator-console-v2.mjs`
- `.sera-operator-tui/dashboard.json`
- `.sera-operator-tui/dashboard.md`
- `.sera-operator-tui/dashboard-history.jsonl`
- `npm run phase22:demo`
- `npm run phase22:verify`
- integration coverage for dashboard building, terminal rendering, and local artifact writing

## Boundary

Operator Console v2 is read/report oriented.

It does not:

- apply patches
- approve or reject lessons
- activate or deactivate lessons
- run autonomous apply operations
- call paid APIs
- require hosted models
- require SaaS
- require cloud databases
- bypass validation or certification gates

## Validation

```bash
npm run phase22:demo
npm run phase22:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected:

```text
S.E.R.A. phase22 operator console v2: PASS
Test Files 20 passed
S.E.R.A. certify: PASS level=operator-console-v1
```

## Certification Posture

Phase 22 does not raise the runtime certification level. The certified level remains:

```text
operator-console-v1
```

The reason is intentional: Phase 22 improves operator visibility and terminal usability but does not add new autonomous execution or mutation authority.

# Phase 25 — Capability Registry + Skill Graph v1

## Status

Planned validation target: `phase-25-capability-registry-skill-graph-v1`.

## Purpose

Phase 25 gives S.E.R.A. a local self-model of what it can do, what it is learning, what evidence supports each capability, what tools and knowledge each capability depends on, and which capabilities need improvement.

This is the first capability-awareness layer. It does not make S.E.R.A. more autonomous by itself. It makes S.E.R.A. more honest and inspectable.

## What Phase 25 Adds

- Local capability directory: `.sera-capabilities/`
- Capability registry: `.sera-capabilities/capabilities.json`
- Skill graph: `.sera-capabilities/skill-graph.json`
- Capability event log: `.sera-capabilities/events.jsonl`
- Capability reports: `.sera-capabilities/reports/`
- Capability manifest validation
- Capability assessment
- Skill graph edges between capabilities
- Evidence and limitation tracking
- Free-core and local-only boundary tracking
- Attention-required capability reporting

## Boundary

Phase 25 does not execute tools, approve tools, activate plugins, mutate source files, run autonomous apply, call paid APIs, use hosted model providers, require SaaS, or require cloud services.

It records local capability metadata and writes local evidence artifacts only.

## Validation

Required commands:

```bash
npm run phase25:demo
npm run phase25:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected result:

```text
S.E.R.A. phase25 capability registry skill graph v1: PASS
S.E.R.A. knowledge source map: PASS mapped=54
Test Files 23 passed
S.E.R.A. certify: PASS level=operator-console-v1
```

## Completion Criteria

Phase 25 is complete when the capability registry initializes locally, representative capabilities are registered, the skill graph links capabilities safely, local summary artifacts are written, optional external capabilities remain outside the free core, integration tests pass, and the full validation gate remains green.

# S.E.R.A. Knowledge Seeding Guide

Phase 15 adds a repeatable way to seed S.E.R.A.'s local knowledge layer from trusted repo sources.

The source map is tracked in Git. Runtime knowledge records are generated under `.sera-knowledge/` and stay ignored.

## Commands

Verify the tracked source map:

```bash
npm run knowledge:source-map
npm run knowledge:verify
```

Build the CLI and seed local knowledge:

```bash
npm run knowledge:seed
```

Inspect seeded knowledge:

```bash
npm run sera -- knowledge documents
npm run sera -- knowledge search "operator console certification" 5
npm run sera -- knowledge summary
```

## What gets seeded

The seed command indexes a curated list of repo-truth files, including the README, build validation doc, certification ladder, roadmap, vision/guardrail docs, package boundaries, security baseline, Phase 15 docs, and selected source files for the kernel, knowledge store, cert runner, and CLI.

## What does not get seeded automatically

- `.sera-runs/`
- `.sera-cert/`
- `.sera-memory/`
- `.sera-tasks/`
- `.sera-knowledge/`
- `.sera-models/`
- `.sera-autonomy/`
- `.sera-console/`
- `node_modules/`
- `dist/`

Those are runtime/build artifacts, not source-truth records.

## Safety posture

Knowledge seeding is evidence creation. It does not execute queued tasks, approve lessons, activate rules, call external models, browse the internet, or mutate source files.

# Phase 12 — Operator Console v1

## Purpose

Phase 12 adds the first local operator console for S.E.R.A. It gives the operator one place to inspect certified subsystem status without granting new mutation authority.

## Certified Capabilities

- Creates `.sera-console/` as the local console evidence directory.
- Records console status snapshots in `snapshots.jsonl`.
- Records console health checks in `health.jsonl`.
- Writes auditable operator reports as Markdown and JSON under `.sera-console/reports/`.
- Lists console history and summary records.
- Summarizes memory, task queue, local knowledge, model provider, and autonomy loop state.
- Confirms external model providers remain disabled by default.

## Safety Boundaries

- The console is observational and reporting-first.
- It does not run autonomous patches.
- It does not approve lessons.
- It does not activate regression rules.
- It does not enable external model providers.
- It writes only console evidence artifacts.

## CLI

```powershell
npm run sera -- console status
npm run sera -- console health
npm run sera -- console report
npm run sera -- console history
npm run sera -- console summary
```

## Certification Level

`operator-console-v1`

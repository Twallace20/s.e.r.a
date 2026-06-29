# Phase 127 — Closed Phase Reprocessing Guard v1

This phase hardens S.E.R.A. against duplicate post-close processing.

It adds exact phase closure checks to the autopilot loop, artifact watcher, and repair classifier, plus a helper script that archives already-closed phase artifacts from active queues.

Validation command:

```powershell
node scripts/phase127-verify.mjs
```

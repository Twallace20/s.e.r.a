# Phase 20 — Multi-File Dev Worker v3

## Purpose

Phase 20 extends S.E.R.A.'s Developer Worker from single-file patching into a bounded multi-file patch workflow. The goal is to let S.E.R.A. propose or apply coordinated changes across multiple existing files while preserving the same safety properties already certified in earlier developer-worker phases.

## Certification boundary

Phase 20 is local, free, and validation-gated.

It does not add cloud services, paid APIs, paid model providers, hosted databases, hosted automation, or background execution.

## What Phase 20 adds

- A `MultiFileDeveloperWorker` exported from `@sera/workers`.
- Suggested multi-file patch mode that writes patch artifacts without mutating source files.
- Direct multi-file patch mode that writes backups before touching files.
- Whole-batch validation for coordinated changes.
- Whole-batch rollback when validation fails.
- A kernel task wrapper for multi-file developer patches.
- CLI support for JSON-defined multi-file patch batches.
- Phase 20 demo and verification scripts.

## Safety rules

- Paths must be relative to the project root.
- Path traversal is blocked.
- Protected files and runtime directories are blocked.
- Every target must already exist.
- Duplicate targets are blocked.
- Every operation must be explicit literal replacement.
- Expected occurrence checks are honored per file.
- Any missing find text blocks the entire batch.
- Direct mode creates backups for every target before writing.
- Failed validation restores every touched file.
- Suggested mode never mutates source files.

## Certified commands

```bash
npm run free-core:verify
npm run knowledge:verify
npm run phase20:demo
npm run phase20:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

## Expected result

```text
S.E.R.A. phase20 multi-file dev worker: PASS
Test Files 18 passed (18)
Tests 75 passed (75)
S.E.R.A. certify: PASS level=operator-console-v1
```

## Non-goals

Phase 20 does not grant autonomous permission to edit multiple files. It provides a safer tool surface that later phases can use only behind certified planning, validation, and operator-control boundaries.

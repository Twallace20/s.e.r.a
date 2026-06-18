# Phase 2 — Developer Worker v1

Phase 2 adds the first practical worker on top of the secure S.E.R.A. base.

## Purpose

Developer Worker v1 proves that S.E.R.A. can safely perform bounded developer work without requiring an LLM provider, cloud service, or uncontrolled shell access.

## What is included

- Suggested edit mode: writes a proposed replacement into run artifacts without mutating source files.
- Direct edit mode: applies literal text replacements inside the approved project root.
- Backup artifacts: direct edits capture the original file before mutation.
- Protected path rules: `.git`, `node_modules`, `dist`, `.sera-runs`, `.sera-cert`, `.env`, `.npmrc`, and related protected paths are blocked.
- Path traversal protection: relative paths cannot escape the project root.
- Honest no-op status: missing find text is reported as `no_op`, not success with fake changes.
- Validation rollback: if a validator fails after a direct edit, the original file is restored and the run is marked `failed`.
- Cert expansion: `npm run certify` now includes Developer Worker v1 checks.

## CLI examples

```bash
npm run sera -- dev suggest README.md "old text" "new text"
npm run sera -- dev apply examples/demo.txt "old text" "new text"
```

Suggested mode should be used first when editing important files. Direct mode should be used only when the requested edit is narrow, reviewable, and safe.

## Why this matters

This phase is the first controlled step toward a self-recursive evolving agent. S.E.R.A. can eventually work on its own codebase, but only through bounded workers, audit artifacts, backups, validation, and certification.

## What is intentionally not included yet

- No LLM planning.
- No semantic code editing.
- No AST refactors.
- No package installation.
- No internet access.
- No autonomous self-modification.

Those abilities come later after the worker contract, certs, and rollback model are proven.

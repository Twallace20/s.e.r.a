# Phase 3 — Developer Worker v2

## Purpose

Phase 3 moves S.E.R.A. from narrow single replacement edits toward safer self-improvement primitives.

The goal is not full autonomous self-modification. The goal is to make developer work more inspectable, patch-like, validated, and reversible.

## Added capabilities

- file inspection without source mutation
- source fingerprint artifacts with SHA-256, line count, and byte size
- patch suggestion mode that writes proposed patched content into artifacts
- direct patch mode with backup artifacts
- expected occurrence checks before mutation
- validation command support through `ShellTool`
- rollback when validation commands or callbacks fail
- ShellTool cwd boundary enforcement
- Developer Worker v2 cert checks
- CLI support for inspect and patch workflows

## New CLI commands

```bash
npm run sera -- dev inspect README.md
npm run sera -- dev patch suggest README.md "old" "new" 1
npm run sera -- dev patch apply README.md "old" "new" 1
npm run sera -- dev patch apply-build README.md "old" "new" 1
```

## Safety model

Phase 3 keeps all edits inside the approved project root. It also blocks protected paths such as `.git`, `node_modules`, `.sera-runs`, `.sera-cert`, and `.env` files.

Direct patches create backups before writing. If validation fails, the original source file is restored and rollback evidence is written.

## Certification level

When all Phase 3 checks pass, the cert level becomes:

```txt
developer-worker-v2
```

## Why this matters for recursive evolution

A self-recursive evolving agent must be able to change its own codebase eventually, but that power has to arrive through a safe sequence:

1. inspect source
2. propose patch
3. apply patch with backup
4. validate through approved tools
5. rollback on failure
6. write evidence
7. require human review before merging major changes

Phase 3 implements the first practical version of that loop.

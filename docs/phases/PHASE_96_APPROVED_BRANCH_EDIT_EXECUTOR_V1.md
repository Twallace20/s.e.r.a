# Phase 96 — Approved Branch Edit Executor v1

## Purpose

Phase 96 gives S.E.R.A. a controlled branch-scoped editing hand, but only inside an isolated approved branch workspace. It consumes the Phase 95 branch creation gate packet pattern and proves exact edit execution with owner approval, expected SHA-256 checks, expected occurrence checks, backups, validation, rollback, and evidence.

This phase is an important bridge between planning branches and becoming an approved branch developer. S.E.R.A. is now allowed to execute a tiny exact edit in a branch-shaped workspace, but she still cannot mutate the project repository source tree directly, create real Git branches, push remotes, merge, self-approve, self-merge, or self-deploy.

## What Phase 96 Adds

- Owner-approved branch edit execution plan catalog.
- Safe `work/` branch scope validation.
- Safe relative target path validation.
- Branch workspace containment checks.
- Expected SHA-256 pre-edit verification.
- Expected occurrence count verification.
- Backup before branch workspace mutation.
- Post-edit validation.
- Rollback on validation failure.
- JSON and Markdown evidence packets.
- Operator console binding.
- Multi-language production doctrine preservation.

## What Phase 96 Does Not Unlock

Phase 96 does **not** create real local Git branches, create remote branches, push to GitHub, merge branches, mutate direct project source, apply arbitrary patch text, patch arbitrary paths, create files, delete files, apply binary patches, edit workflows, create schedulers, create iPhone automations, run fleet tasks, run away mode, self-approve, self-merge, or self-deploy.

## Sandbox Learning Principle

Hard domains stay sandbox-first, not impossible. Phase 96 reinforces that principle by allowing branch edit practice in an isolated workspace with evidence and rollback before any future phase considers direct branch source editing.

## Completion Criteria

Phase 96 is complete when:

- The demo prints `S.E.R.A. phase96 approved branch edit executor v1: PASS`.
- Tests prove owner approval and exact edit plan binding.
- Tests prove safe branch scope, safe target path, expected SHA, and expected occurrence rules.
- Tests prove backup and rollback behavior.
- Tests prove direct project repo source mutation, real Git branch creation, remote push, merge, delete, create, binary patching, self-approval, self-merge, and self-deploy remain blocked.
- The operator console exposes Phase 96 status and safety gates.
- `npm run certify` and `npm run verify` pass.

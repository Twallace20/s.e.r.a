# Phase 95 — Approved Branch Creation Gate v1

## Purpose

Phase 95 turns Phase 94's owner-reviewable branch plan into a stricter branch creation gate packet. The goal is not to give S.E.R.A. uncontrolled Git power. The goal is to prove that S.E.R.A. can evaluate whether a planned branch is safe, exact, owner-approved, validation-bound, rollback-aware, and evidence-ready before any later phase attempts branch edits.

## What Phase 95 Adds

- Owner-approved branch creation gate packets.
- Safe `work/` branch-name checks.
- Declared base-ref checks.
- Clean-working-tree requirement declarations.
- Validation suite declarations.
- Rollback plan declarations.
- Evidence packet declarations.
- Disposable sandbox branch-practice markers.
- Multi-language production doctrine for future project studios.
- Operator console bindings and safety gates.

## What Phase 95 Does Not Unlock

Phase 95 does **not** create real project repository branches, push to remotes, mutate source, execute patches, edit workflows, create schedulers, create iPhone automations, run fleet tasks, run away mode, self-approve, self-merge, or self-deploy.

## Multi-Language Production Doctrine

Python remains important, but S.E.R.A. must not be boxed into Python. Mature S.E.R.A. should select the right language for the job:

- TypeScript/JavaScript for web apps, operator tools, agents, and integrations.
- Python for AI workflows, data, research, and automation.
- Swift for iOS/macOS.
- Kotlin/Dart for Android and cross-platform apps.
- C#/C++ for games and performance-heavy prototypes.
- C/C++/Rust for systems, robotics simulation, and hardware-adjacent work.
- SQL for dashboards, reporting, and data models.
- PowerShell/Bash for approved local automation.
- HTML/CSS/PHP/Ruby/Java/Go where the project or client context makes them useful.

This language-routing layer belongs to the Advanced Production and Technical Domains section of the roadmap, but Phase 95 records it now so future branch plans can represent more than Python projects.

## Completion Criteria

Phase 95 is complete when:

- The demo prints `S.E.R.A. phase95 approved branch creation gate v1: PASS`.
- The branch creation gate emits JSON and Markdown packet evidence.
- Tests prove owner approval is required.
- Tests prove self-approval is blocked.
- Tests prove unsafe branch names are blocked.
- Tests prove project repo branch creation, remote branch creation, git push, patch execution, and source mutation remain blocked.
- Tests prove multi-language production targets are preserved.
- The operator console exposes Phase 95 status and safety gates.
- `npm run verify` and `npm run certify` pass.

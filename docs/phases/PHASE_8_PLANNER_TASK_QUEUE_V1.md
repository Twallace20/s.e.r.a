# Phase 8 — Planner + Task Queue v1

## Purpose

Give S.E.R.A. a local task operating rhythm without granting autonomous execution. This phase introduces a queue where tasks can be created, inspected, started, completed, blocked, cancelled, summarized, and audited.

## What changed

- Added `@sera/planner`.
- Added `.sera-tasks/` runtime storage, ignored by Git.
- Added task records in `tasks.jsonl`.
- Added task lifecycle events in `task-events.jsonl`.
- Added task queue summary in `summary.json`.
- Added task queue methods on the kernel.
- Added `sera tasks ...` CLI commands.
- Added task lifecycle integration tests.
- Added certification checks for task queue behavior.

## Safety rules

- Queued tasks do not execute automatically.
- Lifecycle transitions are strict and invalid transitions are blocked.
- Task completion and blocked task outcomes are recorded into memory.
- Blocked tasks can create lesson candidates through the existing manual-review memory path.
- Task queue records are runtime data, not source code.

## Certified behaviors

- Task creation, listing, and inspection.
- Invalid lifecycle transition blocking.
- Start and complete lifecycle path.
- Completed tasks record memory history.
- Blocked tasks record failure journal entries and lesson candidates.
- Task summary and task events track lifecycle state.

## New CLI commands

```bash
npm run sera -- tasks create "Draft first task" "Write a bounded plan." normal
npm run sera -- tasks list
npm run sera -- tasks list queued
npm run sera -- tasks inspect <task-id>
npm run sera -- tasks start <task-id> "Begin work."
npm run sera -- tasks complete <task-id> "Finished successfully."
npm run sera -- tasks block <task-id> "Blocked by missing information."
npm run sera -- tasks cancel <task-id> "No longer needed."
npm run sera -- tasks events
npm run sera -- tasks summary
```

## Certified level

`planner-task-queue-v1`

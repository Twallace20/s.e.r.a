# Phase 11 — Autonomous Dev Loop v1

## Purpose

Add a bounded local autonomous development loop that can coordinate existing certified layers without bypassing their safety gates.

## What this phase adds

- `@sera/autonomy`
- `.sera-autonomy/loops.jsonl`
- `.sera-autonomy/events.jsonl`
- `.sera-autonomy/summary.json`
- CLI commands under `sera auto`
- certification checks for proposal, validation, rollback, task integration, and summary records

## Safety contract

Autonomous Dev Loop v1 is not uncontrolled autonomy.

It can create patch proposals without source mutation, search local knowledge, invoke the deterministic local mock model provider, apply a bounded patch only with a validation gate, complete a queued task after validation passes, block a queued task when validation fails, and record auditable loop and event evidence.

It cannot apply changes without validation, use external model providers, bypass Developer Worker path boundaries, bypass task lifecycle rules, or activate lessons automatically.

## CLI

```bash
npm run sera -- auto propose README.md "old text" "new text" 1
npm run sera -- auto apply-cert queued_task_123 README.md "old text" "new text" 1
npm run sera -- auto loops
npm run sera -- auto events
npm run sera -- auto summary
```

## Certified level

```text
autonomous-dev-loop-v1
```

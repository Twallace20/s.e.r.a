# System Architecture

S.E.R.A. uses a layered, local-first architecture. The design goal is recursive capability growth without uncontrolled authority growth.

```txt
User / Operator
        ↓
apps/cli / future operator UI
        ↓
Operator Console ───────────────┐
        ↓                        │
Planner / Tasks                  │
        ↓                        │
Autonomy Orchestrator            │
        ↓                        │
Workers ───── Knowledge ───── Model Provider Boundary
        ↓                        │
Kernel                           │
        ↓                        │
Safety Policy                    │
        ↓                        │
Tool Adapters                    │
        ↓                        │
Workspace + Runtime Stores + Artifacts
        ↓
Memory / Lessons / Regression Rules
        ↓
Certification Runner
```

## Kernel

The kernel owns task lifecycle and subsystem coordination. It should remain small and stable.

The kernel must not become a hidden autonomous brain. It coordinates approved capabilities and preserves honest statuses.

## Safety

Safety owns permissions, workspace boundaries, command allowlists, path checks, internet default-off posture, approvals, and redaction.

Safety decisions must stay explicit and testable.

## Tools

Tools are the only way S.E.R.A. acts on the environment. Every tool action should be safety-gated and auditable.

Current controlled tools include file operations and allowlisted shell validation.

## Workspace and Runtime Stores

Work happens inside isolated run workspaces. Runtime evidence is stored in local ignored folders such as:

- `.sera-runs/`
- `.sera-cert/`
- `.sera-memory/`
- `.sera-tasks/`
- `.sera-knowledge/`
- `.sera-models/`
- `.sera-autonomy/`
- `.sera-console/`

These stores are evidence, not source code.

## Artifacts

Artifacts are the evidence trail that proves what happened. They should answer:

- what was requested
- what plan was used
- what tools were called
- what safety events occurred
- what changed
- what validation passed or failed
- what final status was reported

## Workers

Workers are specialized modules built on top of the kernel and tool boundaries.

The Developer Worker currently owns bounded inspection, proposed edits, direct edits, patch proposals, direct patches, validation gates, backup capture, and rollback behavior.

## Memory and Lessons

Memory stores completed runs, blocked/failed outcomes, lesson candidates, approved/rejected lessons, active lesson records, activation decisions, and regression rules.

Lessons do not silently change runtime behavior. They become useful only after explicit review, activation, and cert-checkable rule creation.

## Planner and Tasks

The planner owns queued work and lifecycle transitions. Queued tasks do not execute automatically.

Task status is evidence for future autonomy, not permission to mutate source without gates.

## Knowledge

Knowledge ingestion and retrieval are local and deterministic through Phase 12. The knowledge layer can ingest files/directories, chunk documents, and search lexical evidence without an LLM.

Knowledge retrieval is read-only.

## Model Provider Boundary

The model-provider layer is optional. The only certified provider through Phase 12 is the deterministic local mock provider.

External model providers remain blocked by default until explicit configuration, redaction, audit, and cert gates exist.

## Autonomy

The autonomous dev loop is bounded. It can coordinate a queued task, local knowledge search, deterministic mock model output, and Developer Worker patching.

Autonomy must not bypass:

- queued task requirements
- validation gates
- rollback requirements
- safety policy
- evidence records
- operator review where required

## Operator Console

The operator console summarizes system state, health, history, and reports across memory, tasks, knowledge, models, and autonomy.

It is observability, not new authority. It must not apply patches, approve lessons, activate lessons, or enable providers.

## Certification

Certification is the gate that says what S.E.R.A. can claim. The current runtime certification is `operator-console-v1`.

No future phase should be treated as complete unless build, tests, and certification pass.

# S.E.R.A. Clean Core

S.E.R.A. is a local-first AI work operating system foundation: a secure, modular, evidence-driven agent runtime that can accept a task, use approved tools, write artifacts, report honestly, and grow into specialized workers without corrupting its core.

This repo is the clean rebuild foundation. The legacy SERA repo remains a reference archive only.

## Current certified level

- `secure-base`
- `developer-worker-v1`
- `developer-worker-v2`
- `self-improvement-v1`
- `task-memory-v1`
- `lesson-review-v1`
- `active-lessons-v1`

## What works now

- TypeScript + Node local runtime
- npm workspace monorepo
- secure kernel run lifecycle
- workspace-only starter task execution
- project-root-bounded Developer Worker
- file inspection with fingerprint artifacts
- suggested edit mode
- direct edit mode with backup artifacts
- patch proposal artifacts
- direct patch application with expected occurrence checks
- validation command support through the safe shell tool
- rollback when validation fails
- bounded self-improvement proposal mode
- validation-gated self-improvement apply mode
- protected path blocking
- JSON/JSONL/Markdown artifact trail
- certification runner
- integration tests
- task memory and failure journal
- inactive lesson candidates
- lesson candidate inspection
- approved/rejected lesson review records
- active lesson records
- auditable regression rule records

## What is intentionally not here yet

- no LLM dependency in the kernel
- no Ollama/OpenAI provider requirement
- no uncontrolled autonomous self-modification
- no semantic code refactoring
- no cloud dependency
- no database requirement
- no automatic lesson activation
- no silent lesson-driven behavior changes

## Setup

```bash
npm install
npm run build
npm test
npm run certify
```

## Starter secure-base run

```bash
npm run sera -- run "create hello file"
```

This creates `.sera-runs/<run-id>/` with task, plan, tool, safety, and final report artifacts.

## Developer Worker v1

Suggested edit mode creates an artifact proposal and does not mutate the source file:

```bash
npm run sera -- dev suggest README.md "old text" "new text"
```

Direct edit mode applies a narrow literal replacement inside the approved project root and captures a backup artifact:

```bash
npm run sera -- dev apply examples/demo.txt "old text" "new text"
```

Use suggested mode first for important files. Direct mode should stay narrow and reviewable.

## Developer Worker v2 and Self-Improvement Loop v1

Inspect mode fingerprints a file without changing it:

```bash
npm run sera -- dev inspect README.md
```

Patch suggestion mode renders a patch artifact and does not mutate the source file:

```bash
npm run sera -- dev patch suggest README.md "old text" "new text" 1
```

Direct patch mode applies a bounded literal patch with an expected occurrence count and backup artifact:

```bash
npm run sera -- dev patch apply README.md "old text" "new text" 1
```

Direct patch with build validation applies the patch, runs `npm run build` through `ShellTool`, and rolls back if validation fails:

```bash
npm run sera -- dev patch apply-build README.md "old text" "new text" 1
```

## Core law

Nothing gets called working unless it has:

1. a clear contract
2. a safe boundary
3. a cert/test
4. an artifact trail
5. an honest final status

## Current package boundaries

- `@sera/shared` — shared IDs, paths, redaction, and core types
- `@sera/safety` — workspace boundaries, command allowlists, internet default-off policy
- `@sera/workspace` — run/workspace creation
- `@sera/artifacts` — JSON, JSONL, and Markdown evidence writing
- `@sera/tools` — controlled tools such as file and shell tools
- `@sera/workers` — bounded worker modules, starting with Developer Worker
- `@sera/kernel` — task/run orchestration
- `@sera/certs` — certification checks
- `@sera/memory` — local run memory, lesson review, activation records, and regression-rule evidence
- `apps/cli` — local command-line interface

## Phase 5: Task Memory + Failure Journal v1

S.E.R.A. now records local run history, blocked/failed runs, and inactive lesson candidates in `.sera-memory/`. This is runtime data and is ignored by Git.

Memory is evidence-only in this phase. Lesson candidates require human review and do not activate automatically.

```bash
npm run sera -- memory summary
npm run sera -- memory runs
npm run sera -- memory failures
npm run sera -- memory lessons
```

Current certified level after Phase 5:

```text
task-memory-v1
```


## Phase 6: Lesson Review + Approval v1

S.E.R.A. can now list, inspect, approve, and reject lesson candidates. Approved lessons remain inactive and require a later activation phase before they can affect behavior. Rejected lessons are preserved for auditability.

```bash
npm run sera -- lessons candidates
npm run sera -- lessons inspect <candidate-id>
npm run sera -- lessons approve <candidate-id> "Reviewed and valid."
npm run sera -- lessons reject <candidate-id> "Not reusable."
npm run sera -- lessons approved
npm run sera -- lessons rejected
npm run sera -- lessons decisions
```

Current certified level after Phase 6:

```text
lesson-review-v1
```


## Phase 7: Active Lessons + Regression Rules v1

S.E.R.A. can now activate an approved lesson into an auditable regression rule. Activation is explicit, rationale-gated, and reversible. Active lessons still do not silently change runtime behavior; they create traceable guardrails that can be checked by the certification system.

```bash
npm run sera -- lessons active
npm run sera -- lessons rules
npm run sera -- lessons activations
npm run sera -- lessons activate <approved-lesson-id> "Use as a regression guardrail."
npm run sera -- lessons deactivate <active-lesson-id> "No longer valid."
npm run sera -- lessons check-rules
```

Current certified level after Phase 7:

```text
active-lessons-v1
```

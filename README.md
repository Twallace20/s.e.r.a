# S.E.R.A. Clean Core

S.E.R.A. is a local-first AI work operating system foundation: a secure, modular, evidence-driven agent runtime that can accept a task, use approved tools, write artifacts, report honestly, and grow into specialized workers without corrupting its core.

This repo is the clean rebuild foundation. The legacy SERA repo remains a reference archive only.

## Current certified level

Current runtime certification: `operator-console-v1`.

Certified runtime ladder completed so far:

- `secure-base`
- `developer-worker-v1`
- `developer-worker-v2`
- `self-improvement-v1`
- `task-memory-v1`
- `lesson-review-v1`
- `active-lessons-v1`
- `planner-task-queue-v1`
- `knowledge-retrieval-v1`
- `model-provider-v1`
- `autonomous-dev-loop-v1`
- `operator-console-v1`

Phase 13 is a documentation and repo-truth alignment phase. It does not add runtime authority, mutate safety policy, enable external models, or change the certified runtime level.

Phase 14 is an operational CI certification-gate phase. It adds local hygiene commands and a GitHub Actions workflow, but it does not add runtime authority or change the certified runtime level.

Phase 15 is a knowledge-seeding and source-map phase. It adds a tracked repo source map and repeatable local knowledge seeding commands, but it does not add runtime authority or change the certified runtime level.

Phase 16 is a live autonomous-dev happy-path phase. It adds a repeatable local demo and tests proving the existing autonomous loop can complete a queued task behind validation, but it does not add new runtime authority or allow autonomous edits to tracked source files.

Phase 17 adds a lesson review workbench: a review-only JSON and Markdown packet that surfaces pending lesson candidates, approved inactive lessons, active regression rules, review decisions, activation decisions, guardrails, and recommended human next actions without automatically approving or activating anything.

S.E.R.A. follows a Free Core Covenant: core operation must remain local-first and fully operational without paid subscriptions, paid APIs, paid SaaS tools, hosted databases, hosted model providers, or cloud-only dependencies through Phase 45. Paid services can exist only as optional adapters after the free/local path is certified.

Phase 19 adds recursive learning cycles: local, report-only synthesis records that turn memory, failures, lesson candidates, review decisions, approved inactive lessons, active regression rules, and free-core guardrails into governed next-action recommendations without automatically approving, activating, executing, or mutating anything.

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
- local planner task queue
- task lifecycle event records
- task queue memory integration
- local knowledge ingestion and lexical retrieval
- deterministic mock model provider adapter
- bounded autonomous dev loop proposal and validation-gated apply modes
- local operator console status, health, history, summary, and report commands
- local and GitHub CI certification gate for hygiene, build, tests, and certification
- tracked knowledge source map and repeatable local knowledge seed script
- repeatable live autonomous-dev happy path over an ignored local target with task, memory, autonomy, and operator evidence
- review-only lesson workbench packets for human governance of candidates, approvals, activations, and regression rules
- optional local model provider readiness through `ollama-local`, while certification continues to pass without Ollama, paid APIs, or downloaded models
- local recursive learning cycles that synthesize evidence into human-governed next actions

## What is intentionally not here yet

- no LLM dependency in the kernel
- no Ollama/OpenAI provider requirement
- no enabled external model provider
- no uncontrolled autonomous self-modification
- no autonomous mutation without validation gate
- no semantic code refactoring
- no multi-file transaction worker yet
- no cloud dependency
- no database requirement
- no automatic lesson activation
- no automatic task execution
- no silent lesson-driven behavior changes
- no browser or internet research worker yet
- no GUI or multi-user permission system yet

## Setup

```bash
npm install
npm run build
npm test
npm run certify
npm run knowledge:verify
npm run verify
```

Expected current certification result after Phase 12, Phase 13 docs alignment, Phase 14 CI gate setup, and Phase 15 knowledge source mapping:

```text
S.E.R.A. certify: PASS level=operator-console-v1
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
- `@sera/kernel` — task/run orchestration and subsystem coordination
- `@sera/certs` — certification checks
- `@sera/self-improvement` — validation-gated self-improvement proposals and apply records
- `@sera/memory` — local run memory, lesson review, activation records, and regression-rule evidence
- `@sera/planner` — local task queue, task lifecycle events, and task memory integration
- `@sera/knowledge` — local document and chunk ingestion plus lexical retrieval
- `@sera/model-provider` — optional model adapter records, deterministic mock provider, and redacted model events
- `@sera/autonomy` — bounded autonomous dev loop orchestration with validation-gated apply
- `@sera/operator-console` — local status, health, report, history, and summary evidence
- `apps/cli` — local command-line interface

## Phase 5: Task Memory + Failure Journal v1

S.E.R.A. records local run history, blocked/failed runs, and inactive lesson candidates in `.sera-memory/`. This is runtime data and is ignored by Git.

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

S.E.R.A. can list, inspect, approve, and reject lesson candidates. Approved lessons remain inactive and require a later activation phase before they can affect behavior. Rejected lessons are preserved for auditability.

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

S.E.R.A. can activate an approved lesson into an auditable regression rule. Activation is explicit, rationale-gated, and reversible. Active lessons still do not silently change runtime behavior; they create traceable guardrails that can be checked by the certification system.

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

## Phase 8: Planner + Task Queue v1

S.E.R.A. can create and manage a local task queue under `.sera-tasks/`. Tasks can be created, listed, inspected, started, completed, blocked, cancelled, summarized, and audited through event records.

Queued tasks do not execute automatically. This phase creates operating rhythm, not uncontrolled autonomy.

```bash
npm run sera -- tasks create "Draft first task" "Write a bounded task plan." normal
npm run sera -- tasks list
npm run sera -- tasks inspect <task-id>
npm run sera -- tasks start <task-id> "Begin work."
npm run sera -- tasks complete <task-id> "Finished successfully."
npm run sera -- tasks block <task-id> "Blocked by missing information."
npm run sera -- tasks cancel <task-id> "No longer needed."
npm run sera -- tasks events
npm run sera -- tasks summary
```

Current certified level after Phase 8:

```text
planner-task-queue-v1
```

## Phase 9 — Knowledge Ingestion + Local Retrieval v1

S.E.R.A. can index local project files into `.sera-knowledge/` and retrieve lexical evidence without using an LLM. Knowledge commands are read-only and do not execute tasks or mutate source files.

Example commands:

```powershell
npm run sera -- knowledge ingest-file README.md "Project README"
npm run sera -- knowledge documents
npm run sera -- knowledge search "planner task queue" 5
npm run sera -- knowledge summary
```

Current certified level after Phase 9:

```text
knowledge-retrieval-v1
```

## Phase 10: Model Provider Adapter v1

S.E.R.A. includes a safe optional model-provider adapter layer. The certified provider is a deterministic local mock provider. External providers remain disabled until explicit configuration and safety gates exist.

```bash
npm run sera -- models providers
npm run sera -- models invoke-mock "Summarize local evidence only."
npm run sera -- models requests
npm run sera -- models responses
npm run sera -- models events
npm run sera -- models summary
```

Current certified level after Phase 10:

```text
model-provider-v1
```

## Phase 11: Autonomous Dev Loop v1

S.E.R.A. has a bounded autonomous development loop. It can connect a queued task, local knowledge search, the deterministic mock model provider, and the Developer Worker into one auditable loop.

Autonomy remains safety-gated:

- proposal mode creates a patch artifact without mutating source
- apply mode requires a queued task id
- apply mode requires a validation gate
- failed validation rolls back source changes
- successful validation completes the queued task
- failed application blocks the queued task and records memory evidence
- external model providers remain blocked by default

```bash
npm run sera -- auto propose README.md "old text" "new text" 1
npm run sera -- auto apply-cert queued_task_123 README.md "old text" "new text" 1
npm run sera -- auto loops
npm run sera -- auto events
npm run sera -- auto summary
```

Current certified level after Phase 11:

```text
autonomous-dev-loop-v1
```

## Phase 12 — Operator Console v1

S.E.R.A. includes a local operator console that summarizes memory, tasks, knowledge, model-provider boundaries, and autonomous-dev-loop activity without enabling new mutation authority.

```powershell
npm run sera -- console status
npm run sera -- console health
npm run sera -- console report
npm run sera -- console history
npm run sera -- console summary
```

Current certified level after Phase 12:

```text
operator-console-v1
```

## Phase 13 — Documentation + Repo Truth Alignment v1

Phase 13 aligns repo truth after the Phase 12 foundation. It updates the README, certification ladder, architecture docs, validation record, and next-evolution roadmap so the repo reflects what is actually built, what remains intentionally blocked, and what should come next.

Phase 13 does not add runtime authority. Validation should still pass at:

```text
operator-console-v1
```

## Phase 14 — CI Certification Gate v1

Phase 14 adds local hygiene scripts and a GitHub Actions workflow so phase branches, `main`, and pull requests into `main` run the certification gate before merge.

Local gate commands:

```bash
npm run hygiene
npm run verify
```

The CI gate runs source hygiene, runtime artifact hygiene, build, tests, certification, and post-certification hygiene.

Phase 14 does not add runtime authority. Validation should still pass at:

```text
operator-console-v1
```

## Phase 15 — Knowledge Seeding + Source Map v1

Phase 15 adds a tracked knowledge source map and repeatable local knowledge seeding commands so S.E.R.A. can rebuild a local evidence index from trusted repo files.

Tracked source map:

```text
docs/knowledge/SOURCE_MAP.md
```

Local commands:

```bash
npm run knowledge:source-map
npm run knowledge:verify
npm run knowledge:seed
npm run sera -- knowledge search "operator console certification" 5
npm run sera -- knowledge summary
```

Runtime knowledge records are generated under `.sera-knowledge/` and remain ignored by Git. Phase 15 does not add external research, automatic task execution, automatic lesson activation, or new mutation authority.

Validation should still pass at:

```text
operator-console-v1
```

## Phase 16 — Live Autonomous Dev Happy Path v1

Phase 16 adds a repeatable local demo showing that S.E.R.A.'s existing autonomous dev loop can move through a full happy path without becoming uncontrolled:

```text
queued task → proposal → validation-gated apply → completed task → memory evidence → autonomy evidence → operator report
```

Local commands:

```bash
npm run phase16:demo
npm run phase16:verify
```

The demo writes only to ignored local runtime locations such as `.sera-local/`, `.sera-tasks/`, `.sera-memory/`, `.sera-autonomy/`, and `.sera-console/`. It does not edit tracked source files.

Validation should still pass at:

```text
operator-console-v1
```

## Phase 17 — Lesson Review Workbench v1

Phase 17 introduces a human-review workbench for the learning loop. It helps operators inspect pending lesson candidates, approved inactive lessons, active lesson regression rules, recent decisions, activation decisions, manual-review guardrails, and recommended next actions.

Local commands:

```bash
npm run phase17:demo
npm run phase17:verify
npm run sera -- lessons workbench
npm run sera -- lessons workbench-write
```

The workbench writes review packets under `.sera-memory/`. It does not approve, reject, activate, deactivate, or change runtime behavior.

## Phase 18 — Local Model Provider v1

Phase 18 adds the Free Core Covenant and introduces an optional local model provider boundary. The deterministic mock provider remains the certified default. The `ollama-local` provider is registered as a local-only optional adapter and is disabled unless the operator explicitly opts in.

Local commands:

```bash
npm run free-core:verify
npm run phase18:demo
npm run phase18:verify
npm run sera -- models local-status
npm run sera -- models invoke-ollama gemma4 "Summarize local evidence only."
```

Phase 18 does not require a paid model provider, paid API key, cloud account, Ollama install, or downloaded local model for certification.

## Phase 19 — Recursive Learning v1

Phase 19 introduces local recursive learning cycles. A cycle reads S.E.R.A.'s memory, failure journal, lesson candidates, review history, approved inactive lessons, active regression rules, and free-core guardrails, then writes a report-only recommendation record.

Local commands:

```bash
npm run phase19:demo
npm run phase19:verify
npm run sera -- lessons recursive
npm run sera -- lessons recursive-history
```

The recursive learning cycle does not approve, reject, activate, deactivate, execute queued work, call paid services, or mutate source files.

## Phase 20 — Multi-File Dev Worker v3

Phase 20 adds a local/free-first multi-file developer worker that can produce coordinated patch suggestions without source mutation or apply coordinated existing-file patches with backups, validation, and whole-batch rollback. It does not grant new autonomous authority; it only expands the safe tool surface available behind existing operator and validation gates.

Commands:

```bash
npm run phase20:demo
npm run phase20:verify
npm run sera -- dev multi-patch suggest multi-patch.json
```

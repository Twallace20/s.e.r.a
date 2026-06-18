# S.E.R.A. Clean Core

S.E.R.A. is a local-first AI work operating system foundation: a secure, modular, evidence-driven agent runtime that can accept a task, use approved tools, write artifacts, report honestly, and grow into specialized workers without corrupting its core.

This repo is the clean rebuild foundation. The legacy SERA repo remains a reference archive only.

## Current certified level

- `secure-base`
- `developer-worker-v1`

## What works now

- TypeScript + Node local runtime
- npm workspace monorepo
- secure kernel run lifecycle
- workspace-only starter task execution
- project-root-bounded Developer Worker v1
- suggested edit mode
- direct edit mode with backup artifacts
- validation rollback support
- protected path blocking
- JSON/JSONL/Markdown artifact trail
- starter certification runner
- integration tests

## What is intentionally not here yet

- no LLM dependency in the kernel
- no Ollama/OpenAI provider requirement
- no autonomous self-modification
- no semantic code refactoring
- no cloud dependency
- no database requirement

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
- `@sera/workers` — bounded worker modules, starting with Developer Worker v1
- `@sera/kernel` — task/run orchestration
- `@sera/certs` — certification checks
- `apps/cli` — local command-line interface

## Next phase

Phase 3 should add a real validation layer for developer work: syntax checks, test command orchestration through the safe shell tool, and stricter diff artifacts before S.E.R.A. moves toward semantic code editing.

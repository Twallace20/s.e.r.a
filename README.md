# S.E.R.A. — Secure Evidence-Driven Runtime Architecture

S.E.R.A. is a local-first AI work operating system in progress. This clean-core repo starts with the part that must be trustworthy before anything intelligent or autonomous is added: a secure local runtime that can accept a task, create an isolated workspace, use approved tools, write evidence, and report honestly.

This repo intentionally does **not** depend on Ollama, OpenAI, Codex, Copilot, Replit, Base44, Docker, cloud hosting, or any LLM provider in the secure base. Those can become adapters later. The kernel must stand on its own.

## Current scope

The first version proves the foundation:

- local CLI entry point
- modular TypeScript/npm workspace structure
- task/run/plan/step data model
- isolated run workspace
- JSON/JSONL/Markdown artifact trail
- workspace-only file writes
- allowlisted shell execution model
- secret redaction
- blocked-action reporting
- starter cert runner
- starter integration tests

## Quick start

```bash
npm install
npm run build
npm test
npm run certify
npm run sera -- run "create hello file"
```

The demo run writes a folder under `.sera-runs/` with a workspace, task, plan, tool events, safety events, and a final report.

## Core rule

A S.E.R.A. capability only counts when it has:

1. a clear contract
2. a safe boundary
3. a test or cert
4. an artifact trail
5. an honest final status

## Repo layout

```txt
apps/
  cli/                 local CLI entry point
packages/
  shared/              shared types and utilities
  artifacts/           evidence and artifact writer
  safety/              safety policy and redaction
  workspace/           workspace/run directory management
  tools/               controlled tool adapters
  kernel/              task execution lifecycle
  certs/               certification runner
docs/
  vision/              product charter and principles
  architecture/        package boundaries and system design
  security/            baseline, approvals, starter threat model
  data-design/         task/run/artifact schemas
  legacy-autopsy/      lessons from the legacy repo
  roadmap/             certification ladder and 30/60/90 plan
tests/
  integration/         secure-base integration tests
```

## What this is not yet

This is not yet a code-writing AI, app builder, autonomous worker, cloud backend, desktop app, PWA, or local LLM. Those are future layers. This repo starts by making sure the base is safe, modular, inspectable, and certifiable.

## Legacy policy

The old SERA/LocalAgent6 repo is a reference archive only. Ideas can migrate; structure cannot. Code can migrate only after it has a clear purpose, clean interface, safety boundary, and passing cert.

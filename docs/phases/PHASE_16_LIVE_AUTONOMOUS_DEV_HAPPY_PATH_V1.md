# Phase 16 — Live Autonomous Dev Happy Path v1

## Purpose

Phase 16 proves that the existing autonomous development loop can run a full, local, validation-gated happy path using the already-certified subsystems:

```text
queued task → local knowledge search → mock model boundary → patch proposal → validation-gated apply → task completion → memory evidence → autonomy evidence → operator report
```

This phase turns the Phase 11 autonomous-dev-loop capability into a repeatable operator-facing proof path.

## What this phase adds

- A repeatable local demo command: `npm run phase16:demo`
- A validation command: `npm run phase16:verify`
- A generated ignored local target under `.sera-local/phase16-happy-path/`
- A real queued task for the demo run
- A proposal loop that does not mutate the target
- An apply-cert loop that mutates only the ignored local target after certification passes
- Task completion evidence in `.sera-tasks/` and `.sera-memory/`
- Autonomy loop/event evidence in `.sera-autonomy/`
- Operator report evidence in `.sera-console/`
- Integration tests proving the happy path and failed-validation rollback path

## What this phase does not add

- No external model provider
- No internet access
- No uncontrolled autonomous self-modification
- No autonomous edits to tracked source files
- No semantic refactoring
- No multi-file transactions
- No automatic lesson activation
- No new runtime authority beyond the existing validation-gated autonomous-dev-loop boundary

## Local commands

```bash
npm run phase16:demo
npm run phase16:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

The demo is intentionally local. It writes runtime evidence under ignored `.sera-*` folders and `.sera-local/`.

## Expected validation

```text
S.E.R.A. phase16 live autonomy: PASS
14 test files passed
64 tests passed
S.E.R.A. certify: PASS level=operator-console-v1
```

## Completion standard

Phase 16 counts only when:

1. `npm run phase16:demo` passes.
2. `npm run phase16:verify` passes.
3. Hygiene passes.
4. Build passes.
5. Tests pass.
6. Certification passes at `operator-console-v1`.
7. `npm run verify` passes.
8. The phase branch is merged into `main`.
9. The phase tag is pushed.
10. The repo ends clean with only `origin/main`.

# Build Validation

S.E.R.A. only gets credit for capabilities that build, test, certify, and leave evidence.

## Current validation commands

```bash
npm install --ignore-scripts --no-audit --no-fund
npm run build
npm run hygiene
npm run verify
npm test
npm run certify
```

## Current expected certified runtime level

```text
S.E.R.A. certify: PASS level=operator-console-v1
```

## Phase 12 observed validation target

Phase 12 completed the secure local foundation with the Operator Console v1 capability. The expected test target at that point is:

```text
12 test files passed
60 tests passed
S.E.R.A. certify: PASS level=operator-console-v1
```

## Phase 13 validation posture

Phase 13 is documentation and repo-truth alignment. It does not add runtime authority or change the expected runtime cert level.

Phase 13 is valid only if the same commands still pass after the documentation changes:

```bash
npm run build
npm test
npm run certify
```

Expected result remains:

```text
S.E.R.A. certify: PASS level=operator-console-v1
```

## Generated artifact hygiene

The repository should not commit generated build/runtime artifacts, including:

- `node_modules/`
- `dist/`
- `.sera-runs/`
- `.sera-cert/`
- `.sera-memory/`
- `.sera-tasks/`
- `.sera-knowledge/`
- `.sera-models/`
- `.sera-autonomy/`
- `.sera-console/`
- `*.tsbuildinfo`
- generated `.js`, `.js.map`, or `.d.ts` files inside TypeScript `src/` folders unless intentionally authored and documented

## Phase 14 CI Certification Gate

Phase 14 moves the same discipline into GitHub Actions. It is an operational governance milestone, not a new runtime cert level.

The GitHub workflow must run on `main`, phase branches, and pull requests into `main`.

Required CI steps:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run hygiene:source
npm run hygiene:runtime
npm run build
npm test
npm run certify
npm run hygiene:source
npm run hygiene:runtime
```

Expected runtime result remains:

```text
S.E.R.A. certify: PASS level=operator-console-v1
```

## Phase 15 Knowledge Seeding + Source Map

Phase 15 adds a tracked source map and repeatable local knowledge seed command. It is an evidence-governance milestone, not a new mutation-authority level.

Required local validation:

```bash
npm run knowledge:source-map
npm run knowledge:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Optional local seed command:

```bash
npm run knowledge:seed
```

Expected runtime result remains:

```text
S.E.R.A. certify: PASS level=operator-console-v1
```

## Phase 16 Live Autonomous Dev Happy Path

Phase 16 adds a repeatable local happy-path demo for the existing autonomous-dev-loop system. It is an evidence and operations milestone, not a new mutation-authority level.

Required local validation:

```bash
npm run phase16:demo
npm run phase16:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected test target:

```text
14 test files passed
64 tests passed
```

Expected runtime result remains:

```text
S.E.R.A. certify: PASS level=operator-console-v1
```

## Phase 17 Lesson Review Workbench

Phase 17 adds a review-only workbench for lesson candidates, approved inactive lessons, active regression rules, decisions, activation decisions, and recommended human next actions.

Required local validation:

```bash
npm run knowledge:verify
npm run phase17:demo
npm run phase17:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected test target:

```text
15 test files passed
66 tests passed
```

Expected source-map target:

```text
S.E.R.A. knowledge source map: PASS mapped=21
```

Expected runtime result remains:

```text
S.E.R.A. certify: PASS level=operator-console-v1
```

## Phase 18 Local Model Provider

Phase 18 enforces the Free Core Covenant and adds an optional local model provider adapter boundary. Certification must pass without paid subscriptions, paid APIs, cloud-only services, Ollama installation, or downloaded local models.

Required local validation:

```bash
npm run free-core:verify
npm run knowledge:verify
npm run phase18:demo
npm run phase18:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected proof:

```text
S.E.R.A. free core covenant: PASS through_phase=45
S.E.R.A. knowledge source map: PASS mapped=26
S.E.R.A. phase18 local model provider: PASS
16 test files passed
69 tests passed
S.E.R.A. certify: PASS level=operator-console-v1
```

## Phase 19 Recursive Learning

Phase 19 adds a local recursive learning cycle that records evidence synthesis and recommendation history without making lesson decisions or changing runtime behavior.

Required local validation:

```bash
npm run free-core:verify
npm run knowledge:verify
npm run phase19:demo
npm run phase19:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected test target:

```text
17 test files passed
72 tests passed
```

Expected source-map target:

```text
S.E.R.A. knowledge source map: PASS mapped=30
```

Expected runtime result remains:

```text
S.E.R.A. certify: PASS level=operator-console-v1
```

## Phase 20 Multi-File Dev Worker

Required validation:

```bash
npm run free-core:verify
npm run knowledge:verify
npm run phase20:demo
npm run phase20:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected:

```text
S.E.R.A. phase20 multi-file dev worker: PASS
Test Files 18 passed (18)
Tests 75 passed (75)
S.E.R.A. certify: PASS level=operator-console-v1
```

## Phase 21 Research + Knowledge Worker

Phase 21 adds a local research worker that answers, compares, and summarizes only from indexed local knowledge citations. It does not add internet research, paid APIs, external model dependency, source mutation, lesson activation, or autonomous execution.

Required validation:

```bash
npm run free-core:verify
npm run knowledge:verify
npm run phase21:demo
npm run phase21:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected:

```text
S.E.R.A. free core covenant: PASS through_phase=45
S.E.R.A. knowledge source map: PASS mapped=38
S.E.R.A. phase21 research knowledge worker: PASS
Test Files 19 passed (19)
Tests 79 passed (79)
S.E.R.A. certify: PASS level=operator-console-v1
```

## Phase 22 — Operator Console v2 / Terminal UI Validation

Phase 22 is valid only when the local terminal dashboard can be generated from local evidence and the full gate remains green.

Required validation:

```bash
npm run phase22:demo
npm run phase22:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected outcome:

```text
S.E.R.A. phase22 operator console v2: PASS
Test Files 20 passed
S.E.R.A. certify: PASS level=operator-console-v1
```

## Phase 23 — SQLite Persistence v1 Validation

Phase 23 is valid only when the local SQLite persistence store initializes, records structured evidence, writes local artifacts, and the full validation gate remains green.

Required validation:

```bash
npm run phase23:demo
npm run phase23:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected outcome:

```text
S.E.R.A. phase23 sqlite persistence v1: PASS
Test Files 21 passed
S.E.R.A. certify: PASS level=operator-console-v1
```

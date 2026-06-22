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

## Phase 24 — Tool / Plugin Registry v1 Validation

Phase 24 is valid only when the local tool/plugin registry initializes, classifies permissions and risk, separates free-core-safe local tools from optional external/cloud adapters, writes local artifacts, and the full validation gate remains green.

Required validation:

```bash
npm run phase24:demo
npm run phase24:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected outcome:

```text
S.E.R.A. phase24 tool plugin registry v1: PASS
S.E.R.A. knowledge source map: PASS mapped=50
Test Files 22 passed
S.E.R.A. certify: PASS level=operator-console-v1
```

## Phase 25 — Capability Registry + Skill Graph v1

Required validation:

    npm run phase25:demo
    npm run phase25:verify
    npm run hygiene
    npm run build
    npm test
    npm run certify
    npm run verify

Expected result:

    S.E.R.A. phase25 capability registry skill graph v1: PASS
    S.E.R.A. knowledge source map: PASS mapped=54
    Test Files 23 passed
    S.E.R.A. certify: PASS level=operator-console-v1

Phase 25 writes local capability artifacts under .sera-capabilities/ and does not execute tools, approve tools, activate plugins, mutate source files, run autonomous apply, call paid APIs, use hosted model providers, require SaaS, or require cloud services.

## Phase 25B — CI Workflow Gate v1

Required validation:

    npm run phase25b:demo
    npm run phase25b:verify
    npm run hygiene
    npm run build
    npm test
    npm run certify
    npm run verify

Expected result:

    S.E.R.A. phase25B CI workflow gate v1: PASS
    S.E.R.A. knowledge source map: PASS mapped=59
    Test Files 24 passed
    Tests 101 passed
    S.E.R.A. certify: PASS level=operator-console-v1

Phase 25B adds optional remote validation proof. It does not mutate source, commit, push, merge, deploy, use secrets, or become required for local/free-core certification.

## Phase 25C — Phase Artifact Packet v1

Required validation:

    npm run phase25c:demo
    npm run phase25c:verify
    npm run hygiene
    npm run build
    npm test
    npm run certify
    npm run verify

Expected result:

    S.E.R.A. phase25C phase artifact packet v1: PASS
    S.E.R.A. knowledge source map: PASS mapped=63
    Test Files 25 passed
    Tests 106 passed
    S.E.R.A. certify: PASS level=operator-console-v1

Phase 25C standardizes future phase handoffs and artifact packets. It does not execute arbitrary tools, mutate source during inspection, commit, push, merge, delete branches, require secrets, or require cloud services.

## Phase 26 — Evaluation Harness v1

Required validation:

    npm run phase26:demo
    npm run phase26:verify
    npm run hygiene
    npm run build
    npm test
    npm run certify
    npm run verify

Expected result:

    S.E.R.A. phase26 evaluation harness v1: PASS
    S.E.R.A. knowledge source map: PASS mapped=67
    Test Files 26 passed
    Tests 111 passed
    S.E.R.A. certify: PASS level=operator-console-v1

Phase 26 evaluates deterministic local scorecards only. It does not execute arbitrary code, mutate source, call paid APIs, use hosted model providers, require cloud services, require secrets, or replace owner approval.

## Phase 27 — Regression Baseline Registry v1

Required validation:

    npm run phase27:demo
    npm run phase27:verify
    npm run hygiene
    npm run build
    npm test
    npm run certify
    npm run verify

Expected result:

    S.E.R.A. phase27 regression baseline registry v1: PASS
    S.E.R.A. knowledge source map: PASS mapped=71
    Test Files 27 passed
    Tests 116 passed
    S.E.R.A. certify: PASS level=operator-console-v1

Phase 27 records and checks deterministic local regression baselines only. It does not execute arbitrary code, mutate source, call paid APIs, use hosted model providers, require cloud services, require secrets, or replace owner approval.

## Phase 28 — Curriculum Builder v1

Required validation:

    npm run phase28:demo
    npm run phase28:verify
    npm run hygiene
    npm run build
    npm test
    npm run certify
    npm run verify

Expected result:

    S.E.R.A. phase28 curriculum builder v1: PASS
    S.E.R.A. knowledge source map: PASS mapped=75
    Test Files 28 passed
    Tests 121 passed
    S.E.R.A. certify: PASS level=operator-console-v1

Phase 28 builds local curriculum plans only. It does not execute arbitrary code, mutate source, call paid APIs, use hosted model providers, require cloud services, require secrets, or activate learning changes without owner approval.

## Phase 29 — Domain Learning Packs v1

Required validation:

    npm run phase29:demo
    npm run phase29:verify
    npm run hygiene
    npm run build
    npm test
    npm run certify
    npm run verify

Expected result:

    S.E.R.A. phase29 domain learning packs v1: PASS
    S.E.R.A. knowledge source map: PASS mapped=79
    Test Files 29 passed
    Tests 126 passed
    S.E.R.A. certify: PASS level=operator-console-v1

Phase 29 builds local domain learning pack registries only. It does not execute arbitrary code, mutate source, call paid APIs, use hosted model providers, require cloud services, require secrets, or activate learning packs without owner approval.

## Phase 30 — Knowledge Refresh + Source Trust v1

Required validation:

    npm run phase30:demo
    npm run phase30:verify
    npm run hygiene
    npm run build
    npm test
    npm run certify
    npm run verify

Expected result:

    S.E.R.A. phase30 knowledge refresh source trust v1: PASS
    S.E.R.A. knowledge source map: PASS mapped=83
    Test Files 30 passed
    Tests 131 passed
    S.E.R.A. certify: PASS level=operator-console-v1

Phase 30 builds a local source trust registry only. It does not fetch from the network, execute arbitrary code, mutate source, call paid APIs, use hosted model providers, require cloud services, require secrets, or trust stale/external sources without owner approval.

## Phase 31 — Planner / Task Decomposer v2

Required validation:

    npm run phase31:demo
    npm run phase31:verify
    npm run hygiene
    npm run build
    npm test
    npm run certify
    npm run verify

Expected result:

    S.E.R.A. phase31 planner task decomposer v2: PASS
    S.E.R.A. knowledge source map: PASS mapped=87
    Test Files 31 passed
    Tests 136 passed
    S.E.R.A. certify: PASS level=operator-console-v1

Phase 31 creates local phase plans only. It does not execute tasks, mutate source, commit, push, merge, tag, delete branches, call paid APIs, use hosted model providers, require cloud services, require secrets, or self-approve plans.

## Phase 32 — Phase Packet Generator v1

Required validation:

    npm run phase32:demo
    npm run phase32:verify
    npm run hygiene
    npm run build
    npm test
    npm run certify
    npm run verify

Expected result:

    S.E.R.A. phase32 phase packet generator v1: PASS
    S.E.R.A. knowledge source map: PASS mapped=91
    Test Files 32 passed
    Tests 141 passed
    S.E.R.A. certify: PASS level=operator-console-v1

Phase 32 creates local phase packet blueprints only. It does not execute generated packets, create branches, apply patches, mutate source, commit, push, merge, tag, delete branches, call paid APIs, use hosted model providers, require cloud services, require secrets, or self-approve packet activation.

## Phase 33 — Branch Proposal Builder v1

Required validation:

    npm run phase33:demo
    npm run phase33:verify
    npm run hygiene
    npm run build
    npm test
    npm run certify
    npm run verify

Expected result:

    S.E.R.A. phase33 branch proposal builder v1: PASS
    S.E.R.A. knowledge source map: PASS mapped=95
    Test Files 33 passed
    Tests 146 passed
    S.E.R.A. certify: PASS level=operator-console-v1

Phase 33 creates local branch proposals only. It does not create branches, switch branches, push branches, open pull requests, execute proposals, apply patches, mutate source, commit, merge, tag, delete branches, call paid APIs, use hosted model providers, require cloud services, require secrets, or self-approve proposal activation.

## PHASE 34 — BRANCH READINESS INSPECTOR V1

Validation commands:

- npm run phase34:demo
- npm run phase34:verify
- npm run hygiene
- npm run build
- npm test
- npm run certify
- npm run verify

## PHASE 35 — REMOTE PHASE RUNNER BLUEPRINT V1

Validation commands:

- npm run phase35:demo
- npm run phase35:verify
- npm run hygiene
- npm run build
- npm test
- npm run certify
- npm run verify

## PHASE 36 — OWNER APPROVAL QUEUE V1

Validation commands:

- npm run phase36:demo
- npm run phase36:verify
- npm run hygiene
- npm run build
- npm test
- npm run certify
- npm run verify

## PHASE 37 — SELF-HOSTED RUNNER ADAPTER V1

Validation commands:

- npm run phase37:demo
- npm run phase37:verify
- npm run hygiene
- npm run build
- npm test
- npm run certify
- npm run verify

## PHASE 38 — COMMAND ALLOWLIST GATE V1

Validation commands:

- npm run phase38:demo
- npm run phase38:verify
- npm run hygiene
- npm run build
- npm test
- npm run certify
- npm run verify

## PHASE 39 — EVIDENCE CAPTURE BUNDLE V1

Validation commands:

- npm run phase39:demo
- npm run phase39:verify
- npm run hygiene
- npm run build
- npm test
- npm run certify
- npm run verify

## PHASE 40 — OVERNIGHT BRANCH WORKER V1

Validation commands:

- npm run phase40:demo
- npm run phase40:verify
- npm run hygiene
- npm run build
- npm test
- npm run certify
- npm run verify

## PHASE 41 — OWNER DECISION RECORDER V1

Validation commands:

- npm run phase41:demo
- npm run phase41:verify
- npm run hygiene
- npm run build
- npm test
- npm run certify
- npm run verify

## Phase 42 validation

Phase 42 is validated with `npm run phase42:demo`, `npm run phase42:verify`, source/runtime hygiene, build, tests, certify, and full verify. Expected suite count after this phase is 42 test files and 191 tests.

## Phase 43 validation

Phase 43 is validated with `npm run phase43:demo`, `npm run phase43:verify`, source/runtime hygiene, build, tests, certify, and full verify. Expected suite count after this phase is 43 test files and 196 tests.

## Phase 44 validation

Phase 44 is validated with `npm run phase44:demo`, `npm run phase44:verify`, source/runtime hygiene, build, tests, certify, and full verify. Expected suite count after this phase is 44 test files and 201 tests.

## Phase 45 validation

Phase 45 is validated with `npm run phase45:demo`, `npm run phase45:verify`, source/runtime hygiene, build, tests, certify, and full verify. Expected suite count after this phase is 45 test files and 206 tests.

## Phase 46 Private Operator App Shell v1

Phase 46 adds the private app shell and must pass:

```bash
npm install --ignore-scripts --no-audit --no-fund
npm run knowledge:verify
npm run phase46:demo
npm run phase46:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

The operator app can be previewed locally after validation:

```bash
npm run operator:dev
```

The operator app production build check is:

```bash
npm run operator:build
```

Phase 46 must remain frontend-only, local-only, private-app-only, and free-core compatible.

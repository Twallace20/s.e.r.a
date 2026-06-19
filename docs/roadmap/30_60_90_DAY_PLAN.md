# S.E.R.A. Foundation Recovery Plan

This document replaces the original starter 30/60/90 framing with the current post-Phase-12 truth. The first twelve phases created the secure local foundation. The next phases should stabilize that foundation before adding more autonomy.

## Foundation completed through Phase 12

Completed certified runtime levels:

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

Outcome: S.E.R.A. can run locally, preserve artifacts, inspect and patch source through bounded workers, self-improve behind validation gates, remember failures, create and review lessons, activate regression guardrails, manage local tasks, ingest and search local knowledge, invoke a deterministic mock model provider, run bounded autonomous dev loops, and summarize system state through the operator console.

## Phase 13 — Documentation + Repo Truth Alignment v1

Purpose: make repo documentation match the real post-Phase-12 system before deeper evolution work begins.

Deliverables:

- update README current-certified-level truth
- update certification ladder through `operator-console-v1`
- update package boundary and architecture docs
- update build validation record
- add current system state after Phase 12
- add next evolution roadmap

Validation target:

```text
npm run build
npm test
npm run certify
S.E.R.A. certify: PASS level=operator-console-v1
```

## Phase 14 — CI Certification Gate v1

Purpose: move certification discipline from local-only to GitHub.

Deliverables:

- GitHub Actions workflow for install/build/test/certify
- generated-artifact guard
- runtime-folder guard
- PR/push certification instructions

Outcome: every branch and pull request gets checked before merge.

## Phase 15 — Knowledge Seeding + Source Map v1

Purpose: make the knowledge layer useful with real repo truth.

Deliverables:

- ingest docs into `.sera-knowledge/`
- ingest selected source files
- create source map records
- add commands/docs for refreshing local knowledge
- prove searches return meaningful project evidence

Outcome: S.E.R.A. can retrieve evidence from its own docs/source instead of relying on memory or guesses.

## Phase 16 — Live Autonomous Dev Happy Path v1

Purpose: prove the autonomous dev loop works against a real queued task in the live repo.

Deliverables:

- create real queued task
- run proposal mode against real text
- run apply-cert mode with certification gate
- complete or block task honestly
- record memory and autonomy evidence
- show operator console health after the run

Outcome: S.E.R.A. demonstrates a real bounded improvement loop, not only temporary cert fixtures.

## Phase 17 — Lesson Review Workbench v1

Purpose: make learning review operational.

Deliverables:

- better CLI views for candidate review
- review queue summary
- approval/rejection workflow guide
- activation workflow guide
- console health guidance for pending learning states

Outcome: blocked attempts and failures become reviewable learning opportunities without becoming automatic behavior.

## Phase 18 — Real Model Provider Adapter v1

Purpose: add a real optional model provider safely.

Deliverables:

- provider configuration contract
- redaction and audit records
- disabled-by-default external provider behavior
- explicit enablement path
- mock remains deterministic and cert-safe
- real provider tests use safe stubs unless credentials are present

Outcome: S.E.R.A. can use a real model boundary without allowing the model to bypass tools, safety, validation, or review.

## Phase 19 — Recursive Learning v1

Purpose: connect memory, lesson review, active rules, and regression checks into a verified learning loop.

Deliverables:

- failure-to-lesson workflow
- evidence requirement for lesson creation
- active rule regression mapping
- learning summary in operator console
- refusal of unreviewed lesson activation

Outcome: S.E.R.A. begins learning from verified outcomes through governed loops.

## Phase 20 — Developer Worker v3: Multi-File Transactions

Purpose: enable larger code changes safely.

Deliverables:

- multi-file patch plan format
- transaction backup set
- rollback all files on failure
- diff summary artifacts
- validation gate across patch set

Outcome: S.E.R.A. can handle structured multi-file changes without partial corruption.

## Phase 21 — Research + Knowledge Worker v1

Purpose: make S.E.R.A. answer questions from local knowledge with evidence.

Deliverables:

- local source-cited answers
- document comparison
- repo explanation mode
- uncertainty reporting
- no internet dependency yet

Outcome: S.E.R.A. becomes a local knowledge worker, not only a code worker.

## Phase 22 — Operator Console v2 / Terminal UI

Purpose: turn CLI status into an operator experience.

Deliverables:

- task view
- memory view
- lesson queue view
- active rules view
- cert status view
- autonomy loop view
- model-provider status view

Outcome: Driana/Tyler can operate S.E.R.A. without digging through JSONL files.

## Phase 23 — SQLite Persistence v1

Purpose: make runtime data queryable and durable at scale.

Deliverables:

- SQLite schema
- migrations
- import/export from existing JSONL
- backups
- query helpers

Outcome: S.E.R.A. keeps local evidence in a more scalable persistence layer.

## Phase 24 — Tool / Plugin Registry v1

Purpose: prepare safe capability expansion.

Deliverables:

- tool manifest format
- tool risk levels
- read/write/network permission declarations
- audit event requirements
- cert fixture requirements

Outcome: S.E.R.A. can gain new tools without collapsing the safety model.

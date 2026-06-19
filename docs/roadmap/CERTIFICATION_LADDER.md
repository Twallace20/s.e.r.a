# S.E.R.A. Certification Ladder

S.E.R.A. only advances when the cert runner proves the current runtime level. Documentation milestones may be tagged, but they do not become runtime capability levels unless the cert runner contains explicit checks for them.

## Current runtime certification

```text
operator-console-v1
```

Phase 13 is a repo-truth alignment phase. It preserves the Phase 12 runtime certification and updates documentation so the repo accurately reflects the current system.

## Level 1 — `secure-base`

S.E.R.A. can:

- create a run
- create an isolated workspace
- write required artifacts
- enforce workspace write boundaries
- block unsafe commands
- redact obvious secrets
- report honestly

## Level 2 — `developer-worker-v1`

S.E.R.A. can:

- create suggested edit artifacts without mutating source
- apply narrow literal edits directly
- create backup artifacts before direct edits
- block protected paths and path traversal
- report honest no-op results
- roll back direct edits when validation fails

## Level 3 — `developer-worker-v2`

S.E.R.A. can:

- inspect files and write fingerprint artifacts
- render patch proposals without mutating source
- enforce expected occurrence counts before mutation
- apply direct patch operations with backups
- run validation commands through the safe shell tool
- roll back source files when validation commands fail

## Level 4 — `self-improvement-v1`

S.E.R.A. can create self-improvement proposals without mutation and can apply bounded changes only with a validation gate. Failed validation rolls back to the original source and writes evidence artifacts.

## Level 5 — `task-memory-v1`

S.E.R.A. records completed runs in local memory, writes blocked/failed runs to a failure journal, creates inactive lesson candidates, and refuses automatic learning. This level proves S.E.R.A. can remember outcomes without allowing memory to become uncontrolled behavior.

## Level 6 — `lesson-review-v1`

S.E.R.A. can list, inspect, approve, and reject lesson candidates. Approved lessons remain inactive and require a later activation phase before they can affect behavior. Duplicate reviews, missing candidates, and reviews without rationale are blocked.

## Level 7 — `active-lessons-v1`

S.E.R.A. can activate approved lessons into auditable regression rules, check those rules for traceability, block duplicate or missing activations, deactivate active lessons, and keep all activations rationale-gated. Active lessons do not silently mutate runtime behavior; they become certified guardrails.

## Level 8 — `planner-task-queue-v1`

S.E.R.A. can create queued tasks, list and inspect them, enforce strict lifecycle transitions, record task events, summarize queue state, and write completed/blocked task outcomes into memory. Queued tasks do not execute automatically.

## Level 9 — `knowledge-retrieval-v1`

S.E.R.A. can ingest local files, chunk them into `.sera-knowledge/`, perform deterministic lexical search, inspect indexed documents, ignore runtime folders during directory ingestion, and summarize knowledge records. Retrieval is read-only and does not require an LLM.

## Level 10 — `model-provider-v1`

S.E.R.A. can list model providers, invoke the local mock provider, redact prompt records, block unknown/external providers, and summarize provider events without requiring an LLM for core runtime.

## Level 11 — `autonomous-dev-loop-v1`

S.E.R.A. can run a bounded autonomous development loop that proposes changes without mutation, refuses apply mode without validation, applies validated changes to queued tasks, rolls back failed validation, blocks failed tasks, and records autonomy loop/event summaries.

This is not uncontrolled autonomy. It is local, auditable, validation-gated orchestration.

## Level 12 — `operator-console-v1`

S.E.R.A. can summarize subsystem state through a local operator console, run health checks, write operator reports, preserve console history, and report memory, task, knowledge, model-provider, and autonomy state without enabling new mutation authority.

## Phase 13 — `phase-13-documentation-repo-truth-alignment-v1`

This is a governance milestone, not a new runtime capability level. It should be tagged after build, tests, and certification still pass at `operator-console-v1`.

Phase 13 proves:

- the README current-certified-level section matches the cert runner
- Phase 12 is no longer described as future work
- package boundaries include all completed runtime packages
- architecture docs match the actual local-first operating system shape
- build validation reflects the current 12-phase foundation
- next-phase planning is captured before adding more runtime power

## Next runtime certification candidates

- `ci-certification-gate-v1`: GitHub Actions runs install, build, test, certify, and generated-artifact guards on push/PR.
- `knowledge-source-map-v1`: local knowledge seeding and source mapping over repo docs/source files.
- `autonomy-happy-path-demo-v1`: live queued-task demo that proves the autonomous dev loop can complete real repo work behind validation.
- `real-model-provider-v1`: optional external provider with configuration, redaction, logging, and blocked-by-default safety gates.
- `recursive-learning-v1`: verified outcome → lesson candidate → review → active rule → regression check loop.
- `developer-worker-v3`: structured multi-file patch sets with transaction rollback.

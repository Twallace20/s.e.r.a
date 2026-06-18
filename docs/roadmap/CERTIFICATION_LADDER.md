# S.E.R.A. Certification Ladder

S.E.R.A. only advances when the cert runner proves the current level.

## Level 1 — secure-base

S.E.R.A. can:

- create a run
- create an isolated workspace
- write required artifacts
- enforce workspace write boundaries
- block unsafe commands
- redact obvious secrets
- report honestly

## Level 2 — developer-worker-v1

S.E.R.A. can:

- create suggested edit artifacts without mutating source
- apply narrow literal edits directly
- create backup artifacts before direct edits
- block protected paths and path traversal
- report honest no-op results
- roll back direct edits when validation fails

## Level 3 — developer-worker-v2

S.E.R.A. can:

- inspect files and write fingerprint artifacts
- render patch proposals without mutating source
- enforce expected occurrence counts before mutation
- apply direct patch operations with backups
- run validation commands through the safe shell tool
- roll back source files when validation commands fail
- prove the above through certs

## Future levels

- `developer-worker-v3`: structured patch sets across multiple files with transaction rollback
- `knowledge-worker-v1`: local document/repo ingestion with source-cited answers
- `self-review-v1`: evidence review and human approval report before merge-like actions
- `learning-v1`: approved lessons and regression creation from verified failures
- `operator-console-v1`: UI for task runs, approval queue, artifacts, certs, memory, and knowledge


## Level: `self-improvement-v1`

S.E.R.A. can create self-improvement proposals without mutation and can apply bounded changes only with a validation gate. Failed validation rolls back to the original source and writes evidence artifacts.

## Phase 5 — task-memory-v1

The system records completed runs in local memory, writes blocked/failed runs to a failure journal, creates inactive lesson candidates, and refuses automatic learning. This level proves S.E.R.A. can remember outcomes without allowing memory to become uncontrolled behavior.


## Phase 6 — lesson-review-v1

The system can list, inspect, approve, and reject lesson candidates. Approved lessons remain inactive and require a later activation phase before they can affect behavior. Duplicate reviews, missing candidates, and reviews without rationale are blocked.


## Phase 7 — active-lessons-v1

The system can activate approved lessons into auditable regression rules, check those rules for traceability, block duplicate or missing activations, deactivate active lessons, and keep all activations rationale-gated. Active lessons do not silently mutate runtime behavior; they become certified guardrails.

## Phase 8 — planner-task-queue-v1

The system can create queued tasks, list and inspect them, enforce strict lifecycle transitions, record task events, summarize queue state, and write completed/blocked task outcomes into memory. Queued tasks do not execute automatically.

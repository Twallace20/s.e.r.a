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

## Phase 14 — `phase-14-ci-certification-gate-v1`

This is an operational governance milestone, not a new runtime capability level. It should be tagged after local validation and GitHub certification-gate setup are complete.

Phase 14 proves:

- GitHub Actions can run the certification gate on phase branches, `main`, and pull requests into `main`
- source hygiene blocks tracked generated TypeScript outputs
- runtime hygiene blocks tracked local runtime artifacts
- build, tests, and certification remain the required merge gate
- the runtime certified level remains `operator-console-v1`

## Phase 15 — `phase-15-knowledge-seeding-source-map-v1`

This is a knowledge evidence milestone, not a new mutation-authority level. It should be tagged after source-map verification, hygiene, build, tests, certification, and verify pass.

Phase 15 proves:

- the repo has a tracked source map for trusted S.E.R.A. evidence
- required mapped files exist in the repo
- the source map references each required mapped file
- `.sera-knowledge/` can be rebuilt locally from trusted repo files
- generated knowledge artifacts remain ignored runtime data
- the runtime certified level remains `operator-console-v1`

## Phase 16a — `phase-16a-live-autonomous-dev-happy-path-v1`

This is a live evidence milestone, not a new runtime authority level. It should be tagged after the live happy-path demo, source-map verification, hygiene, build, tests, certification, and verify pass.

Phase 16 proves:

- a real queued task can be created for an autonomous-dev-loop run
- proposal mode produces patch evidence without mutating the target
- apply-cert mode applies only after validation passes
- successful apply completes the queued task and writes memory evidence
- autonomy loop/event records and operator reports are written
- failed validation rolls back and blocks the task instead of counting as success
- the runtime certified level remains `operator-console-v1`

## Phase 17 — `phase-17-lesson-review-workbench-v1`

This is a governance and operator-review milestone, not a new autonomous authority level. It proves that lesson candidates and lesson decisions can be surfaced in a human-reviewable workbench while keeping approvals and activations explicit.

Phase 17 proves:

- pending lesson candidates are visible in a single workbench packet
- approved inactive lessons are visible before activation
- active lesson regression rules remain auditable
- review and activation decisions are summarized
- Markdown and JSON reports can be written under `.sera-memory/`
- the workbench does not approve, reject, activate, deactivate, or change runtime behavior automatically
- the runtime certified level remains `operator-console-v1`

## Phase 18 — `phase-18-local-model-provider-v1`

This is a free/local-first provider boundary milestone. It does not raise the runtime certification level, and it does not require a paid model provider or even a local model install to certify.

Phase 18 proves:

- the Free Core Covenant is documented and checked
- `verify` enforces `free-core:verify`
- `mock-local` remains the deterministic certified provider
- `ollama-local` is registered as an optional local-only provider
- `external-disabled` remains blocked
- local model readiness writes evidence without requiring paid APIs
- optional Ollama invocation is blocked unless explicitly enabled and locally configured
- the runtime certified level remains `operator-console-v1`

## Phase 19 — `phase-19-recursive-learning-v1`

This is a governed learning milestone, not a new autonomous authority level. It proves that S.E.R.A. can synthesize local memory and lesson evidence into recursive next-action recommendations while preserving manual review, manual activation, and the Free Core Covenant.

Phase 19 proves:

- recursive learning cycles run locally
- cycle history is written under `.sera-memory/`
- recommendations are generated from local evidence
- pending candidates remain pending until human review
- approved lessons remain inactive until human activation
- no paid API, subscription, SaaS, hosted model, or cloud-only service is required
- the runtime certified level remains `operator-console-v1`

## Next runtime certification candidates

- `autonomy-happy-path-demo-v1`: live queued-task demo that proves the autonomous dev loop can complete real repo work behind validation.
- `real-model-provider-v1`: optional external provider with configuration, redaction, logging, and blocked-by-default safety gates.
- `recursive-learning-v1`: verified outcome → lesson candidate → review → active rule → regression check loop.
- `developer-worker-v3`: structured multi-file patch sets with transaction rollback.

## Phase 20 — `phase-20-multi-file-dev-worker-v3`

Phase 20 certifies a bounded multi-file developer-worker surface. It can suggest coordinated file patches without mutation and can apply existing-file patch batches only with backups, validation, and whole-batch rollback. The runtime certification level remains `operator-console-v1` because no new autonomous execution authority is granted.

## Phase 21 — `phase-21-research-knowledge-worker-v1`

Phase 21 is an evidence-usefulness milestone, not a new runtime authority level. It proves S.E.R.A. can turn local indexed knowledge into citation-bound answer, comparison, and summary packets while refusing to fabricate answers when evidence is missing.

Phase 21 proves:

- local research answers include citations
- missing evidence returns `insufficient_evidence` instead of a guessed answer
- comparisons require multiple local source documents
- summaries are extractive and limitation-aware
- research history and summary records are written under ignored `.sera-research/`
- no web search, paid API, hosted model, cloud service, or source mutation is required
- the runtime certified level remains `operator-console-v1`

## Phase 23 — `phase-23-sqlite-persistence-v1`

Phase 23 is a local persistence infrastructure milestone. It adds a SQLite-backed evidence store for structured events, key/value records, evidence records, and phase snapshots. The runtime certification level remains `operator-console-v1` because Phase 23 does not add new mutation authority.

## Phase 24 — `phase-24-tool-plugin-registry-v1`

Phase 24 is a local tool governance milestone. It adds a registry for tools, plugins, scripts, workers, and adapters with permission and risk classification. The runtime certification level remains `operator-console-v1` because Phase 24 does not add new mutation authority.

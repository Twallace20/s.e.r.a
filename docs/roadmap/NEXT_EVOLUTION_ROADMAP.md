# S.E.R.A. Next Evolution Roadmap

This roadmap begins after the certified local foundation through Phase 12.

## Arc 1 — Stabilize the certified foundation

### Phase 13 — Documentation + Repo Truth Alignment v1

Align repo docs with the actual `operator-console-v1` system state. This phase does not add runtime authority.

### Phase 14 — CI Certification Gate v1

Add GitHub Actions so phase branches, `main`, and pull requests into `main` run install, source hygiene, runtime artifact hygiene, build, tests, and certification before merge.

This is an operational governance phase, not a new runtime authority phase. The runtime certification level remains `operator-console-v1`.

### Phase 15 — Knowledge Seeding + Source Map v1

Create a tracked source map for trusted repo evidence and add repeatable local seeding commands for `.sera-knowledge/`.

This phase makes S.E.R.A.'s existing local knowledge layer easier to rebuild and verify without adding external research, automatic execution, or new mutation authority.

### Phase 16 — Live Autonomous Dev Happy Path v1

Create a real queued task, propose a bounded repo change, apply it with certification, complete/block the task honestly, and report the result through the operator console.

### Phase 17 — Lesson Review Workbench v1

Make lesson candidate review, approval, rejection, activation, and regression-rule checks easier to operate.

### Phase 18 — Real Model Provider Adapter v1

Add a real optional model provider safely. External providers remain disabled unless explicitly configured, redacted, logged, and certified.

## Arc 2 — Make S.E.R.A. useful and knowledge-grounded

### Phase 19 — Recursive Learning v1

Connect verified outcomes to reusable learning:

```text
failure → evidence → lesson candidate → human review → approved lesson → active regression rule → future cert check
```

### Phase 20 — Developer Worker v3: Multi-File Transactions

Add structured multi-file patch plans, transaction rollback, diff review, and validation across complete patch sets.

### Phase 21 — Research + Knowledge Worker v1

Answer questions from local knowledge with citations, compare docs, summarize repo areas, explain system behavior, and report uncertainty.

### Phase 22 — Operator Console v2 / Terminal UI

Create a richer local operator interface for tasks, memory, lesson candidates, active rules, cert status, autonomy loops, knowledge, models, and reports.

### Phase 23 — SQLite Persistence v1

Move from JSONL-only runtime storage to SQLite with migrations, backups, import/export, and query helpers.

### Phase 24 — Tool / Plugin Registry v1

Create a permissioned registry for tools and plugins, including risk level, read/write/network access, audit events, fixtures, and cert requirements.

## Arc 3 — Self-evolving, recursive, domain-general intelligence

### Phase 25 — Capability Registry + Skill Graph v1

Track what S.E.R.A. can do, cannot do, is learning, has certified, and should improve next.

### Phase 26 — Evaluation Harness v1

Create coding, retrieval, reasoning, tool-use, planning, memory, safety, and domain-specific evaluations. No self-evolution counts unless it improves an eval or fixes a verified failure.

### Phase 27 — Curriculum Builder v1

Let S.E.R.A. design learning paths for new skills and domains.

### Phase 28 — Domain Learning Packs v1

Create reusable domain packs with source documents, glossary, task types, tools needed, validation methods, evaluation questions, common failure modes, approval rules, and certification criteria.

### Phase 29 — Semantic Memory v1

Consolidate facts, definitions, principles, procedures, preferences, project rules, domain concepts, and known constraints.

### Phase 30 — Episodic Memory v1

Store important episodes: task context, decisions, failures, successes, evidence, and what should change next time.

### Phase 31 — Procedural Memory v1

Store reusable workflows such as safe patching, lesson review, branch preparation, certification, failure recovery, and operator reporting.

### Phase 32 — Strategy Planner v1

Plan across goals, milestones, dependencies, risks, sequences, blockers, and resources.

### Phase 33 — Self-Review + Critic Worker v1

Critique proposed plans and changes before mutation: evidence quality, boundedness, validation strength, rollback path, and approval needs.

### Phase 34 — Hypothesis + Experiment Loop v1

Form hypotheses, run bounded experiments, measure results, and propose lessons from evidence.

### Phase 35 — Self-Improving Prompt/Policy Layer v1

Version and improve prompts, worker instructions, tool-selection policies, retrieval prompts, review templates, and report templates through evals and rollback.

### Phase 36 — Tool Creation Worker v1

Identify missing tools, propose bounded tool implementations, create fixtures, request approval, and certify before activation.

### Phase 37 — Worker Factory v1

Create specialized workers from approved templates, with role, tools, permissions, memory access, knowledge access, evals, and certification.

### Phase 38 — Cross-Domain Transfer Learning v1

Apply verified lessons across domains where they fit, while preserving evidence and approval boundaries.

### Phase 39 — Autonomous Research Worker v1

Add internet research carefully: source quality scoring, citations, download sandboxing, no automatic execution of downloaded files, and approval for external ingestion.

### Phase 40 — Recursive Improvement Governor v1

Define what S.E.R.A. can change by itself, what requires review, what requires certification, what requires human approval, and what is forbidden.

### Phase 41 — Long-Horizon Autonomy v1

Manage larger projects over time with scheduled certs, refreshed knowledge, blocker tracking, and operator reports.

### Phase 42 — Self-Evolving Architecture v1

Allow S.E.R.A. to propose architecture changes only with alternatives, risks, tests, rollback, and operator approval.

### Phase 43 — Knowledge-to-Tool-to-Worker Loop v1

Connect the full learning chain:

```text
learn domain → identify missing capability → propose tool → certify tool → create worker → run worker → record outcome → extract lesson → improve worker
```

### Phase 44 — Self-Evolving Domain Academy v1

Build an internal academy of domains, courses, skills, practice tasks, evaluations, lessons, worker templates, and certification levels.

### Phase 45 — General Recursive Agent v1

S.E.R.A. can learn a new domain from sources, build a knowledge base, create a curriculum, define evaluations, create tools/workers when needed, run bounded tasks, verify outcomes, learn from failures, update rules, improve workflows, report honestly, ask for approval when needed, and refuse unsafe actions.

## Definition of “capable of learning anything”

S.E.R.A. should not mean “magically knows everything.” The realistic target is:

S.E.R.A. can enter a new domain, ingest trusted sources, build a knowledge model, create practice tasks and evaluations, attempt bounded work, verify outcomes, learn from failures, create tools/workers when necessary, and improve through certified recursive loops.

That is the responsible path to self-evolving, domain-general capability.

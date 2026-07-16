# S.E.R.A. Evolution Roadmap v1

## North Star

S.E.R.A. is a local-first autonomous capability operating system that can continually expand its safe capabilities through evidence, experimentation, evaluation, and learning.

S.E.R.A. is not defined as one assistant, coding agent, website builder, game studio, production company, research lab, or robot. Those are capabilities that S.E.R.A. can acquire, evaluate, version, install, improve, and compose.

> Given a safe objective and sufficient resources, S.E.R.A. identifies the required knowledge, tools, permissions, models, and evaluations; acquires or constructs what is missing; conducts bounded trials; measures outcomes; retains proven improvements; and honestly reports remaining limits.

## Non-negotiables

1. Core operation remains local and offline-capable.
2. Git is optional history and rollback infrastructure, not runtime state.
3. Ollama is the first real local reasoning provider, but the kernel works without a model.
4. Nothing is called working without contracts, boundaries, tests, artifacts, and honest status.
5. Learning must produce measurable improvement against a baseline.
6. BLOCKED and FAILED are terminal for an attempt.
7. Self-improvement is isolated, evaluated, reversible, and promotion-gated.
8. Text, documents, code, images, audio, video, links, repositories, and future sensor inputs normalize into evidence records.
9. Core capabilities must be usable through a downloadable local desktop application.
10. Robotics, fabrication, AR/XR, and physical embodiment follow the software MVP.
11. A materially evidenced and certified failure must not be unknowingly repeated under materially equivalent conditions.

## Evolution eras

### Era I — Foundation
One durable local operating system: contracts, control plane, state store, safety, execution, evidence, evaluation, knowledge, models, learning, capabilities, and operator runtime.

Milestone 7 — Evaluation Engine is COMPLETE. S.E.R.A. can evaluate immutable isolated-execution evidence with deterministic registered evaluators, assertion records, aggregate outcomes, and Control Plane gate evidence without model use.

Milestone 8 — Local Model Runtime is COMPLETE. S.E.R.A. can route explicitly authorized local model requests through a provider-independent Runtime boundary, prove deterministic fixture behavior without public network use, record SQLite invocation evidence, and keep model output as candidate intelligence only.

Milestone 9 — Knowledge and Multimodal Intake is COMPLETE. S.E.R.A. can ingest authorized inline text, local files, local directories, predownloaded snapshots, URL references without fetching, and generated fixtures into durable candidate knowledge records with provenance, content hashes, deterministic extraction, opaque preservation, and bounded lexical retrieval.

Milestone 10 — Capability Engine and Recursive Learning is COMPLETE. S.E.R.A. can run bounded learning sessions, assemble immutable candidate capability bundles, evaluate and compare candidates, certify exact digests, promote through Control Plane authority, activate versions atomically, and roll back with regression evidence.

Milestone 11 — Desktop Operator is COMPLETE. S.E.R.A. has a local graphical operator surface, loopback-only Operator Gateway, hashed local-owner sessions, approval review, notifications, safe evidence viewing, Runtime State v8 records, and repeatable offline proofs without model or public network use.

Milestone 12 — First Certified Studio is COMPLETE. S.E.R.A. has Studio Runtime, Evidence Studio v1, the certified `source-grounded-professional-brief-v1` profile, source-grounded claim/source evidence, deterministic evaluation, operator review, revision history, immutable final package output, candidate-only learning signals, and Desktop Operator Studio surfaces.

Cross-cutting plan lock — Evidence-Driven Recurrence Prevention and Governed Innovation is ACTIVE as an architecture and Base MVP acceptance invariant, with Runtime implementation pending. The locked plan lives in `docs/architecture/EVIDENCE_DRIVEN_RECURRENCE_PREVENTION_AND_INNOVATION_V1.md` and `architecture/recurrence-prevention-innovation-plan-v1.json`.

Post-Base MVP roadmap lock — S.E.R.A. Personal and Professional V1 is PLANNING-LOCKED and not implemented. The locked plan lives in `docs/architecture/SERA_PERSONAL_PROFESSIONAL_V1_ROADMAP.md` and `architecture/post-base-mvp-roadmap-v1.json`. It preserves Base MVP completion at Milestone 16, plans Milestones 17 through 24, and does not add Milestone 13 behavior, web access, browser automation, iOS Runtime execution, update, backup, enterprise, Hive Mode, robotics, or post-Base Runtime behavior.

Milestone 7 - Evaluation Engine: COMPLETE
Milestone 8 - Local Model Runtime: COMPLETE
Milestone 9 - Knowledge and Multimodal Intake: COMPLETE
Milestone 10 - Capability Engine and Recursive Learning: COMPLETE
Milestone 11 - Desktop Operator: COMPLETE
Milestone 12 - First Certified Studio: COMPLETE
Milestone 13 - Integrated Offline Loop: PENDING
Milestone 14 - Learning Generalization, Recurrence Prevention, and Innovation Proof: PENDING
Milestone 15 - Clean-Machine Offline Restart Proof: PENDING
Milestone 16 - Portable Base MVP Acceptance: PENDING

completedMilestones: 12
remainingMilestones: 4
currentMilestone: 13
baseMvpCompletionMilestone: 16

### Era II — Cognition
Every task follows:

```text
OBSERVE
→ UNDERSTAND
→ PLAN
→ PREDICT
→ EXECUTE
→ MEASURE
→ REFLECT
→ LEARN
→ STORE
```

### Era III — Capability
Every skill is represented by a Capability Genome with knowledge, tools, permissions, evaluations, dependencies, resources, confidence, maturity, history, version, and rollback.

### Era IV — Autonomous Learning
Unknown goals trigger gap analysis, curriculum, knowledge/tool acquisition, seeded trials, realistic trials, adversarial tests, evaluation, diagnosis, iteration, and promotion or rejection.

### Era V — Embodiment
Robotics, 3D printing, sensors, microcontrollers, robot bodies, cameras, AR/XR, fabrication, and physical experiments use simulation-first and hardware-specific safety governance.

## MVP

The MVP is not “S.E.R.A. can code.”

> S.E.R.A. can safely learn one meaningful new digital capability from start to finish and perform it better after evidence-driven iteration.

The first reference capability is Website Studio.

## Base MVP Scope Lock

The Base MVP milestone manifest is frozen:

```text
totalMilestones: 16
completedMilestones: 12
remainingMilestones: 4
currentMilestone: 13
baseMvpCompletionMilestone: 16
```

The canonical machine-readable Base MVP milestone record is `architecture/base-mvp-manifest.json`. The roadmap is the human-readable narrative view and must remain consistent with that manifest.

Post-Base planning begins only after the Base MVP. Milestone 24 is the planned S.E.R.A. Personal and Professional V1 release target, not the permanent end of S.E.R.A. At Milestone 16, S.E.R.A. is considered base-MVP complete when the portable local loop can prove controlled mistake handling, evidence preservation, correction, certification, restart, materially equivalent prevention, and visible operator explanation. At Milestone 24, S.E.R.A. Personal and Professional V1 is planned to be complete when it is a locally controlled, nontechnical, desktop-and-mobile-supervised intelligence operating system with certified local model use, real material intake, multiple professional workflows, governed web use, evaluation, evidence, correction learning, recurring-failure prevention, capability improvement, and professional delivery packaging. After Milestone 24, we choose what S.E.R.A. learns next.

Milestone 4 is complete only when the Unified Control Plane implementation and its three required support changes are retained, validated, and included in final closeout:

- `.gitignore` excludes generated `.sera/control-plane/` evidence
- Repository Snapshot excludes `.sera/control-plane/` from source measurement
- `tsconfig.base.json` provides the `@sera/control-plane` path alias

Milestone 5 remains `Runtime Host and SQLite Operational State`.

Milestone 5A is `Local Runtime Host v1`.

After Milestone 5C:

```text
Milestone 5A - Local Runtime Host v1: COMPLETE
Milestone 5B - SQLite Operational State v1: COMPLETE
Milestone 5C - Persistent Runtime Recovery v1: COMPLETE
Milestone 5 overall: COMPLETE
Milestone 6 - Isolated Execution Engine: COMPLETE
Milestone 7 - Evaluation Engine: COMPLETE
Milestone 8 - Local Model Runtime: COMPLETE
Milestone 9 - Knowledge and Multimodal Intake: COMPLETE
Milestone 10 - Capability Engine and Recursive Learning: COMPLETE
Milestone 11 - Desktop Operator: COMPLETE
```

## Consolidation milestones

The locked implementation order is:

1. Constitution and Layer Model — `sera-os-constitution-v1`
2. Repository Snapshot — `repository-snapshot-v1` — implemented and locally proven as a deterministic Runtime-layer fact scanner that writes `.sera/repository/` evidence
3. Repository Truth — `repository-truth-v1` — implemented and locally proven as the deterministic classification pass over Snapshot evidence
4. Unified Control Plane — `local-control-plane-v1` — implemented and under validation as the permanent Runtime attempt, gate, evidence, terminal-decision, verification, and closeout authority; final completion requires the three support changes named in Base MVP Scope Lock
5. Runtime Host and SQLite Operational State — `local-runtime-host-v1` completes Milestone 5A; `runtime-state-v1` completes Milestone 5B; `persistent-runtime-v1` completes Milestone 5C and Milestone 5
6. Isolated Execution — `isolated-execution-v1` — implemented and certified as the governed process/workspace boundary for approved local workloads
7. Evaluation Engine — `evaluation-engine-v1` — implemented and certified as deterministic evaluation over immutable execution evidence
8. Local Model Runtime — `local-model-runtime-v1` — implemented as a provider-independent Runtime boundary with deterministic fixture proof and disabled real-local adapters
9. Knowledge and Multimodal Intake — `knowledge-intake-runtime-v1` — implemented as a Runtime-owned intake and candidate knowledge boundary with deterministic extraction, opaque preservation, provenance, and lexical retrieval
10. Capability Engine and Recursive Learning — `capability-engine-recursive-learning-v1` — implemented as the governed Capability-layer lifecycle for candidate bundles, evaluation, exact certification, explicit promotion, active versions, rollback, and recursive learning evidence
11. Desktop Operator — `desktop-operator-v1` — implemented as the local Desktop-layer graphical surface and Runtime-layer Operator Gateway for loopback sessions, approvals, notifications, safe evidence viewing, and operator audit state
12. First Certified Studio — `website-studio-provisional-v1` — must produce evidence-linked operator corrections, failed-output signals, evaluation failures, improvement opportunities, and innovation opportunities without automatically promoting interaction history into reusable rules
13. Integrated Offline Loop — `integrated-offline-loop-v1` — must perform a learning preflight before capability or approach selection by retrieving applicable certified lessons, known failure patterns, prevention rules, certified alternatives, and active overrides
14. Learning Generalization, Recurrence Prevention, and Innovation Proof — `learning-generalization-recurrence-prevention-innovation-proof-v1` — must prove controlled failure, durable evidence, reproduction, scoped root cause, repair, regression proof, reproducibility, lesson certification, prevention activation, equivalent-context retrieval, known-failure avoidance, related-context generalization, out-of-scope non-application, improvement comparison, governed innovation, supersession, governed override, and proof that model output does not automatically become a lesson
15. Clean-Machine Offline Restart Proof — `clean-machine-offline-restart-proof-v1` — must preserve and retrieve failure records, certified lessons, prevention rules, scopes, superseded lessons, overrides, and innovation proposals after restart with no public internet
16. Portable Base MVP Acceptance — `portable-base-mvp-acceptance-v1` — must prove controlled mistake, evidence preservation, correction, certification, shutdown, restart, materially equivalent request, certified-lesson retrieval, prevention of the known mistake, and visible explanation/evidence in Desktop Operator

Repository Snapshot precedes Repository Truth so S.E.R.A. can inventory source, generated artifacts, runtime directories, legacy evidence, and provider-adapter surfaces with deterministic scanners before making classification claims. Repository Truth then classifies that snapshot against the SERA OS Constitution and Layer Model. No later subsystem is complete merely because Repository Truth exists; the locked implementation order above remains intact.

## Immediate rule

No new production capability should be implemented primarily as an isolated phase-numbered orchestration script. Existing phases remain valuable as modules, tests, failure fixtures, legacy references, or architecture lessons.

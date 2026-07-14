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

## Evolution eras

### Era I — Foundation
One durable local operating system: contracts, control plane, state store, safety, execution, evidence, evaluation, knowledge, models, learning, capabilities, and operator runtime.

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
completedMilestones: 4
remainingMilestones: 12
currentMilestone: 5
baseMvpCompletionMilestone: 16
```

Milestone 4 is complete only when the Unified Control Plane implementation and its three required support changes are retained, validated, and included in final closeout:

- `.gitignore` excludes generated `.sera/control-plane/` evidence
- Repository Snapshot excludes `.sera/control-plane/` from source measurement
- `tsconfig.base.json` provides the `@sera/control-plane` path alias

Milestone 5 remains `Runtime Host and SQLite Operational State`.

Milestone 5A is `Local Runtime Host v1`.

After Milestone 5A:

```text
Milestone 5A - Local Runtime Host v1: COMPLETE
Milestone 5B - SQLite Operational State v1: COMPLETE
Milestone 5C - Persistent Runtime Recovery v1: NEXT
Milestone 5 overall: IN PROGRESS
```

## Consolidation milestones

The locked implementation order is:

1. Constitution and Layer Model — `sera-os-constitution-v1`
2. Repository Snapshot — `repository-snapshot-v1` — implemented and locally proven as a deterministic Runtime-layer fact scanner that writes `.sera/repository/` evidence
3. Repository Truth — `repository-truth-v1` — implemented and locally proven as the deterministic classification pass over Snapshot evidence
4. Unified Control Plane — `local-control-plane-v1` — implemented and under validation as the permanent Runtime attempt, gate, evidence, terminal-decision, verification, and closeout authority; final completion requires the three support changes named in Base MVP Scope Lock
5. Runtime Host and SQLite Operational State — `local-runtime-host-v1` completes Milestone 5A; `runtime-state-v1` completes Milestone 5B; Persistent Runtime Recovery v1 is Milestone 5C next; Milestone 5 remains in progress
6. Isolated Execution — `isolated-execution-v1`
7. Evaluation Engine — `evaluation-engine-v1`
8. Ollama Model Runtime — `offline-model-runtime-v1`
9. Knowledge and Multimodal Intake — `multimodal-evidence-runtime-v1`
10. Capability Genome and Learning Engine — `capability-learning-v1`
11. Desktop Operator — `desktop-operator-v1`
12. Website Studio MVP — `website-studio-provisional-v1`
13. Portable Offline Release — `portable-offline-release-v1`

Repository Snapshot precedes Repository Truth so S.E.R.A. can inventory source, generated artifacts, runtime directories, legacy evidence, and provider-adapter surfaces with deterministic scanners before making classification claims. Repository Truth then classifies that snapshot against the SERA OS Constitution and Layer Model. No later subsystem is complete merely because Repository Truth exists; the locked implementation order above remains intact.

## Immediate rule

No new production capability should be implemented primarily as an isolated phase-numbered orchestration script. Existing phases remain valuable as modules, tests, failure fixtures, legacy references, or architecture lessons.

# Integrated Offline Loop v1

Milestone 13 certification target: `integrated-offline-loop-v1`.

Integrated Offline Loop v1 is the first permanent Runtime subsystem that composes the certified offline path across intake, knowledge retrieval, model candidate generation, capability selection, Studio execution, evaluation, operator review, and final evidence packaging.

## Contract

The loop must run a learning preflight before capability or approach selection. The preflight records:

- applicable certified lessons when present;
- known failure patterns when present;
- prevention rules when present;
- certified alternatives when present;
- active governed overrides when present;
- explicit non-applicability evidence for out-of-scope records.

The certified v1 proof uses deterministic fixtures only. It does not certify active lessons, activate prevention rules, promote innovation, invoke real models, use the public network, install packages, or depend on Git state.

## Runtime State

Runtime State migration v10 adds bounded local tables for integrated loop sessions, stage transitions, learning preflight runs, preflight matches, service bindings, artifacts, events, and idempotency.

Migrations 1 through 9 remain unchanged. Existing Runtime State, Persistent Recovery, Isolated Execution, Evaluation, Model Runtime, Knowledge Runtime, Capability Engine, Desktop Operator, Studio Runtime, and Evidence Studio behavior is preserved.

## Stages

The certified loop records ordered stages:

```text
created
authorization
source-intake
knowledge-retrieval
learning-preflight
capability-selection
studio-selection
model-candidate
generation
evaluation
operator-review
revision
finalization
closeout
completed
```

Capability and Studio selection are blocked until the preflight is complete.

## Preflight Decisions

Preflight records classify known records as:

- `APPLICABLE`
- `MATERIAL_EQUIVALENCE_UNCERTAIN`
- `OUT_OF_SCOPE`
- `CERTIFIED_ALTERNATIVE`
- `GOVERNED_OVERRIDE`

Resulting decisions are:

- clear to proceed when no applicable or uncertain record blocks selection;
- warn when equivalence is uncertain;
- select a certified alternative when authorized and applicable;
- preserve an override audit record when an operator-governed exception exists.

## Evidence

Each proof writes a bounded package under `.sera/integrated-loop/<loopSessionId>/<loopDigest>/` with request, authorization, service binding, preflight, capability selection, Studio selection, model candidate, evaluation, review, finalization, closeout, and manifest records.

Generated integrated-loop evidence is ignored by Git and excluded from Repository Snapshot source measurement.

## Desktop Operator

Milestone 13 adds Desktop visual-contract surfaces for integrated loop composition, sessions, timeline, authorization, preflight results, applicable records, non-applicable records, prevention warnings, certified alternatives, override details, source intake, knowledge retrieval, Studio selection, capability selection, model candidates, evaluation summary, review revisions, finalization, closeout, and evidence packages.

Browser code does not perform the loop, mutate SQLite directly, invoke models, approve gates, activate lessons, or promote innovation.

## CLI

```bash
npm run sera -- loop status
npm run sera -- loop policy
npm run sera -- loop sessions
npm run sera -- loop inspect <session-id>
npm run sera -- loop prove
```

`loop prove` uses isolated temporary proof state and is repeatable. It remains offline and model-free.

## Non-Goals

Integrated Offline Loop v1 does not implement Milestone 14. It does not certify lessons, activate recurrence-prevention rules, prove controlled failure repair, prove clean-machine restart persistence, promote innovation, run distributed Studios, enable Hive Mode, use public web access, use real local models, or implement post-Base MVP behavior.

## Milestone 14 Durable Preflight Update

Milestone 14 adds a production read-only preflight binding from Integrated Loop Runtime to `@sera/learning-governance-runtime`. Runtime health reports `durable-learning-governance-runtime` when durable learning governance is available.

Integrated Loop still does not certify lessons, activate prevention rules, promote innovation, or mutate Learning Governance records. It reads active certified lesson versions, active prevention rules, certified alternatives, valid governed overrides, superseded history, and proven improvement strategies from Learning Governance Runtime.

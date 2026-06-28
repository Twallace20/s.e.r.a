# Phase 109 — Proof-of-Use Simulation Harness v1

## Status

Closed only when the repository can prove that autopilot features are used in realistic sample workflows, not merely compiled or unit-tested.

## Purpose

Phase 109 adds the first proof-of-use harness for the S.E.R.A. autopilot stack. It creates reusable sample packets and scenarios that model how the operator system should behave after phases close, block, pass, request repairs, create rollback packets, and respond to phone-controlled run cards or pause files.

This phase is intentionally non-executing. It does not open a browser, submit prompts, push Git branches, merge code, create tags, delete remote branches, install dependencies, expose tokens, activate paid services, or self-approve work.

## Why This Matters

Long-range autopilot can only be trusted if each phase proves the actual operator workflow. Passing tests alone is not enough. The system must demonstrate that it can use sample inputs, route expected outputs, preserve evidence, and fail closed when behavior is outside policy.

Phase 109 makes `npm run phase109:demo` and `npm run phase109:verify` prove the intended workflow using sample data.

## Scope

Phase 109 adds:

- Closed-cleanly, blocked, pass, merge-pending, run-card, rollback, evidence, and bridge-outbox sample fixtures.
- Proof scenarios for next-phase requests, repair requests, safe merge decisions, rollback lineage, needs-attention stops, phone-start controls, and phone-pause controls.
- A required proof-of-use gate model before future safe auto-merge.
- A fixture writer for future simulation files under the AutoOps simulation fixture area.
- Validation that fails closed when proof counts, scenario counts, safety gates, or execution boundaries are wrong.

## Proof Fixtures

The harness models these fixtures:

1. `closed_cleanly_handoff`
2. `blocked_handoff`
3. `pass_handoff`
4. `merge_pending_packet`
5. `run_card`
6. `rollback_packet`
7. `evidence_packet`
8. `bridge_outbox_prompt`

## Proof Scenarios

The harness proves these scenarios:

1. Closed-cleanly handoff creates a next-phase request.
2. Blocked handoff creates a repair request.
3. Pass handoff waits for owner approval or safe auto-merge policy evaluation.
4. Merge-pending packet validates owner or policy approval routing.
5. Rollback scenario preserves recovery command lineage.
6. Needs-attention scenario stops the batch and preserves evidence.
7. Run-card scenario proves phone-controlled batch start.
8. Pause-file scenario proves phone-controlled batch stop.

## Safety Position

Phase 109 keeps these disabled:

- Real merge execution
- Git push execution
- Tag creation execution
- Remote branch deletion execution
- ChatGPT browser execution
- ChatGPT prompt submission
- Dependency installs
- Global tool installs
- GitHub/security setting mutation
- Paid service activation
- Token exposure
- Self-approval
- Self-merge
- Self-deploy
- Production deployment

## Validation

Expected validation:

```text
npm run knowledge:verify
npm run phase109:demo
npm run phase109:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected demo summary includes:

```text
proofOfUseSimulationHarnessStatus: proof-of-use-simulation-harness-ready
validationFailedCount: 0
declaredFileCount: 5
proofFixtureCount: 8
proofScenarioCount: 8
safetyGateCount: 2340
proofOfUseCommandRequiredBeforeAutoMerge: true
chatGptBrowserExecutionAllowed: false
realProjectMergeExecutionAllowed: false
tokenExposureAllowed: false
readyForPhase110BridgeDryRun: true
readyForPhase111DomInspector: true
```

## Files

- `apps/operator-console/src/proof-of-use-simulation-harness.ts`
- `docs/phases/PHASE_109_PROOF_OF_USE_SIMULATION_HARNESS_V1.md`
- `scripts/lib/proof-of-use-simulation-harness-v1.mjs`
- `scripts/run-proof-of-use-simulation-harness-v1.mjs`
- `tests/integration/proof-of-use-simulation-harness-v1.test.ts`

## Next Phase

Phase 110 should add ChatGPT Bridge Dry-Run v1. It should create bridge prompt files from sample CLOSED_CLEANLY, BLOCKED, and NEEDS_ATTENTION packets without controlling the browser yet.

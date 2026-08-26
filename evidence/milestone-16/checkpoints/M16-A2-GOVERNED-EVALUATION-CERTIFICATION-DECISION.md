# M16-A2 — Governed Evaluation + Operator Certification Decision

- **Checkpoint ID:** M16-A2-GOVERNED-EVALUATION-CERTIFICATION-DECISION
- **Milestone:** 16
- **Status:** LOCALLY_VALIDATED
- **Baseline:** c172f5c8a66790b8790d9b592c416ed364acee5c
- **Branch:** sera/runtime-capability-composition-v1
- **Remote state:** aligned through certified M16-A1 baseline; A2 remains local/uncommitted

## Acceptance result

A1 inactive candidate → governed evaluation → two independent executions/evaluations → reproducibility → permissions/limitations/risk surfaced → HIGH operator review → explicit APPROVE or REJECT → Control Plane-owned finalization → CERTIFIED or REJECTED → no promotion → active pointer unchanged → restart persistence.

All M16-A2 acceptance requirements are locally demonstrated.

## Locally validated behavior

### Evaluation and review

- The exact inactive A1 candidate digest is selected.
- Two independent governed executions and evaluations are performed.
- Expected-versus-actual evidence is persisted.
- Reproducibility is calculated and bound into the review packet.
- Candidate permissions, limitations, risk, executable identity, and review evidence are surfaced.
- Candidate remains inactive while awaiting the operator.

### Operator governance

- Review is represented as a durable HIGH-risk approval.
- Approval is bound to the exact candidate digest and exact review-packet SHA-256.
- HIGH-risk second confirmation is required.
- Approval/rejection is performed through the authenticated local Operator Gateway.
- The Desktop Operator contains the real approval queue plus explicit Approve certification and Reject candidate controls.

### Approval result

APPROVED transitions only the exact reviewed digest from CANDIDATE to CERTIFIED.

Certification does not call promotion, does not mutate the active pointer, and does not make the candidate selectable for ordinary execution.

### Rejection result

REJECTED transitions only the exact reviewed digest to terminal REJECTED.

The rejected digest has no certification, no promotion, and no active pointer.

### Restart persistence

The focused proof intentionally restarts the Operator Gateway after review creation but before the operator decision.

Both APPROVED and REJECTED decisions complete after restart from durable Runtime State and persisted review binding.

A subsequent Runtime State reopen preserves the resulting lifecycle and operator decision.

## Validation

- TypeScript build: PASS
- Focused M16-A2 product path: 16/16 PASS
- Desktop Operator: 236/236 PASS
- Capability Engine: 143/143 PASS
- Evaluation Engine: 64/64 PASS
- Governed Capability composition: 1/1 PASS
- Direct validation total: 460/460 PASS
- Latest post-cleanup Desktop regression: 236/236 PASS

Validation record:

evidence/milestone-16/checkpoints/M16-A2-LOCAL-VALIDATION.json

SHA-256:

c357e49f5bc314d6973226711a62ba8faf7f1ecc4da1bdde9852d11b8e67bf19

## Certification boundary

M16-A2 is LOCALLY_VALIDATED, not yet CERTIFIED.

M16-A, M16-B, M16-C, and Milestone 16 remain NOT YET CERTIFIED.

No claim of A2 remote alignment is made yet.

The next authorized sequence is:

1. create the implementation/evidence commit;
2. push it;
3. verify the exact remote SHA;
4. create a separate M16-A2 certification record bound to that real implementation/evidence SHA;
5. commit/push the certification record and verify remote alignment.

## Protected unrelated worktree artifacts

The pre-existing M5-07 artifacts remain outside this checkpoint and must not be staged, deleted, or modified as part of M16-A2.

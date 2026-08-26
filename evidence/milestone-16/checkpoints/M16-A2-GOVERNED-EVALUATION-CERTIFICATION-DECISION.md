# M16-A2 — Governed Evaluation + Operator Certification Decision

- **Checkpoint ID:** M16-A2-GOVERNED-EVALUATION-CERTIFICATION-DECISION
- **Milestone:** 16
- **Status:** CERTIFIED
- **Implementation/evidence commit:** `7ccac6be46c8747b61279a6bffa9b3340e0e55b7`
- **Remote implementation/evidence commit:** `7ccac6be46c8747b61279a6bffa9b3340e0e55b7`
- **Implementation remote aligned:** YES
- **Local-validation SHA-256:** `c357e49f5bc314d6973226711a62ba8faf7f1ecc4da1bdde9852d11b8e67bf19`
- **Certification-record SHA-256:** `64d1b3ad5f1acf05b5100a41bc9225e503cb168519a82a5c22eff9cec2377600`

## Certified acceptance result

`A1 inactive candidate → governed evaluation → two independent executions/evaluations → reproducibility → permissions/limitations/risk surfaced → HIGH operator review → explicit APPROVE or REJECT → Control Plane-owned finalization → CERTIFIED or REJECTED → no promotion → active pointer unchanged → restart persistence`

M16-A2 is **CERTIFIED**.

## Certification basis

The certification is bound to the actual implementation/evidence commit:

`7ccac6be46c8747b61279a6bffa9b3340e0e55b7`

The remote branch matched that exact SHA before this certification record was created.

The immutable local-validation record is:

`evidence/milestone-16/checkpoints/M16-A2-LOCAL-VALIDATION.json`

SHA-256:

`c357e49f5bc314d6973226711a62ba8faf7f1ecc4da1bdde9852d11b8e67bf19`

Validation:

- TypeScript build: PASS
- Focused M16-A2 product path: 16/16 PASS
- Desktop Operator: 236/236 PASS
- Capability Engine: 143/143 PASS
- Evaluation Engine: 64/64 PASS
- Governed Capability composition: 1/1 PASS
- Direct validation total: 460/460 PASS

## Certified behavior

### Evaluation

- Exact inactive candidate digest selected.
- Two independent governed execution/evaluation runs.
- Expected-versus-actual evidence persisted.
- Deterministic reproducibility established.
- Permissions, limitations, risk, executable identity, and evidence surfaced.

### Operator decision

- Review is represented by a durable HIGH-risk approval.
- Approval is bound to the exact candidate digest and review-packet SHA-256.
- Second confirmation is mandatory.
- Decision occurs through the authenticated local Operator Gateway and Desktop Operator.

### Approved path

APPROVED transitions the exact reviewed digest to `CERTIFIED`.

It does not promote the capability.

It does not change the active pointer.

It does not make the candidate selectable for ordinary execution.

### Rejected path

REJECTED transitions the exact reviewed digest to terminal `REJECTED`.

No certification, promotion, or active pointer exists for that rejected digest.

### Persistence

A Gateway restart between evaluation and decision is certified.

Decision and resulting lifecycle survive subsequent Runtime State reopen.

## Scope boundary

- **M16-A2:** CERTIFIED
- **M16-A:** NOT YET CERTIFIED
- **M16-A3:** NOT STARTED
- **M16-A4:** NOT STARTED
- **M16-B:** NOT YET CERTIFIED
- **M16-C:** NOT YET CERTIFIED
- **Milestone 16:** NOT YET CERTIFIED

Certification of A2 does not authorize implicit activation.

## Next authorized gate

**M16-A3 — Explicit Promotion + Real Task Reattempt**

The next implementation must prove:

1. exact certified candidate digest selected;
2. promotion requires explicit Product Control Plane authority;
3. active pointer changes atomically;
4. the original previously-unsatisfied operator task is reattempted;
5. the promoted capability actually satisfies that task;
6. promotion/use lifecycle is visible through Desktop Operator;
7. rollback remains M16-A4 scope.

## Protected unrelated worktree artifacts

The pre-existing M5-07 artifacts remain unrelated and are excluded from M16-A2 certification.

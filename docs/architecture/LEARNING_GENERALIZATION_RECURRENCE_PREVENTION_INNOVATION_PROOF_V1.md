# Learning Generalization, Recurrence Prevention, and Innovation Proof v1

Milestone 14 certification target: `learning-generalization-recurrence-prevention-innovation-proof-v1`.

This milestone adds the bounded Learning Governance Runtime. It proves that S.E.R.A. can record a controlled failure, reproduce it, propose a scoped root-cause hypothesis, test a repair, preserve regression evidence, certify an inactive lesson, explicitly activate it, apply a prevention rule, preserve superseded history, govern overrides, compare an improvement against a baseline, and keep innovation distinct from repair.

The proof remains local-first, offline, deterministic, and model-free. Model output is candidate intelligence only; it cannot certify lessons, activate lessons, promote innovations, or override Control Plane authority.

## Runtime Boundary

- Package: `@sera/learning-governance-runtime`
- CLI: `sera learning-governance ...`
- State: SQLite Runtime State migration v11
- Evidence: `.sera/learning-governance/`
- Certification: `learning-generalization-recurrence-prevention-innovation-proof-v1`

The runtime owns learning sessions, failure evidence, context fingerprints, hypotheses, repair candidates, reproductions, repair proofs, lessons, prevention rules, governed overrides, improvement comparisons, innovation records, events, and idempotency records.

## Certified Behaviors

- Controlled failure evidence is required before a lesson can exist.
- Context fingerprints are deterministic and scope-bound.
- Root-cause hypotheses remain scoped and evidence-linked.
- Failure reproduction and repair reproduction are separate records.
- Regression evaluation is required before lesson certification.
- Lesson certification and activation are distinct governed steps.
- Active prevention rules apply only inside certified scope.
- Related contexts warn instead of silently generalizing.
- Out-of-scope contexts are not incorrectly blocked.
- Superseded lessons remain inspectable.
- Overrides require governance, scope, reason, authority, and use limits.
- Improvement records compare candidate behavior against a baseline.
- Innovation records stay distinct from repair and cannot promote themselves.
- Rollback evidence is preserved for promoted innovation candidates.

## Non-Goals

Milestone 14 does not implement clean-machine restart proof, portable Base MVP acceptance, public internet use, real model invocation, Hive Mode, distributed recovery, or Desktop Operator feature expansion beyond existing surfaces.

## Final Architecture Correction

Learning Governance Runtime is below Operator Gateway. The dependency direction is `@sera/operator-gateway -> @sera/learning-governance-runtime` and `@sera/integrated-loop-runtime -> @sera/learning-governance-runtime`. Learning Governance Runtime must not import Operator Gateway or Integrated Loop Runtime.

Learning Governance Runtime depends only on lower Runtime services and contracts: Runtime State, Runtime Host, Persistent Runtime Recovery, Execution Engine, Evaluation Engine, Capability Engine, and Control Plane authorization references. The Runtime Host service ID for isolated execution health is `isolated-execution`.

Migration v11 records independent evidence links, lesson certifications, lesson activations, lesson supersessions, innovation evidence links, explicit repair versions, context IDs separate from context hashes, versioned lesson-scope records, and learning event ownership fields.

After supersession, lesson version `1` is `SUPERSEDED`, lesson version `2` is `ACTIVE`, prevention authority references version `2`, and durable Integrated Loop preflight returns version `2`. Innovation certification remains counted after promotion and rollback; active innovation count returns to zero and the prior active digest is restored.

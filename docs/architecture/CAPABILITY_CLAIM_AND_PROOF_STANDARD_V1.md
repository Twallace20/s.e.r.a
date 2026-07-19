# Capability Claim And Proof Standard v1

Certification target introduced by Milestone 16: `portable-offline-base-mvp-v1`.

Every S.E.R.A. capability claim must have an explicit proof state:

- `implemented`: source and focused proof exist, but the claim may still require a higher environment proof.
- `candidate`: source exists but proof is incomplete or intentionally scoped.
- `blocked`: S.E.R.A. must not advertise the claim as working.

The permanent rule is simple: a claim cannot move into certification by wording alone. It needs a bounded contract, an artifact trail, repeatability, and the right environment proof.

Milestone 16 adds `@sera/portable-base-mvp` as the claim-to-proof gate for the Base MVP package. It can build a portable release candidate and prove local-only provider, intake, and artifact boundaries. It does not certify a separate clean Windows launch unless actual clean-environment evidence is supplied.

Model output remains candidate intelligence only. A model cannot approve a package, certify a run, mutate terminal evidence, bypass operator review, or convert a blocked claim into a completed claim.

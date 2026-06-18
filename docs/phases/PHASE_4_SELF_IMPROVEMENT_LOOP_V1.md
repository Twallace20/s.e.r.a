# Phase 4 — Self-Improvement Loop v1

Phase 4 adds the first bounded self-improvement loop for S.E.R.A.

This is not unrestricted self-modification. The loop is intentionally conservative:

1. inspect the target file
2. create a source fingerprint artifact
3. create a patch proposal without mutating source, or apply a bounded patch
4. require a validation gate for apply mode
5. capture a backup before mutation
6. roll back on validation failure
7. write a self-improvement record artifact
8. refuse ambiguous or unvalidated changes

## New package

`@sera/self-improvement`

This package coordinates the Developer Worker and the evidence system to make self-improvement auditable and reversible.

## New CLI commands

```powershell
npm run sera -- self propose README.md "old" "new" 1
npm run sera -- self apply-cert README.md "old" "new" 1
```

`self propose` does not mutate the source file.

`self apply-cert` applies a patch only with a validation gate. The default CLI validation gate is `npm run certify`.

## Certification

The cert level upgrades to:

```txt
self-improvement-v1
```

The cert verifies proposal safety, validation-gate enforcement, successful validated apply, rollback on failed validation, and occurrence-mismatch blocking.

## Non-goals

Phase 4 does not add model-driven planning, autonomous file selection, multi-file refactors, or uncontrolled recursive changes.

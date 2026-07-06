# Phase175 - Gate Integrity Enforcement Proof v1

Phase175 hardens the direct ZIP closeout gate after Phase174 showed that a failed verifier could be followed by manual QA and merge.

## Guarantees

- Verifier must execute through Invoke-RequiredScript.
- QA must execute through Invoke-RequiredScript after verifier success.
- A missing required script writes BLOCKED and stops closeout.
- A verifier failure writes BLOCKED and prevents QA and merge.
- A QA failure writes BLOCKED and prevents merge.
- A fresh PASS_GUARANTEED generated after QA success is required before merge.
- Nested overlay paths are flattened before verifier and QA execution.
- CLOSED_CLEANLY is written only after safe merge, tag, push, and cleanup complete.

## Safety

This phase does not add secrets, token handling, paid services, dependency installation, service creation, or persistence changes.

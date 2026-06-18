# Legacy Failure Analysis

The legacy SERA/LocalAgent6 repo appears to have failed structurally, not conceptually.

## What went wrong

- Too many layers were built at once.
- Runtime artifacts and source code were mixed.
- Placeholder certs lived too close to active certs.
- The README and status docs became unreliable.
- Safety logic was scattered instead of centralized.
- Scripts multiplied without clear ownership.
- Fallbacks sometimes protected files but blurred success vs no-op.
- Model/provider work became tangled with runtime work.

## What was valuable

- Cert-first philosophy.
- Artifact evidence trail.
- Workspace/run concepts.
- Language adapter idea.
- Single-file implementation lessons.
- Template/app builder direction.
- Knowledge ingestion ambition.

## New rule

The legacy repo is a reference archive. It is not a base.

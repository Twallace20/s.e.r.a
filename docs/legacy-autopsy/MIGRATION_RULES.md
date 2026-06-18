# Migration Rules

Legacy ideas may migrate. Legacy mess may not.

A legacy component can migrate only if:

1. Its purpose is clear.
2. It fits a v2 package boundary.
3. It has a clean interface.
4. It has a safety policy.
5. It has tests or certs.
6. It does not depend on generated artifacts.
7. It does not bring stale scripts or backups.

First likely migration concepts:

- Artifact contracts.
- Workspace/run directory patterns.
- Language adapter model.
- Public API preservation checks.
- Template builder concepts.
- Knowledge ingestion concepts.

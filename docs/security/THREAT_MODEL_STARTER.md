# Starter Threat Model

## Assets

- User files.
- Source code.
- Secrets and API keys.
- Run artifacts.
- Local machine stability.
- Future memory/knowledge stores.

## Risks

- Writing outside workspace.
- Deleting important files.
- Running dangerous shell commands.
- Logging secrets.
- Trusting AI-generated code without validation.
- Letting generated runtime artifacts pollute source.
- Confusing no-op/revert behavior with success.

## First mitigations

- Workspace boundary checks.
- Command allowlist.
- Redaction.
- Artifact logs.
- Honest status model.
- Cert-first progression.

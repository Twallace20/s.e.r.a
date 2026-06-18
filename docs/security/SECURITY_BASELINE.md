# Security Baseline

The first secure base protects against the highest-risk legacy failure modes.

## Defaults

- Local-first.
- No model provider required.
- No internet by default.
- Workspace-only writes.
- Allowlisted commands only.
- Destructive commands require approval.
- Secrets are redacted before logs/artifacts.
- Every tool call is audited.
- Every blocked action is recorded.

## Not yet included

- Full authentication.
- Multi-user authorization.
- Encrypted secrets vault.
- Cloud audit logs.
- Container isolation.
- Plugin marketplace controls.

Those belong to later phases.

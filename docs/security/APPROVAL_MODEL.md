# Approval Model

The secure base supports three decisions:

- `allow`
- `block`
- `approval_required`

## Approval required examples

- Deleting files.
- Running destructive shell commands.
- Writing outside the workspace.
- Accessing internet-enabled tools.
- Modifying repository-level configuration.
- Touching secrets or credentials.

The first local version records approval-required actions as blocked until an approval interface exists.

# Tool Adapter Model

Every action S.E.R.A. takes must go through a controlled tool or bounded worker.

## Current tools

- `FileTool` reads and writes only inside the active workspace or approved project root.
- `ShellTool` runs only allowlisted commands, inside an approved cwd, with output redaction.

## Current workers

- `DeveloperWorker` inspects files, creates suggested edit/patch artifacts, applies bounded direct edits, captures backups, validates, and rolls back on failure.

## Rules

- no random shell execution
- no writes outside approved boundaries
- every tool call writes a tool event
- every safety decision writes a safety event
- destructive or high-risk commands require approval before future implementation
- direct developer changes must be reversible

# Repair / Hotfix Prompt Template

You are repairing a blocked S.E.R.A. AutoOps phase.

## Exact blocked packet

{{BLOCKED_PACKET}}

## Task

Diagnose the failure and generate exactly one of these:

- a repair ZIP,
- a hotfix ZIP,
- or a NEEDS_ATTENTION response if the issue is unsafe or ambiguous.

## Repair rules

Use a repair/hotfix ZIP only when the phase already applied code and failed validation or gate checks.

Use a fixed overlay ZIP when the failure happened before code application, such as:

- invalid ZIP structure,
- missing `repo/` root,
- branch setup failure,
- router misclassification,
- missing phase packet.

Use NEEDS_ATTENTION when the failure involves:

- credentials,
- tokens,
- paid services,
- GitHub/security settings,
- dependency or tool install approval,
- unclear branch state,
- repeated failure without enough evidence.

## Required ZIP contract

The ZIP must use this root:

```text
repo/
```

Repair/hotfix filenames must include:

```text
repair
```

or:

```text
hotfix
```

The ZIP must not contain:

```text
.git/
node_modules/
dist/
.sera-runs/
.sera-cert/
.sera-memory/
.sera-tasks/
.sera-knowledge/
secrets
credentials
tokens
```

## Response contract

Return:

1. diagnosis,
2. whether this is fixed overlay, repair, hotfix, rollback, or needs-attention,
3. downloadable ZIP if appropriate,
4. SHA256 if ZIP is provided,
5. exact routing folder.

Do not invent missing logs, branches, files, or successful validation.

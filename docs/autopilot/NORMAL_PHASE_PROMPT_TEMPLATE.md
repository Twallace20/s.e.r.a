# Normal Phase Prompt Template

You are continuing S.E.R.A. AutoOps development in the existing S.E.R.A. project thread.

## Current verified state

{{CURRENT_STATE}}

## Requested next phase

Phase: {{NEXT_PHASE_NUMBER}}
Name: {{NEXT_PHASE_NAME}}
Output type: overlay ZIP

## Task

Generate the next phase overlay as a downloadable ZIP.

The phase should be bounded to the requested purpose. Do not add unrelated capabilities. Do not skip safety checks. Do not claim tests passed unless the ZIP contains verification evidence or the user later provides terminal proof.

## Required ZIP contract

The ZIP must use this root:

```text
repo/
```

The ZIP should contain, when relevant:

```text
repo/.overlay/phase{{NEXT_PHASE_NUMBER}}-manifest.json
repo/.sera-proof/phase{{NEXT_PHASE_NUMBER}}/phase{{NEXT_PHASE_NUMBER}}-verify.json
repo/docs/...
repo/scripts/...
repo/<phase-overlay>.patch
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

## Required validation contract

The phase must be compatible with:

```text
npm run sera:gate
```

Include a phase verifier script when useful.

## Response contract

Return:

1. a downloadable ZIP,
2. SHA256,
3. short summary,
4. exact next command or routing instruction.

If you cannot determine the correct phase or repo state from the current evidence, do not generate a ZIP. Respond with `NEEDS_ATTENTION` and explain what is missing.

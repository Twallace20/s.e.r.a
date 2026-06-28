# S.E.R.A. Autopilot Prompt Contract

This contract defines how the laptop should prompt ChatGPT during AutoOps bridge runs.

## Core rule

The laptop does not ask vague questions. It sends grounded phase packets.

Every prompt must be created from:

- the latest handoff packet,
- the saved ChatGPT target configuration,
- the current requested phase number and phase name,
- the AutoOps ZIP packaging contract,
- explicit validation requirements,
- explicit stop conditions.

## Required prompt sections

1. **Current state** — latest CLOSED_CLEANLY, PASS, BLOCKED, or NEEDS_ATTENTION packet.
2. **Requested action** — generate overlay ZIP, repair ZIP, hotfix ZIP, or needs-attention response.
3. **Allowed changes** — bounded to the phase purpose.
4. **Forbidden changes** — credentials, GitHub/security settings, paid services, dependency installs unless explicitly approved, random browser targets.
5. **Packaging contract** — ZIP root must be `repo/`.
6. **Validation contract** — output must be compatible with `npm run sera:gate`.
7. **Response contract** — return ZIP link, SHA256, short summary, and stop if uncertain.

## Anti-hallucination rules

ChatGPT must not invent:

- repo state,
- missing files,
- passing tests,
- merge status,
- secrets,
- installed tools,
- browser state,
- approval decisions.

If the prompt lacks required evidence, the correct response is `NEEDS_ATTENTION`, not a fabricated ZIP.

## Normal prompt output expectation

A normal phase prompt should result in one overlay ZIP named like:

```text
s.e.r.a_phaseNNN_name_v1_overlay.zip
```

## Repair prompt output expectation

A blocked phase prompt should result in one repair or hotfix ZIP named like:

```text
s.e.r.a_phaseNNN_name_v1_repair.zip
s.e.r.a_phaseNNN_name_v1_hotfix.zip
```

## Required ZIP root

All AutoOps ZIPs must use:

```text
repo/
```

Not:

```text
s.e.r.a/
```

## Stop conditions

The bridge should stop and write a needs-attention packet if:

- no saved target URL exists,
- target allows random recent chat fallback,
- target allows new chat fallback,
- no handoff packet is available,
- multiple conflicting next phases are detected,
- a prompt asks for credentials or secrets,
- a response has no ZIP link,
- a ZIP does not use `repo/` root,
- a blocked packet does not identify the work branch.

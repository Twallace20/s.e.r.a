# Phase172 - Upload JSON Only Auto Loop Router v1

## Purpose

Phase172 adds the local router needed for the intended S.E.R.A. flow:

1. User saves one JSON command into `00_control_center\command_inbox`.
2. S.E.R.A. creates the ChatGPT handoff prompt.
3. The browser bridge enters the prompt into ChatGPT.
4. The artifact hunter looks for generated `.zip` and `.ps1` artifact controls.
5. S.E.R.A. downloads or moves the artifact into `13_chatgpt_downloads`.
6. The production runner continues through apply, verifier, QA Guarantee, safe merge, tag, cleanup, and final handoff.

## Artifact Hunter Targets

The browser bridge searches visible page controls and nearby text for:

- exact expected ZIP filename
- `.zip`
- `.ps1`
- `Download`
- `Copy`
- `aria-label`
- `title`
- `download`
- `href`
- `data-testid`
- role button controls

## Safety

Phase172 does not add credential access, token access, paid services, security setting changes, scheduled task enablement, or login boot automation.

## Next Proof

Phase173 should be the first end-to-end test:

JSON only -> prompt -> ChatGPT -> artifact download -> apply -> QA -> safe merge -> CLOSED_CLEANLY or BLOCKED.

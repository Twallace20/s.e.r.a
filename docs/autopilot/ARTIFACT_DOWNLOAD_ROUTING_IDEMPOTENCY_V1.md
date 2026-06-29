# Artifact Download Routing Idempotency v1

Phase 126 standardizes the ChatGPT artifact download contract so autopilot can repeat phase execution without duplicate prompts or route mistakes.

## Standard contract

- Assistant response exposes one visible control named `Download Phase {N} overlay ZIP`.
- Expected ZIP filename remains the authoritative artifact identity.
- The bridge searches for the standardized visible link before submitting a prompt.
- If a matching artifact is already visible, the bridge clicks it and skips resubmission.
- Normal phase overlay ZIPs route to `01_apply_approved`.
- Hotfix overlay ZIPs route to `02_hotfix_approved` only when an active phase work branch is checked out.
- Ambiguous or mismatched artifacts stop with evidence instead of guessing.

## Why this exists

The Phase 125 run showed that the prompt and artifact generation were healthy, but download/routing could create duplicate prompts or accidental hotfix routing. This phase makes those states idempotent and fail-closed.

## Owner-facing rule

If the link is visible but the browser cannot click it, S.E.R.A. should stop with a manual-click packet rather than resubmit the prompt.

# S.E.R.A. Autopilot Continuation Loop Contract

The continuation loop is the safe, repeatable runtime for owner-started autopilot.

## Inputs

The loop reads these files from `SERA-AutoOps/00_control_center`:

- `autopilot-state.json`
- `chatgpt-target.json`
- `phase-mission.json`
- `service-registry.json`
- `directives.md`
- `stop.flag` and `pause.flag` when present

It also uses the existing AutoOps queues:

- `15_bridge_outbox`
- `13_chatgpt_downloads`
- `01_apply_approved`
- `02_hotfix_approved`
- `06_handoff`
- `09_merge_pending`
- `17_needs_attention`

## Loop sequence

1. Read the control center.
2. Refuse to continue if stopped, paused, disabled, out of range, or missing the saved ChatGPT target.
3. Build a phase request prompt or use an explicit prompt file.
4. Submit the prompt through the saved ChatGPT thread only.
5. Wait for the artifact download to land in `13_chatgpt_downloads`.
6. Start the Download Router.
7. Start the AutoOps Runner.
8. Poll for PASS, BLOCKED, CLOSED_CLEANLY, and new needs-attention records.
9. If PASS and safe auto-merge is allowed, start the Safe Merge Auto Approver and runner.
10. If CLOSED_CLEANLY, record success and advance the bounded loop.
11. If BLOCKED, classify the issue.
12. If recoverable and attempts remain, generate a repair prompt and continue.
13. If risky, unclear, or repeated, write needs-attention and stop.

## Recoverable examples

- Download selector drift.
- Router classification mismatch.
- Validation failure with clear log evidence.
- Artifact package shape mismatch.
- Missing expected file in an overlay.
- A deterministic script syntax error introduced by a recent overlay.

## Owner-stop examples

- Security-sensitive account or repository settings.
- External billing or paid-service activation.
- Dependency/tool installation.
- Sensitive-value handling.
- Destructive commands.
- Ambiguous repair instructions.
- Repeated failure after configured repair attempts.

## Bounded execution

The loop defaults to one phase. Batch mode is bounded by `maxConsecutivePhases` in `autopilot-state.json` and by the CLI `-MaxPhases` value.

## Evidence

Every continuation attempt writes JSON evidence to:

`00_control_center/evidence`

Needs-attention decisions are mirrored to:

`17_needs_attention`

## Safe auto-merge

The loop does not directly merge branches. When safe auto-merge is enabled, it starts the existing Safe Merge Auto Approver task and lets the existing merge gate decide. This preserves owner-approval boundaries and avoids bypassing the established merge runner.

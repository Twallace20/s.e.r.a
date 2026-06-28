# Phase 111 — ChatGPT Bridge Dry-Run v1

## Purpose

Create the first bridge layer between S.E.R.A. AutoOps handoffs and ChatGPT phase/repair prompts without controlling the browser yet.

This phase turns AutoOps status packets into safe, owner-readable prompt files in:

```text
15_bridge_outbox
```

The output can be reviewed, copied, or used by a future bridge automation phase.

## What this phase adds

- Handoff status classification for `CLOSED_CLEANLY`, `BLOCKED`, `PASS`, and `NEEDS_ATTENTION`.
- Next-phase request prompt generation after `CLOSED_CLEANLY`.
- Repair request prompt generation after `BLOCKED`.
- Merge review prompt generation after `PASS`.
- Owner-attention summary prompt generation after `NEEDS_ATTENTION`.
- Bridge outbox packet writing.
- DOM selector observation records for the future DOM inspector phase.

## What this phase does not do

This phase does not:

- Open or control ChatGPT in a browser.
- Click, inspect, or mutate live DOM elements.
- Submit prompts.
- Download files.
- Execute Git push, tag, or remote branch deletion.
- Read credentials or tokens.
- Activate paid services.
- Self-approve work outside the safe AutoOps policy.

## Future DOM inspector notes

The current observed ChatGPT composer structure should be treated as research for the next phase only. A future DOM inspector can evaluate candidates like:

```text
div[contenteditable="true"][role="textbox"].ProseMirror#prompt-textarea
[role="textbox"][contenteditable="true"]
textarea[name="prompt-textarea"]
textarea[placeholder*="Ask"]
```

The screenshot-based observation suggests `Ctrl+F` is not reliable for the composer. The future bridge should inspect DOM elements, verify visibility/editability, focus the composer, paste text, and only then submit.

## Handoff-to-prompt mapping

```text
CLOSED_CLEANLY -> next-phase-request
BLOCKED        -> repair-request
PASS           -> merge-review-request
NEEDS_ATTENTION -> owner-attention-summary
```

## Level 1 autopilot fit

After Phase 110, Level 1 autopilot can move phase ZIPs through OneDrive, apply them, run `npm run sera:gate`, auto-approve safe PASS packets, and close phases.

Phase 111 adds the missing prompt generation layer, but still keeps the bridge dry-run only. Full ChatGPT Bridge automation remains a later phase.

# AutoOps R148 — Command Source Immutability + Stale Handoff Filter v1

R148 protects the phone command intake layer after R145–R147.

## Purpose

The Phase 143 smoke test showed the command inbox could end up containing a blocked-result payload instead of the original command contract. It also showed a stale `CLOSED_CLEANLY` handoff from an older phase could be treated as relevant to a new active command.

R148 installs a guard in front of `SERA Phone Control Watcher` so command files remain source-of-truth command contracts and old handoffs/results do not derail the current command.

## Runtime behavior

- Ignore example command files.
- Quarantine command-inbox files that are blocked/stopped result packets instead of runnable commands.
- Preserve command files as immutable source inputs.
- Write current command contract evidence.
- Clear stale `autopilot-command-last-result.json` only when it points to an unrelated old handoff/result.
- Delegate to the previous Phone Control Watcher action after guard checks pass.

## Safety

No browser refresh, no random chat fallback, no new-chat fallback, no credentials, no paid services, no GitHub settings changes, and no self-merge.

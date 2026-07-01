# AutoOps R149 — Canonical Bridge Prompt Initial Submit Delegation Guard v1

R149 patches the remaining post-lease failure in the phone-to-autopilot flow.

## Problem

R147 could create `generation-lease.json`, but the lease could point at a generic Phase 143 continuation prompt whose primary `Expected ZIP filename:` block did not match the active phone command. R145 then saw an active lease and intentionally skipped delegation to the original browser watcher, so no initial prompt submission/download path completed.

## Behavior

R149 makes the active command contract authoritative by:

- validating the primary `Expected ZIP filename:` block, not just any mention of the expected ZIP in owner guidance;
- quarantining hotfix prompts during an active command;
- creating a canonical bridge prompt when the generic prompt drifts;
- replacing an unsubmitted stale/mismatched lease;
- delegating to the raw saved ChatGPT Artifact Watcher exactly once for initial submission;
- preserving the R147/R145 chain for later download routing;
- preserving saved-target-only/no-random/no-new-chat safety.

## Safety

R149 does not touch credentials, tokens, paid services, external accounts, GitHub/security settings, owner-control boundaries, or production deployment.

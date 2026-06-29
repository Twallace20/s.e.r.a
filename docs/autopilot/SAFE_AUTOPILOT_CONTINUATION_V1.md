# Safe Autopilot Continuation v1

Phase 123 hardens the ChatGPT bridge after the control center began advancing phases from handoffs.

## Why this exists

ChatGPT may normalize a saved GPT URL by removing or changing the human-readable slug while preserving the same conversation id. Earlier bridge logic required the full path to match exactly, so a valid S.E.R.A. tab could be rejected as missing.

## What changed

- The bridge now treats two ChatGPT URLs as the same saved target when their `/c/<conversation-id>` values match on the same host.
- The artifact watcher uses the same conversation-aware matching when refreshing the saved thread.
- The bridge prefers the control-center target config and mirrors it to the legacy bridge target config when needed.
- A target normalizer can write the CDP-visible ChatGPT URL back to both saved target files.

## Safety boundaries

- No random recent chat fallback.
- No new-chat fallback.
- No account login automation.
- No dependency installs.
- No credential, paid-service, or repository-security changes.

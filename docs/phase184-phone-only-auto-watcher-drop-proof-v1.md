# Phase184 - Phone-only auto-watcher drop proof

Phase184 proves the post-Phase183 operating flow:

1. The auto watcher was already enabled and running.
2. The user saved or uploaded the Phase184 JSON into OneDrive command_inbox.
3. S.E.R.A. detected the command without manually launching `SERA_WATCH_COMMAND_INBOX.ps1`.
4. The browser bridge created the Phase184 request and targeted the saved ChatGPT conversation.
5. Closeout remains gated by verifier pass, QA `PASS_GUARANTEED`, `PASTEBACK_POSTED_TEXT_MATCH`, and safe merge.

## Safety

This overlay does not add a new persistence mechanism. It verifies the existing Phase183 automatic watcher artifacts and proof trail.

It must not create a Windows service, require admin-only installation, store credentials, use tokens, change paid services, install dependencies, or change GitHub/security settings.

## Expected artifacts

- `SERA_AUTO_WATCHER_RUNNER.ps1`
- `SERA_ENABLE_AUTO_WATCHER.ps1`
- `SERA_DISABLE_AUTO_WATCHER.ps1`
- `SERA_AUTO_WATCHER_STATUS.ps1`
- `SERA_START_WATCHER_NOW.ps1`
- Existing StartupFallback `.cmd` or scheduled task evidence
- Phase184 prompt under `15_bridge_outbox`
- Phase184 saved ChatGPT target under `00_control_center/chatgpt_targets`

## Closeout rule

`CLOSED_CLEANLY` is valid only after:

- `PHASE184_VERIFY PASS`
- fresh current-phase `PASS_GUARANTEED`
- `PASTEBACK_POSTED_TEXT_MATCH`
- safe merge/tag/push/cleanup

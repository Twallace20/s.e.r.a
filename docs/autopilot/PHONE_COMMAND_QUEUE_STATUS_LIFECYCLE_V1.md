# Phone Command Queue + Status Lifecycle v1

Phase 130 upgrades phone control from a single mutable command file to a small command queue that is easier to operate from a phone.

## Owner-facing model

Preferred folder:

```text
00_control_center/command_inbox/
```

Supported files:

```text
autopilot-command*.json
```

A phone command is runnable only when:

```json
{
  "enabled": true,
  "commandStatus": "new"
}
```

S.E.R.A. updates the same JSON file as it is consumed:

```text
new -> accepted -> running -> complete
```

If work cannot safely continue, the file is updated to:

```text
blocked
```

Non-runnable or old files may remain in the folder with `complete`, `blocked`, `ignored`, or `idle`.

## Why this exists

The previous scheduled watcher could notice a command, mark it as handled, and then get stuck if no phase handoff was produced. The command file did not show a clear lifecycle from the phone. Phase 130 fixes this by making the command itself the durable receipt.

## Compatibility

`00_control_center/autopilot-command.json` remains the default current-command file. Queue commands are mirrored there while running so the existing control center has a single current-command view.

## Safety behavior

- Only files with `commandStatus: "new"` are started.
- Duplicate runner attempts are blocked by `phone-control-run.lock.json`.
- Watcher overlap is blocked by `phone-control-watcher.lock.json`.
- Every consumed command is updated automatically to `complete` or `blocked`.
- `AUTOPILOT_STATUS.md` is written for phone-readable progress.
- Saved ChatGPT target rules and existing S.E.R.A. gates are preserved.

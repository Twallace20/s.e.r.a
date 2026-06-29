# Phone Autopilot Real-Life Proof Harness v1

The phone-control stack is only considered working when the real owner workflow works:

Phone save → OneDrive sync → laptop watcher → prompt/run → artifact/handoff → JSON final status.

Phase 132 hardens the weak points found by the first phone test after Phase 131.

## Important behavior

- `command_inbox/autopilot-command*.json` files are scanned.
- Invalid command files are quarantined and do not stop valid commands.
- Windows script paths are resolved through `fileURLToPath`, preventing `C:\C:\...` path construction.
- If the phone job cannot start, the command is marked `blocked` with a reason instead of remaining `running` forever.

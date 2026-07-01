# AutoOps R146 — Phone Command Intake Handoff + Stale Running Guard v1

## Purpose

R146 repairs the next observed autopilot failure after R145.

R145 protected the ChatGPT artifact watcher from refresh/resubmit interruption. The fresh Phase 143 retry showed a different failure: the phone JSON was present, readable, and accepted into control state, but the run remained `running` without creating a generation lease, fresh bridge prompt, ZIP download, apply packet, or fresh final handoff.

R146 installs a guarded wrapper around **SERA Phone Control Watcher** so phone command intake is no longer a blind handoff.

## What R146 enforces

- Command files in `00_control_center/command_inbox` must be locally readable.
- JSON files must be stable by size and SHA-256 before intake.
- Example files are ignored.
- A command has one active command ID/run nonce.
- Intake writes deterministic evidence with command ID, expected ZIP, phase slug, run nonce, source path, SHA-256, file size, and stability result.
- A stale `running` state without progress is escalated once to `17_needs_attention`.
- The wrapper does not submit prompts or refresh ChatGPT.
- The wrapper delegates to the original Phone Control Watcher only when intake is stable and there is no stale active command.

## Why this is not full autopilot yet

R146 only makes phone command intake and handoff safer. It does not prove full batch mode. Full autopilot remains gated behind R147–R149.

## Safety boundaries

R146 preserves:

- saved ChatGPT target only
- no random recent chat fallback
- no new-chat fallback
- no credentials, tokens, paid services, or external account changes
- no GitHub/security settings changes
- no self-merge
- stop when owner decision is required

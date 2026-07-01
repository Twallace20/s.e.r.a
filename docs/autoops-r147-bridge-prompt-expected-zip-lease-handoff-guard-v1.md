# AutoOps R147 — Bridge Prompt Expected ZIP + Lease Handoff Guard v1

## Purpose

R147 closes the handoff gap found after R145 and R146. The phone command is accepted and a bridge prompt is produced, but the bridge prompt can drift from the command contract and no `generation-lease.json` is created before the artifact watcher runs.

## Runtime behavior

R147 wraps `SERA ChatGPT Artifact Watcher` before delegation. On each run it:

1. Reads the active `autopilot-command.json`.
2. Finds the latest Phase bridge prompt.
3. Verifies the prompt contains the exact `expectedZipFilename` from the command.
4. If the prompt is mismatched, archives it and writes a corrected prompt from the command contract.
5. Creates `00_control_center/generation-lease.json` with commandId, runNonce, phaseSlug, expected ZIP, prompt path, and lease timestamps.
6. Writes deterministic evidence.
7. Delegates to the preserved watcher action.

## Safety

R147 preserves saved ChatGPT target only, no random recent chat fallback, no new-chat fallback, no credentials/tokens/paid services, no GitHub/security settings changes, no owner-control boundary changes, and no self-merge.

## Why this was needed

The R146 retry produced a bridge prompt, but the prompt title and expected ZIP were generated from `Phase 143 Safe Autopilot Continuation v1` while the phone command required `phase143_phone_batch_autopilot_smoke_test_v1`. R147 makes the command contract authoritative before browser submission.

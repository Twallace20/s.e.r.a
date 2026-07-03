# Phase170 - Production Runner JSON Pickup Fix v1

## Purpose

Phase170 fixes the remaining break discovered by Phase169: a user-provided JSON file placed into `command_inbox` is valid, and the direct unified loop can create `REQUEST_READY`, but the normal VBS AutoOps runner does not process that JSON into `REQUEST_READY`.

This phase installs a production runner entrypoint that wraps the proven command chain into one reusable runner. The runner starts from uploaded JSON in `command_inbox`, generates `REQUEST_READY`, copies the prompt to the clipboard, targets the exact ZIP, waits for the exact ZIP when requested, queues it into `01_apply_approved`, starts apply, runs the verifier and QA Guarantee, moves merge approval only after `PASS_GUARANTEED`, waits only for `CLOSED_CLEANLY`, and copies the final handoff or diagnostics to clipboard.

## Phase Identity

- Phase: 170
- Phase slug: `phase170_production_runner_json_pickup_fix_v1`
- Phase name: `s.e.r.a_phase170_production_runner_json_pickup_fix_v1_overlay`
- Work branch: `work/phase170-production-runner-json-pickup-fix-v1`
- Tag: `phase-170-production-runner-json-pickup-fix-v1`
- Expected ZIP: `s.e.r.a_phase170_production_runner_json_pickup_fix_v1_overlay.zip`
- Expected command JSON: `autopilot-command-phase170_production_runner_json_pickup_fix_v1.json`

## Background Evidence

Phase169 proved the full local continuation path once the generic orchestrator is invoked. It also exposed the remaining gap:

`uploaded JSON in command_inbox -> VBS production runner starts -> no REQUEST_READY appears`

Phase170 preserves the safety gates proven in Phase169 and moves the direct proven path into the production runner entrypoint.

## New Runner Components

- `scripts/sera-production-json-pickup-runner-v1.ps1`
  - Reads command JSON from `command_inbox` by invoking the unified loop `RunOnce` path.
  - Validates the generated `artifact-watch-request.json`.
  - Copies the generated prompt to `CURRENT_CHATGPT_HANDOFF.prompt.md` and the clipboard.
  - Supports `-WaitForZipMinutes` so the same process can wait for the exact ZIP and continue automatically.
  - Infers branch, verifier, QA script, tag, and phase token from the command contract.
  - Calls `scripts/sera-json-to-closed-cleanly-orchestrator-v1.ps1` once the exact ZIP is present.

- `scripts/repair-sera-autoops-runner-launcher-v1.ps1`
  - Backs up the existing `SERA_AutoOps_Runner-action1.vbs` launcher.
  - Rewrites it to call `sera-production-json-pickup-runner-v1.ps1`.
  - Uses the existing launcher path without enabling scheduled tasks and without adding startup persistence.

- `scripts/phase170-production-runner-json-pickup-fix-v1.ps1`
  - Runs verifier and self-test.
  - Repairs the VBS launcher.
  - Captures production pickup diagnostic evidence.
  - Writes `PASS_GUARANTEED` and `MERGE_PENDING` only when the runner fix and phase proof pass.

## Proven Markers

This phase covers these required markers:

- `command_inbox`
- `REQUEST_READY`
- `WAITING_FOR_ZIP`
- `Set-Clipboard`
- `CURRENT_CHATGPT_HANDOFF.prompt.md`
- `exact ZIP targeting`
- `ZIP_READY_FOR_APPLY`
- `01_apply_approved`
- `verifier execution`
- `QA Guarantee`
- `PASS_GUARANTEED`
- `SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED`
- `WAIT_ONLY_CLOSED`
- `CLOSED_CLEANLY`
- `SERA_AutoOps_Runner-action1.vbs`
- `production runner entrypoint`

## Acceptance Criteria

- Phase169 is already `CLOSED_CLEANLY`.
- A Phase170 user-provided JSON exists in `command_inbox` and produces `REQUEST_READY` through the direct fallback evidence path.
- The overlay installs the production JSON pickup runner.
- The VBS launcher is repaired to call the production JSON pickup runner.
- The runner can self-test without credentials, paid services, dependency installs, security setting changes, or startup persistence.
- The exact Phase170 ZIP is queued into `01_apply_approved`.
- The overlay applies and produces a same-phase `PASS` packet.
- The verifier passes.
- QA Guarantee creates `PASS_GUARANTEED`.
- Merge approval moves only after `PASS_GUARANTEED`.
- Closeout waits only for `CLOSED_CLEANLY`.
- Final handoff or diagnostics are copied to clipboard.

## Safety Boundaries

Phase170 does not introduce credentials, tokens, paid services, dependency installs, security setting changes, uncontrolled browser automation, scheduled task enablement, or startup persistence.

## Next Proof

Phase171 should be able to start from a freshly uploaded JSON and use the repaired VBS production runner without the direct unified-loop bypass.

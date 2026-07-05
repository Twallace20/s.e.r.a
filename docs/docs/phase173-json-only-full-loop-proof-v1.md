# Phase173 - JSON Only Full Loop Proof v1

## Purpose

Phase173 proves the first true S.E.R.A. full loop after Phase172:

1. A command JSON is saved into `00_control_center\command_inbox`.
2. `SERA_RUN_UPLOADED_JSON_LOOP.ps1` creates `REQUEST_READY` without manual prompt paste.
3. The ChatGPT browser bridge submits the generated phase prompt.
4. The artifact hunter clicks or captures the exact expected overlay ZIP.
5. S.E.R.A. applies the ZIP, runs verifier, runs QA Guarantee, safely merges, tags, cleans up, and writes the final handoff.

## Hotfix Included

The first Phase173 run exposed a useful bug: the artifact hunter found a stale `.ps1` repair script and returned success before the exact Phase173 ZIP was downloaded.

Phase173 patches the browser bridge so that when `ExpectedFilename` is supplied, the bridge only accepts the exact expected filename. Generic `.zip` or `.ps1` fallback remains available for recovery or artifact-hunter diagnostics only when no exact filename is required.

## Safety

This phase does not add credentials, token access, paid service setup, dependency installs, security setting changes, scheduled task enablement, login boot persistence, or uncontrolled browser automation.

## Completion Rule

`PASS_GUARANTEED` is required before safe merge approval. `CLOSED_CLEANLY` is the only closeout state.

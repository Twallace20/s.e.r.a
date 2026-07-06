# Phase 176 - Repeatable JSON-Only Full Loop Smoke Proof v1

## Purpose

Run a clean repeatability smoke test of the JSON-only full loop after Phase175 gate integrity enforcement.

## Expected ZIP

`s.e.r.a_phase176_repeatable_json_only_full_loop_smoke_proof_v1_overlay.zip`

## Required proof

- JSON command pickup from `command_inbox`.
- `REQUEST_READY` prompt generation.
- ChatGPT browser bridge prompt submission.
- Exact real download control clicked for Phase176 ZIP.
- Fresh ZIP download into `13_chatgpt_downloads`.
- Direct ZIP-to-closeout execution.
- Nested overlay path flattening remains active.
- Verifier runs and passes before QA.
- QA runs only after verifier success.
- Fresh `PASS_GUARANTEED` is created after QA success.
- `SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED`.
- `WAIT_ONLY_CLOSED`.
- `CLOSED_CLEANLY`.

## Safety guardrails

This overlay does not add credentials, tokens, paid services, dependency installs, security setting changes, scheduled task enablement, login boot persistence, or uncontrolled browser automation.

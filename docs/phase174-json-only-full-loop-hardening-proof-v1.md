# Phase174 - JSON Only Full Loop Hardening Proof v1

## Purpose

Phase174 repeats the JSON-only full loop proven in Phase173 and hardens the remaining production gaps:

1. Overlay ZIPs must be copied from a `repo/` root.
2. Nested overlay paths such as `scripts/scripts`, `docs/docs`, `.overlay/.overlay`, and `.sera-proof/.sera-proof` must be flattened before verifier execution.
3. Verifier and QA paths must resolve before any merge is allowed.
4. Direct ZIP closeout must refuse to merge without a real `PASS_GUARANTEED` generated after verifier and QA success.
5. The full-loop router must use direct ZIP closeout after browser artifact download instead of the old VBS/orchestrator path.

## Proof Criteria

A valid Phase174 run must show:

- JSON command picked up from `00_control_center\command_inbox`.
- `REQUEST_READY` created for Phase174.
- Browser bridge connected to ChatGPT.
- Artifact hunter clicked/downloaded the exact Phase174 ZIP.
- ZIP appeared in `13_chatgpt_downloads`.
- Direct ZIP closeout applied the overlay.
- Nested paths were flattened before verifier checks.
- Verifier passed.
- QA produced `PASS_GUARANTEED`.
- Merge/tag/push/cleanup happened only after `PASS_GUARANTEED`.
- Final handoff is `CLOSED_CLEANLY`.

## Safety

Phase174 does not add credential access, token access, paid services, dependency installs, security setting changes, scheduled task enablement, login boot persistence, or uncontrolled browser automation.

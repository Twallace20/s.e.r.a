# Phase172 - Upload JSON Only Auto Loop Router v1

## Purpose

Phase172 creates the stable local S.E.R.A. loop router for the desired workflow:

USER_UPLOADS_JSON_TO_COMMAND_INBOX -> SERA_RUN_UPLOADED_JSON_LOOP -> REQUEST_READY -> CHATGPT_BROWSER_BRIDGE -> ZIP_DOWNLOADED -> DIRECT_ZIP_TO_CLOSED_CLEANLY -> FINAL_HANDOFF

This phase turns the proven Phase168-Phase171 pieces into one router so future phases can start from a user-provided JSON file and proceed to CLOSED_CLEANLY or BLOCKED with a handoff copied to clipboard.

## Scope

Phase172 adds:

- `SERA_RUN_UPLOADED_JSON_LOOP.ps1` as the stable one-command entrypoint.
- `scripts/sera-full-auto-json-loop-router-v1.ps1` as the main router.
- `scripts/sera-chatgpt-browser-bridge-v1.ps1` to submit prompts and click/download ZIP artifacts when a Chrome or Edge DevTools endpoint is available.
- `scripts/sera-direct-zip-to-closed-cleanly-v1.ps1` to apply ZIP overlays, run verifier and QA, move merge approval only after PASS_GUARANTEED, merge/tag/cleanup, and write CLOSED_CLEANLY without relying on the broken VBS launcher.
- Verification, QA, and status scripts for Phase172.

## Browser bridge download targeting

The browser bridge searches for a ChatGPT download control using multiple safe selectors and naming conventions:

- exact expected ZIP filename, for example `s.e.r.a_phase172_upload_json_only_auto_loop_router_v1_overlay.zip`
- button text beginning with `Download ` and containing `.zip`
- visible text, aria-label, title, href, and download attributes
- parent button/link role wrappers such as `button`, `a`, and `[role="button"]`
- ChatGPT response styles where the visible control is a button containing the text `Download <filename>.zip`

The bridge does not read credentials or tokens. It uses the already-open browser page when Chrome or Edge DevTools is available. If browser control is unavailable, it writes a BLOCKED diagnostic and copies it to clipboard rather than guessing or clicking randomly.

## Safety gates

Phase172 preserves the gates proven earlier:

- exact phase and JSON command validation
- stale request archival before generating REQUEST_READY
- exact ZIP filename targeting
- optional SHA256 validation when supplied
- direct overlay application on an isolated work branch
- verifier execution before QA Guarantee
- PASS_GUARANTEED required before merge approval
- safe merge/tag/cleanup only after PASS_GUARANTEED
- CLOSED_CLEANLY or BLOCKED final handoff copied to clipboard

## Explicit exclusions

Phase172 avoids credentials, tokens, paid services, dependency installs, security setting changes, scheduled task enablement, startup persistence, and uncontrolled browser automation.

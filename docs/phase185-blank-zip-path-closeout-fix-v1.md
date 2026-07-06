# Phase 185 - Blank ZIP Path Closeout Fix

This phase fixes the remaining automated-loop failure where the browser bridge downloads the exact overlay ZIP, but the direct closeout path receives a blank ZIP argument and writes `ZIP missing:`.

## Required behavior

- If the ZIP argument is a full path, use it.
- If the ZIP argument is only a filename, resolve it under `13_chatgpt_downloads`.
- If the ZIP argument is blank, resolve the expected ZIP using the phase slug / expected filename.
- Never write a blocked reason of `ZIP missing:` with an empty path.
- Preserve verifier, QA, pasteback text match, and safe merge gates.

## Markers

- `ZIP_PATH_RESOLVED_FROM_EXPECTED_FILENAME`
- `ZIP_PATH_RESOLVED_FROM_DOWNLOADS13`
- `ZIP_PATH_ARGUMENT_WAS_BLANK_RECOVERED`
- `NO_EMPTY_ZIP_MISSING_REASON`

## Safety

No Windows service, admin-only install, credentials, tokens, paid services, dependency installs, or security setting changes are added.

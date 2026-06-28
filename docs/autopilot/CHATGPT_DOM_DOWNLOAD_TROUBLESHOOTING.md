# ChatGPT DOM Download Troubleshooting

S.E.R.A. uses the saved ChatGPT thread as a controlled bridge target. The laptop must not guess where to click. It should prefer explicit evidence and fail closed when the page state is ambiguous.

## Download candidate priority

1. Candidate appears in the latest assistant response.
2. Candidate text or href contains the expected ZIP name.
3. Candidate text or href contains `.zip`.
4. Candidate is a visible download button or link.
5. Candidate is not from a random page region.

## Evidence to capture

When a download is found or blocked, evidence should include:

- expected ZIP name,
- selected DOM candidate,
- all top candidates,
- latest assistant text snippet,
- page title,
- redacted target URL,
- downloaded file path when successful,
- failure reason when blocked.

## Fail-closed rules

Write `NEEDS_ATTENTION` instead of continuing when:

- no saved target tab is found,
- more than one matching target tab is open,
- composer cannot be found,
- no ZIP/download candidate appears before timeout,
- a click target disappears,
- the downloaded file does not match the expected ZIP name, or
- the prompt or page asks for unsafe actions.

## What this does not solve yet

Phase 115 improves the download DOM layer. The next separate step should validate the full continuation loop: latest closed handoff → next prompt → submit → download → route → AutoOps.

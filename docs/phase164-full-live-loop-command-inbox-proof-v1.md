# Phase 164 - Full Live Loop + Command Inbox Proof v1

## Purpose

Phase 164 is the first full live loop proof candidate after Phase 163 repaired QA hard-stop integrity. It hardens the command inbox path, stale request handling, bridge/download ceiling behavior, and terminal handoff surfacing.

## What this phase adds

1. A command inbox discovery verifier that selects the smallest runnable phase above the latest `CLOSED_CLEANLY` phase.
2. Safe phase parsing from `phase`, `phaseStart`, `phaseEnd`, `phaseSlug`, and filename fallback.
3. Fail-closed handling when no runnable command exists. Stale request and lease files are removed and a terminal handoff is written.
4. Artifact request freshness validation so stale Phase162 or Phase163 request artifacts cannot be reused.
5. Terminal handoff surfacing to `CURRENT_CHATGPT_HANDOFF.md` and `CURRENT_CHATGPT_HANDOFF.prompt.md`.
6. Bridge behavior guidance: wait limits are ceilings. If the exact ZIP lands in `13_chatgpt_downloads`, the flow should stop waiting immediately.
7. Visible-artifact fallback guidance for the known case where ChatGPT says `Done` and includes SHA, but the browser helper reports `candidateCount: 0`.
8. A full-loop simulation mode that proves the command-to-closeout path without live ChatGPT.
9. Phase163 hard-stop preservation: QA failure blocks merge movement and runner closeout.

## Runtime paths

- Command inbox: `00_control_center\command_inbox`
- Artifact request: `00_control_center\artifact-watch-request.json`
- Lease: `00_control_center\artifact-generation-lease.json`
- Downloads: `13_chatgpt_downloads`
- Apply approved: `01_apply_approved`
- Handoff: `06_handoff`
- Current handoff: `00_control_center\CURRENT_CHATGPT_HANDOFF.md`
- Current prompt: `00_control_center\CURRENT_CHATGPT_HANDOFF.prompt.md`

## Full live loop expectation

The desired path is:

```text
command JSON
-> sequential command selection
-> prompt/request/lease
-> saved ChatGPT target only
-> exact ZIP in 13_chatgpt_downloads
-> route/apply
-> PASS
-> trusted QA Guarantee
-> PASS_GUARANTEED
-> safe auto-approval
-> CLOSED_CLEANLY
-> CURRENT_CHATGPT_HANDOFF.md surfaced
```

## Safety boundaries

This phase does not change credentials, tokens, paid services, dependency installs, GitHub/security settings, owner-control policy, or production deployment settings. Saved ChatGPT target only remains required. Random recent chat and new chat fallback remain disabled.

## Verification

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\verify-phase164-full-live-loop-command-inbox-proof-v1.ps1
```

The verifier runs a local self-test without calling ChatGPT, requiring a live ZIP, or changing production settings.

## Phase 165 readiness

After Phase164 closes cleanly, the system is ready for a live autopilot proof with minimal manual fallback. If the bridge still misses the artifact, the next phase should focus only on the browser helper artifact-click/download logic, because command discovery, stale request handling, and QA hard-stop will already be proven.

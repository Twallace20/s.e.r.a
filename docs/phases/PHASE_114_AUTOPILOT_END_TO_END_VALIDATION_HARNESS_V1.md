# Phase 114 — Autopilot End-to-End Validation Harness v1

## Purpose

Phase 114 validates the practical S.E.R.A. AutoOps bridge loop introduced by Phases 112 and 113.

It does not add broader autonomy. It standardizes how the laptop asks ChatGPT for the next phase or a repair ZIP so the system keeps developing from grounded evidence instead of vague prompts.

## What this phase proves

Phase 114 adds a validation harness for the normal and blocked flows:

1. The bridge target is a saved, exact ChatGPT conversation.
2. Normal next-phase prompts are generated from a strict contract.
3. Blocked repair prompts are generated from the exact BLOCKED handoff packet.
4. Prompts include the required ZIP packaging contract: `repo/` at the root.
5. Prompts tell ChatGPT to fail closed instead of inventing missing repo state.
6. The bridge can keep the loop standard: prompt, ZIP, download, route, apply, gate, merge, close.

## Non-goals

Phase 114 must not:

- submit browser prompts by itself,
- download files by itself,
- add new credential handling,
- bypass `SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE=true`,
- merge branches,
- auto-approve unsafe work,
- generate code without the current phase state,
- create new ChatGPT conversations, or
- use random recent chats as fallback.

Phase 113 remains the submit/download bridge. Phase 114 only validates and standardizes the prompt/input layer for that bridge.

## Prompt discipline

Every prompt generated for ChatGPT must include:

- latest CLOSED_CLEANLY or BLOCKED handoff summary,
- exact requested output type: overlay, repair, hotfix, or needs-attention,
- required ZIP root: `repo/`,
- no `node_modules`, `dist`, `.git`, runtime folders, or secrets,
- validation requirement: `npm run sera:gate`,
- instruction to avoid guessing when evidence is missing,
- instruction to return a downloadable ZIP and SHA256.

## Normal phase loop

```text
CLOSED_CLEANLY
→ build next phase prompt from template
→ write prompt to 15_bridge_outbox
→ Phase 113 submits prompt when explicitly enabled
→ ChatGPT returns overlay ZIP
→ Phase 113 downloads ZIP to 13_chatgpt_downloads
→ router sends ZIP to 01_apply_approved
→ AutoOps applies/gates/merges/closes
```

## Blocked repair loop

```text
BLOCKED
→ build repair prompt from exact blocked handoff
→ write prompt to 15_bridge_outbox
→ Phase 113 submits prompt when explicitly enabled
→ ChatGPT returns repair/hotfix ZIP
→ Phase 113 downloads ZIP to 13_chatgpt_downloads
→ router sends repair/hotfix ZIP to 02_hotfix_approved only when action_required exists
→ AutoOps applies repair on the blocked branch
→ gate reruns
```

## Commands

Verify Phase 114 static contract:

```powershell
node scripts/phase114-verify.mjs
```

Build a normal next-phase prompt:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\phase114-build-bridge-prompt.ps1 -Mode Normal -NextPhaseNumber 115 -NextPhaseName "Intentional Blocked Repair Loop Smoke Test v1"
```

Build a repair prompt from the newest BLOCKED handoff:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\phase114-build-bridge-prompt.ps1 -Mode Repair
```

Write the Phase 115 test prompt:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\phase114-write-phase115-test-prompt.ps1
```

## Definition of done

Phase 114 counts only if:

- the overlay applies from a `repo/` root ZIP,
- `npm run sera:gate` passes,
- `node scripts/phase114-verify.mjs` passes,
- the prompt contract files exist,
- normal and repair prompt builders are present,
- generated prompts refuse to invent repo state,
- the phase closes cleanly through AutoOps.

# Phase 163 — QA Guarantee Hard Stop Integrity Hotfix v1

## Purpose

Phase163 repairs the integrity gap discovered during Phase162 closeout.

Phase162 reached `PASS`, then the QA Guarantee verifier failed with a PowerShell parameter error. A `QA_BLOCKED` handoff was correctly created, but the pasted interactive runner continued executing later lines and created a false `PASS_GUARANTEED`, moved `MERGE_PENDING` to `MERGE_APPROVED`, and allowed `CLOSED_CLEANLY`.

Phase163 makes QA closeout fail closed.

## What this phase adds

- A reusable single-file QA Guarantee closeout runner.
- Verifier-output classification that blocks on PowerShell errors, `NativeCommandError`, parameter binding errors, missing command errors, and missing explicit JSON status `PASS`.
- Hard stop after `QA_BLOCKED`.
- A guard preventing `PASS_GUARANTEED` when a `QA_BLOCKED` exists for the same run.
- A guard preventing `MERGE_PENDING` movement after `QA_BLOCKED`.
- `CURRENT_CHATGPT_HANDOFF.md` and `CURRENT_CHATGPT_HANDOFF.prompt.md` writing for `QA_BLOCKED` and `PASS_GUARANTEED`.
- Regression verifier cases for pass and fail scenarios.

## Commands

Run the verifier after applying the overlay:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\verify-phase163-qa-guarantee-hard-stop-integrity-hotfix-v1.ps1
```

Use the closeout runner from a script file, not pasted interactive lines:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\phase163-qa-guarantee-hard-stop-integrity-hotfix-v1.ps1 `
  -RepoRoot "C:\Users\18123\Documents\SERA-Core\s.e.r.a" `
  -AutoOpsRoot "$env:USERPROFILE\OneDrive\SERA-AutoOps" `
  -PhaseName "s.e.r.a_phase163_qa_guarantee_hard_stop_integrity_hotfix_v1_overlay" `
  -Branch "work/phase163-qa-guarantee-hard-stop-integrity-hotfix-v1" `
  -Verifier "scripts\verify-phase163-qa-guarantee-hard-stop-integrity-hotfix-v1.ps1"
```

## Phase164 gate

Phase164 full live loop testing is authorized only after Phase163 reaches `CLOSED_CLEANLY` with a trusted QA Guarantee run.

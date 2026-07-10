# Phase 199 — Post Closeout Clean Repo Endurance Autopilot v1

## Purpose

Phase199 proves the third uninterrupted S.E.R.A. autopilot loop and hardens the closeout contract so production autopilot does not leave tracked pointer files dirty after `CLOSED_CLEANLY`.

Target loop:

fresh command JSON → watcher → saved ChatGPT target → confirmed prompt submit → exact ZIP download → SHA verification → verifier → QA → merge → push main → push tag → remote main verification → remote tag verification → final `CLOSED_CLEANLY` → clean repo state.

## Trusted baselines

- Phase198 tag `phase-198-second-consecutive-full-autopilot-production-stability-proof-v1` must remain at `edbb3d2e842a1353eb88955b8cc702b92e0ce287`.
- Browser-submit hotfix baseline must be in history at `5348b8410e2101d20567c6356eef09404fc295cb`.

## Required gates

1. Exact expected ZIP filename: `s.e.r.a_phase199_post_closeout_clean_repo_endurance_autopilot_v1_overlay.zip`.
2. ZIP root must be `repo/`.
3. `.overlay/manifest.json` and `.sera-proof` proof file must be present.
4. Verifier must pass before QA.
5. QA must pass before merge.
6. `CLOSED_CLEANLY` requires merge, push main, push tag, remote main verification, remote tag verification, final handoff identity, exact ZIP SHA, and post-closeout clean git status.
7. Pointer files `CURRENT_PHASE_CLOSED_CLEANLY.md` and `CURRENT_PHASE_FINAL_HANDOFF.md` must be archived/reset/cleaned instead of remaining dirty after closeout.
8. No random recent chat fallback and no new chat fallback are allowed.

## Proof artifacts

- `scripts/sera-post-closeout-clean-repo-endurance-autopilot-v1.ps1`
- `scripts/phase199-post-closeout-clean-repo-endurance-autopilot-fixtures-v1.ps1`
- `scripts/sera-phase199-current-phase-pointer-clean-repo-proof-v1.ps1`
- `scripts/verify-phase199-post-closeout-clean-repo-endurance-autopilot-v1.ps1`
- `scripts/qa-phase199-post-closeout-clean-repo-endurance-autopilot-v1.ps1`

## Marker contract

- `PHASE199_THIRD_FULL_AUTOPILOT_PROOF`
- `PHASE199_BROWSER_SUBMIT_HOTFIX_BASELINE_VERIFIED`
- `PHASE199_POINTER_DIFF_CLEAN_REPO_VERIFIED`
- `PHASE199_POST_CLOSEOUT_GIT_STATUS_REQUIRED`
- `PHASE199_FINAL_HANDOFF_IDENTITY_VERIFIED`

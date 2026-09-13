# S.E.R.A. Current Status

> **Live continuity note.** Repository/runtime truth and durable proof evidence outrank this file. Update this note after accepted milestone transitions; do not use old handoff snapshots as current authority.

Last updated: 2026-09-13

## Active development lane

- Repository: `Twallace20/s.e.r.a`
- Active branch: `sera/runtime-capability-composition-v1`
- Current milestone: **M16 — Portable / certifiable Base MVP proof**
- **M16-A: complete**
- **M16-B2: ACTIVE / NOT YET CLOSED**

The current branch is actively advancing M16-B2. Recent repository work is focused on the restricted-user / privileged-observer proof chain, including post-restart Node process identity evidence.

Continue from the current repository, runtime, and preserved proof state. Do **not** restart M16-A or discard previously accepted M16-B2 evidence unless current repository/runtime truth proves that necessary. Failed or non-promotable proof roots remain historical evidence and must not be silently rewritten into success.

M16-B2 must close on its actual acceptance evidence. Do not broaden a same-host/certified-profile B2 result into a cross-host, clean-machine, different-hardware, separate-Windows-install, or universal-Windows portability claim before the later M16 acceptance conditions prove those claims.

## AUTO V1 relationship

AUTO V1 is **independently certified, durably versioned, and frozen** in its separate controller repository.

Certified AUTO V1 commit:

`52d4260ed01dabbbfe69e7b8f0a734abdc4e76ee`

AUTO V1 is **not yet part of the S.E.R.A. runtime**. Operational integration begins only after M16 certification, starting with M17, where AUTO may serve as S.E.R.A.'s governed development controller/control plane while preserving component boundaries, rollback, versioning, and S.E.R.A. runtime independence. This integration does not redefine the product acceptance scope of M17.

## Forward execution path

`M16-B2 → M16-B3 → M16-B4 → M16-C1 → M16-C2 → M16-C3 → M17 → M18 → M19 → M20 → M21 → M22 → M23 → M24`

M24 remains the Personal + Professional V1 finish line.

## Authority and continuity order

When sources disagree, use this order:

1. Current repository and runtime truth
2. Durable proof / certification artifacts
3. Current implementation and tests
4. This live status note
5. Historical handoffs, backup notes, and chat history

Conversation history is continuity context, not permission to override current code, runtime state, or accepted evidence.

## Historical status files

The following root files preserve an older Phase190 closeout and are **historical snapshots, not current project status**:

- `CURRENT_PHASE_FINAL_HANDOFF.md`
- `CURRENT_PHASE_CLOSED_CLEANLY.md`

They are retained for audit/history and point back to this file for live project state.

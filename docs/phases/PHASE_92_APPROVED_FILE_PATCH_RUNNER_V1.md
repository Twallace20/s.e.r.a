# Phase 92 — Approved File Patch Runner v1

## Purpose

Phase 92 adds the first approved file patch runner to S.E.R.A.'s local execution spine.

The goal is not broad source mutation yet. The goal is to prove S.E.R.A. can apply an exact owner-approved patch plan inside a contained workspace, verify the file fingerprint, apply a bounded text replacement, write a backup, validate the result, roll back when validation fails, and record evidence.

## Why this phase matters

Phase 90 gave S.E.R.A. her first approval-gated local command execution.
Phase 91 gave S.E.R.A. approved validation execution.
Phase 92 gives S.E.R.A. a controlled patch hand: she can modify an approved sandbox file through a precise patch plan while preserving safety boundaries.

This is the bridge toward branch-scoped development work. It proves the patch mechanism before S.E.R.A. is allowed to patch real repository source files in later branch phases.

## What Phase 92 adds

- Approved patch plan catalog.
- Owner approval record requirement.
- Exact patch-plan matching.
- Safe relative target path enforcement.
- Workspace containment checks.
- Expected SHA-256 verification before patching.
- Expected occurrence verification before replacement.
- Bounded text-only replacement.
- Backup capture before mutation.
- Rollback on validation failure.
- Patch evidence record.
- Operator-console status binding.
- Integration tests for success and fail-closed behavior.

## Safety boundaries

Phase 92 allows sandbox workspace file mutation only.

Phase 92 continues to block:

- direct repository source mutation;
- branch mutation;
- arbitrary file paths;
- arbitrary patch text;
- binary patching;
- file deletion;
- file creation;
- unbounded replacements;
- shell expansion;
- PowerShell;
- `schtasks`;
- scheduler creation;
- GitHub workflow mutation;
- iPhone automation mutation;
- phase ZIP auto-apply;
- fleet execution;
- away-mode execution;
- self-approval;
- self-merge;
- self-deploy.

## Completion criteria

Phase 92 is complete when:

1. `npm run phase92:demo` passes.
2. `npm run phase92:verify` passes.
3. The integration test file `tests/integration/approved-file-patch-runner-v1.test.ts` passes.
4. `npm run hygiene`, `npm run build`, `npm test`, `npm run certify`, and `npm run verify` pass.
5. The Phase 92 source map entries are present.
6. Runtime artifacts are cleaned before commit.
7. The phase is merged to `main` and tagged `phase-92-approved-file-patch-runner-v1`.

## Expected demo proof

```text
S.E.R.A. phase92 approved file patch runner v1: PASS
approvedFilePatchRunnerStatus: approved-file-patch-runner-ready
validationFailedCount: 0
approvedPatchPlanCount: 4
patchExecutionAllowed: true
workspaceFileMutationAllowed: true
sourceMutationAllowed: false
branchMutationAllowed: false
arbitraryPathPatchAllowed: false
arbitraryPatchTextAllowed: false
binaryPatchAllowed: false
deleteFileAllowed: false
createFileAllowed: false
selfApprovalAllowed: false
selfMergeAllowed: false
selfDeployAllowed: false
appliedPatchPlanId: phase92-demo-text-replace
```

## Next phase

Phase 93 should move from sandbox patching toward branch-scoped patch execution or approved branch runner preparation. The safe sequence is: patch in sandbox, then patch on an approved branch, then validate the branch, then prepare merge approval evidence.

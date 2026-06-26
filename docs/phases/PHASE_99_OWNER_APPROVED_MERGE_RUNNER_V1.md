# Phase 99 — Owner-Approved Merge Runner v1

## Purpose

Phase 99 gives S.E.R.A. an owner-approved merge runner layer without granting real project merge authority.

Phase 98 created the merge approval packet. Phase 99 consumes that packet, confirms final owner merge approval, and produces an isolated merge-result evidence packet inside a runtime workspace.

This is a deliberate safety bridge before Phase 100 Approved Branch Developer Alpha.

## What Phase 99 Adds

- Owner-approved merge run catalog.
- Final Tyler Wallace merge approval requirement.
- Phase 98 merge approval packet linkage.
- Phase 97 validation evidence lineage.
- Phase 96 approved branch edit lineage.
- Phase 95 branch creation gate lineage.
- Phase 94 branch plan lineage.
- Safe `work/` target branch checks.
- Safe target file checks.
- Expected post-edit SHA-256 checks.
- Expected content marker checks.
- Isolated merge-result workspace generation.
- Merge result manifest.
- Rollback plan declaration.
- Multi-language production doctrine preservation.
- Operator console status binding.

## Explicit Non-Goals

Phase 99 does not allow:

- Real project repository merge execution.
- Direct project repo source mutation.
- Branch workspace mutation.
- Local Git branch creation.
- Remote branch creation.
- Git push.
- Tag creation.
- Arbitrary commands.
- Shell execution.
- Workflow mutation.
- Scheduler mutation.
- iPhone automation mutation.
- Fleet or away-mode execution.
- Self-approval.
- Self-merge.
- Self-deploy.

## Safety Model

Phase 99 is allowed to write runtime evidence only. The merge runner may copy validated branch-workspace content into an isolated merge-result workspace and write a merge result manifest. It may not call Git, mutate project source, push, tag, or merge into the real repository.

## Completion Criteria

Phase 99 is complete when:

1. `npm run phase99:demo` passes.
2. `npm run phase99:verify` passes.
3. The full build, test, certify, and verify chain passes.
4. Tests confirm missing owner approval, self-approval, unready merge packets, unsafe target branches, unsafe target files, real project merge permissions, Git push, tag creation, shell execution, and self-merge are blocked.
5. The repo is clean after runtime artifact cleanup.

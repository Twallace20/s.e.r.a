# Phase 90 — Approval-Gated Local Command Runner v1

## Purpose

Phase 90 is the first controlled local command execution milestone. It converts the Phase 85–89 command-safety spine into a catalog-only runner that can execute a narrowly approved local command, capture bounded evidence, and refuse everything outside the approved packet.

This phase is intentionally not a general terminal, shell, PowerShell, scheduler, workflow, fleet, app, website, iOS, Python, or deployment runner. It is the first safe proof that S.E.R.A. can execute a local process only when the command is exact, pre-cataloged, owner-approved, workspace-contained, timeout-bound, shellless, and evidence-producing.

## What Phase 90 adds

- Approval-gated command runner policy and implementation.
- Exact command catalog matching.
- Owner approval record requirement.
- Shellless process execution through a direct executable and argument list.
- Approved sandbox workspace containment.
- Timeout enforcement.
- Bounded stdout/stderr capture.
- Result record persistence under `.sera-approval-gated-local-command-runner/`.
- Blockers for missing approval, self-approval, catalog mismatch, shell use, PowerShell, schtasks, workspace escape, self-merge, and self-deploy.
- Operator-console status export for the command runner.
- Integration tests and a repeatable phase demo.

## Approved command posture

Phase 90 includes a small command catalog:

- `phase90-node-smoke` — demo-only proof command that executes Node without shell access.
- `npm-free-core-verify` — cataloged for future owner-approved validation.
- `npm-knowledge-verify` — cataloged for future owner-approved validation.
- `npm-build` — cataloged for future owner-approved validation.
- `npm-test` — cataloged for future owner-approved validation.

Only the Phase 90 Node smoke command is executed by the Phase 90 demo. Other validation commands are cataloged but disabled for the demo unless a later phase explicitly grants the correct validation-runner authority.

## Safety boundaries

Phase 90 still blocks:

- arbitrary command execution;
- shell command strings;
- PowerShell;
- `schtasks`;
- `cmd.exe`, `bash`, `sh`, and broad shell execution;
- source mutation;
- workspace escape;
- scheduler creation;
- GitHub workflow mutation;
- iPhone automation mutation;
- phase ZIP auto-generation or auto-apply;
- worker connection;
- distributed fleet execution;
- away-mode execution;
- self-approval;
- self-merge;
- self-deploy;
- external posting or deployment.

## Validation

Run:

```bash
npm run knowledge:verify
npm run phase90:demo
npm run phase90:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected phase proof includes:

```text
S.E.R.A. phase90 approval-gated local command runner v1: PASS
approvalGatedLocalCommandRunnerStatus: approval-gated-local-command-runner-ready
validationFailedCount: 0
approvedCommandCount: 5
commandExecutionAllowed: true
arbitraryCommandExecutionAllowed: false
shellExecutionAllowed: false
powershellExecutionAllowed: false
schtasksExecutionAllowed: false
selfApprovalAllowed: false
selfMergeAllowed: false
selfDeployAllowed: false
```

## Completion standard

Phase 90 is complete only when the phase demo, knowledge verification, hygiene, build, tests, certification, and full verify pass; the branch is merged; the phase tag is pushed; temporary runtime artifacts are removed; and the repo ends clean.

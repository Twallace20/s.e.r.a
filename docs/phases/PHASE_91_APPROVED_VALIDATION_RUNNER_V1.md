# Phase 91 — Approved Validation Runner v1

## Purpose

Phase 91 gives S.E.R.A. a controlled validation runner on top of the Phase 90 command-execution milestone. The goal is not broad terminal access. The goal is a validation-only runner that can execute exact, approved validation steps, stop on failure, capture evidence, and preserve owner authority.

Phase 90 proved that one catalog-only, owner-approved, shellless local command can execute safely. Phase 91 turns that into a validation suite pattern so future branch work can be checked by a repeatable runner instead of relying only on manual terminal commands.

## What Phase 91 adds

- Approved validation suite catalog.
- Approved validation command catalog.
- Owner approval record requirement for validation runs.
- Shellless validation process execution.
- Validation timeout boundaries.
- Bounded stdout/stderr capture and redaction.
- Stop-on-failure validation behavior.
- Validation evidence records under `.sera-approved-validation-runner/`.
- Declared build/test/certify/verify validation endpoints.
- Phase 91 quick validation demo for Free Core and Knowledge Source Map checks.
- Operator-console binding.
- Integration tests.

## Validation posture

The Phase 91 demo executes the lightweight quick validation suite:

1. Free Core covenant check.
2. Knowledge Source Map check.

The build, test, certify, and full verify endpoints are declared, but the Phase 91 demo does not auto-run the full recursive verification chain. The operator still runs the full closeout suite manually:

```bash
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

This keeps Phase 91 useful without creating recursive validation loops inside the demo command.

## Safety boundaries

Phase 91 still blocks:

- arbitrary command execution;
- shell command strings;
- PowerShell;
- `schtasks`;
- `cmd.exe`, `bash`, `sh`, and broad shell execution;
- source mutation;
- self-repair after validation failure;
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
npm run phase91:demo
npm run phase91:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected phase proof includes:

```text
S.E.R.A. phase91 approved validation runner v1: PASS
approvedValidationRunnerStatus: approved-validation-runner-ready
validationFailedCount: 0
approvedValidationSuiteCount: 4
approvedValidationCommandCount: 6
validationExecutionAllowed: true
fullVerifyAutoRunAllowed: false
arbitraryCommandExecutionAllowed: false
shellExecutionAllowed: false
powershellExecutionAllowed: false
schtasksExecutionAllowed: false
sourceMutationAllowed: false
selfApprovalAllowed: false
selfMergeAllowed: false
selfDeployAllowed: false
```

## Completion standard

Phase 91 is complete only when the phase demo, knowledge verification, hygiene, build, tests, certification, and full verify pass; the branch is merged; the phase tag is pushed; temporary runtime artifacts are removed; and the repo ends clean.

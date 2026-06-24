# Phase 85 — Local Worker Command Risk Classifier v1

Status: Planned / owner-review only.

Phase 85 creates the first policy-only command risk classifier for any future local worker command execution pathway. It defines the safe, caution, owner-only, dangerous, and prohibited command classes that future runners, approval packets, branch workers, and distributed S.E.R.A. Fleet Mode workers must inherit before any command can be considered. It is not command execution, not PowerShell execution, not `schtasks` execution, not shell execution, not retry execution, not failure-classifier execution, not risk auto-route, not worker connection, not Fleet Mode execution, not away-mode execution, not self-merge, not self-deploy, and not self-approval.

## What this phase adds

- A typed operator-console command risk classifier packet.
- A local validator and report writer for command risk-classifier evidence.
- Five command risk classes: safe, caution, owner-only, dangerous, and prohibited.
- Seven future worker capability risk profiles: research, code, website, Python, iOS/Mac, QA/validation, and fleet coordinator.
- A fleet-mode risk inheritance requirement so future distributed workers cannot lower risk, bypass approval, or self-approve.
- Safety gates proving command execution, risk auto-route, distributed fleet execution, multi-worker task lease execution, and self-approval remain blocked.

## What this phase blocks

This phase blocks command execution, PowerShell execution, `schtasks` execution, shell execution, retry execution, automatic retry, timeout-handler execution, failure-classifier execution, process termination, live exit-code evaluation, stdout capture, stderr capture, live command-result persistence, risk-classifier persistence, risk auto-route, worker connection, health polling, distributed fleet execution, multi-worker task lease execution, away-mode execution, branch execution, website publishing, iOS/Mac tool execution, Python project execution, scheduler mutation, filesystem mutation, record persistence, self-merge, self-deploy, and self-approval.

## Fleet Mode note

Phase 85 does not start Fleet Mode. It makes the future fleet safer by defining that each future worker must inherit risk classifications from both the command and the worker capability profile. A research worker, code worker, website worker, Python worker, iOS/Mac worker, QA/validation worker, or fleet coordinator cannot downgrade command risk, bypass owner approval, self-merge, self-deploy, or mutate shared workspaces.

## Validation

Run:

```powershell
npm run phase85:demo
npm run phase85:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected result: `command-risk-classifier-policy-ready`, zero blockers, five declared files, twelve requirements, fourteen fields, five risk classes, seven worker capability risk profiles, eleven evidence requirements, seventeen signals, 800 safety gates, and six app bindings.

# Phase 88 — Local Worker Command Dry-Run Simulator v1

## Status

`command-dry-run-simulator-policy-ready`

## Purpose

Phase 88 defines the dry-run simulator policy required before any future local worker command can be considered for execution. The dry-run layer previews the planned command, inherited scope, expected file impact, expected artifact impact, risk impact, and rollback posture before anything runs.

This phase exists because an approved command should not jump directly from approval packet to execution. S.E.R.A. needs a preview layer that lets the owner see what would happen, what could change, what evidence would be produced, and which boundaries remain blocked.

## Required dry-run preview dimensions

A future command dry-run must represent:

- inherited approval packet
- inherited scope lock
- inherited risk class
- simulated command plan
- simulated file impact
- simulated artifact impact
- simulated risk impact
- simulated rollback preview
- simulated failure behavior
- owner review route before execution

## Dry-run outcome policy

A dry-run is preview-only. It must not spawn a process, run shell/PowerShell/`schtasks`, mutate source files, create schedulers, mutate GitHub workflows, generate or apply phase ZIPs automatically, connect fleet workers, self-merge, self-deploy, or self-approve.

If the dry-run cannot explain the command impact clearly, S.E.R.A. must fail closed and route the request back to owner review.

## Relationship to prior phases

Phase 88 depends on Phase 87's command scope lock, Phase 86's approval packet, and Phase 85's risk classifier. It also preserves the timeout, retry, exit-code, output, result-record, environment, argument, and working-directory boundaries from the command safety spine.

## What Phase 88 does not do

Phase 88 is not command execution. It does not run local commands, PowerShell, `schtasks`, shell commands, GitHub workflows, iPhone automations, phase ZIP generation, phase ZIP apply, scheduler creation, worker connection, away-mode execution, fleet execution, self-merge, self-deploy, or self-approval.

## Future importance

The dry-run simulator becomes essential before S.E.R.A. can run validation commands, apply phase ZIPs, modify branches, build websites, create Python projects, coordinate Mac/iOS workers, produce creative assets, or distribute tasks across a fleet. More speed requires previewable impact before action.

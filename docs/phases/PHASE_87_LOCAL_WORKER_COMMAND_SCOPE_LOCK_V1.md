# Phase 87 — Local Worker Command Scope Lock v1

## Status

`command-scope-lock-policy-ready`

## Purpose

Phase 87 defines the scope lock that every future local worker command request must inherit before execution is considered. This is the guardrail that prevents an approved task from quietly expanding into a different workspace, path, branch, actor, command family, risk class, time window, or evidence target.

The phase exists because an approval packet is not enough by itself. The packet says what was approved; the scope lock makes the approved scope machine-checkable and requires any expansion to return to owner review.

## Required scope dimensions

A future command request must carry these scope dimensions:

- approved purpose
- approved actor or worker
- approved workspace
- approved branch boundary
- allowed and denied path set
- allowed and prohibited command family
- inherited risk class
- approved time window
- approved evidence output
- approval packet source

## Scope violation policy

If any future command request conflicts with the approved scope, S.E.R.A. must fail closed. The correct behavior is to block before execution, preserve the original approval packet, explain the mismatch, and require new owner approval.

Phase 87 specifically blocks auto-repair, auto-expansion, approval bypass, branch escape, workspace escape, path escape, and actor handoff.

## Relationship to prior phases

Phase 87 depends on Phase 86's approval packet and Phase 85's risk classifier. It also preserves timeout, retry, exit-code, output, and result-record boundaries from the command safety spine.

## What Phase 87 does not do

Phase 87 is not command execution. It does not run PowerShell, `schtasks`, shell commands, GitHub workflows, iPhone automations, phase ZIP generation, phase ZIP apply, worker connections, scheduler creation, fleet execution, self-merge, self-deploy, or self-approval.

## Future importance

This scope lock becomes essential when S.E.R.A. later develops branches, applies phase ZIPs, builds websites, creates Python projects, coordinates iOS/Mac workers, runs creative pipelines, and distributes tasks across a fleet. More capability must mean tighter boundaries, not looser ones.

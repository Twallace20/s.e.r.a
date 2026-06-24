# Phase 89 — Local Worker Command Sandbox Workspace v1

## Status

`command-sandbox-workspace-policy-ready`

## Purpose

Phase 89 defines the sandbox workspace policy required before any future approved local worker command can be considered for execution. The sandbox workspace layer establishes where future command activity may happen, which paths are allowed, where artifacts belong, how containment is proven, and how cleanup is represented before any command runner exists.

This phase exists because dry-run previews are not enough by themselves. Before S.E.R.A. gets safe hands, every future command must have a bounded workspace so validation runs, phase ZIP application, branch work, website builds, Python projects, iOS/Mac work, creative production, and fleet workers cannot spill into unapproved source paths or device areas.

## Required sandbox workspace dimensions

A future command sandbox workspace must represent:

- approved workspace root
- isolated run directory
- declared inputs
- declared outputs
- artifact directory
- backup directory
- cleanup plan
- provenance record
- escape detection

## Sandbox artifact policy

Sandbox artifacts must stay out of source unless explicitly approved. Future command outputs, logs, backups, dry-run evidence, validation evidence, and run records must be written to declared artifact locations. Any attempt to escape the approved workspace, write into source without approval, capture secrets, or persist undeclared artifacts must fail closed.

## Relationship to prior phases

Phase 89 depends on Phase 88's dry-run simulator, Phase 87's command scope lock, Phase 86's approval packet, and Phase 85's risk classifier. It preserves the timeout, retry, exit-code, output, result-record, environment, argument, and working-directory boundaries from the command safety spine.

## What Phase 89 does not do

Phase 89 is not command execution. It does not run local commands, spawn processes, run PowerShell, run `schtasks`, run shell commands, mutate source, create schedulers, mutate GitHub workflows, mutate iPhone automations, auto-generate phase ZIPs, auto-apply phase ZIPs, connect fleet workers, self-merge, self-deploy, or self-approve.

## Future importance

The sandbox workspace becomes the containment layer for future validation runners, branch developers, Phase Factory ZIP application, website builders, Python workers, iOS/Mac workers, creative workers, and distributed S.E.R.A. fleet workers. S.E.R.A. can only become faster when every action has a contained place to happen.

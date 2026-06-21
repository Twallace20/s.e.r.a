# Phase 38 — Command Allowlist Gate v1

## Purpose

Phase 38 defines a local command allowlist gate for future runner-safe development.

Phase 35 defined the remote phase runner blueprint. Phase 36 added the owner approval queue. Phase 37 defined the disabled self-hosted runner adapter contract. Phase 38 adds the command allowlist gate that future runner plans must satisfy before any command can ever be considered for execution.

This is an allowlist-gate phase only. It validates exact command strings, approved command families, owner approval requirements, evidence requirements, emergency stop binding, session lock binding, and strict rejection of arbitrary shell, network, VCS, interpreter, chaining, and expansion commands. It does not execute commands, connect to a runner, create branches, apply patches, open pull requests, merge, tag, delete branches, use secrets, or approve itself.

## What this phase adds

- Local command allowlist gate runtime.
- Exact-match command allowlist model.
- Command family and command decision validation.
- Required owner gates for command allowlist changes and runner command activation.
- Runtime reports under `.sera-command-allowlist-gate/`.

## Safety boundaries

Phase 38 does **not**:

- execute commands
- allow arbitrary commands
- allow shell chaining
- allow shell expansion
- activate runner connectivity
- use cloud runners
- use self-hosted runners
- use secrets
- create branches
- switch branches
- push branches
- open pull requests
- apply patches
- mutate source
- merge branches
- tag releases
- delete branches
- record owner decisions
- approve itself
- activate remote execution

## Required validation commands

- `npm run phase38:demo`
- `npm run phase38:verify`
- `npm run hygiene`
- `npm run build`
- `npm test`
- `npm run certify`
- `npm run verify`

## Certification meaning

Passing Phase 38 means S.E.R.A. can produce and validate a local exact-match command allowlist gate while keeping command execution, arbitrary shell access, remote execution, runner connectivity, source mutation, and self-approval disabled.

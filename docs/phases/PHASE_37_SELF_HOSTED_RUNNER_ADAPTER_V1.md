# Phase 37 — Self-Hosted Runner Adapter v1

## Purpose

Phase 37 defines a disabled self-hosted runner adapter contract for future remote-safe development.

Phase 35 defined the remote phase runner blueprint. Phase 36 added the owner approval queue. Phase 37 adds the local adapter contract that future self-hosted runner work must satisfy before S.E.R.A. can ever connect to or execute against a runner.

This is an adapter-contract phase only. It validates the required runner stages, safety boundaries, owner gates, emergency stop binding, session lock binding, command allowlist requirement, and evidence capture requirement. It does not connect to a runner, execute commands, create branches, apply patches, open pull requests, merge, tag, delete branches, use secrets, or approve itself.

## What this phase adds

- Local self-hosted runner adapter contract runtime.
- Disabled adapter stage model.
- Runner identity, workspace preflight, command allowlist, evidence capture, emergency stop, and session lock binding requirements.
- Required owner gates for future adapter activation and workspace access.
- Runtime reports under `.sera-self-hosted-runner-adapter/`.

## Safety boundaries

Phase 37 does **not**:

- enable a self-hosted runner
- activate runner connectivity
- execute local or remote commands
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

- `npm run phase37:demo`
- `npm run phase37:verify`
- `npm run hygiene`
- `npm run build`
- `npm test`
- `npm run certify`
- `npm run verify`

## Certification meaning

Passing Phase 37 means S.E.R.A. can produce and validate a disabled self-hosted runner adapter contract while keeping all runner connectivity, command execution, source mutation, remote execution, and self-approval disabled.

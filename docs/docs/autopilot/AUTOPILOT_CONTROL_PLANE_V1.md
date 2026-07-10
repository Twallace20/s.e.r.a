# Autopilot Control Plane v1

The Autopilot Control Plane coordinates verifier, QA, and closeout readiness through one shared phase contract.

## Flow

```text
Command JSON
↓
Shared Phase Contract
↓
Autopilot Control Plane
↓
Child Process Runner
↓
Verifier Gate
↓
QA Gate
↓
Closeout Gate
↓
Remote Truth Gate
↓
Handoff + Reflection Record
```

## Core rule

Verifier, QA, repeatability, and closeout do not pass truth flags to one another. Each gate reads the same contract and evaluates real evidence.

## Evidence sources

- repo status
- local HEAD
- origin/main
- local tag commit
- remote tag commit
- downloaded ZIP path
- downloaded ZIP SHA
- browser bridge markers
- runtime log markers
- verifier handoff
- QA handoff
- child process exit code/stdout/stderr

## Child process rule

A child process is failed only by its exit code. Stderr is captured as diagnostic evidence and must not automatically become parent failure. This directly prevents the Phase200 pointer-proof issue where harmless git stderr became a verifier blocker.

## Operator rule

Write execution/repair blocks to a `.ps1` file and run once. Do not trust final markers when an earlier command failed and PowerShell continued line-by-line.

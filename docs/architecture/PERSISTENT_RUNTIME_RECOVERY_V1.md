# Persistent Runtime Recovery v1

Persistent Runtime Recovery v1 connects Runtime Host, SQLite Operational State, and Unified Control Plane authority so a new local Runtime instance can inspect interrupted work after restart.

It classifies durable nonterminal attempts, resumes only certified restart-safe checkpoints, creates linked retries only at clear failed boundaries, and blocks uncertain work for operator review.

## Architecture Position

```text
Runtime Host
SQLite Operational State
Unified Control Plane
Persistent Recovery Coordinator
Recovery evidence
```

Runtime Host owns process lifecycle, runtime identity, cancellation, health, and service startup/shutdown.

SQLite Operational State owns durable commands, attempts, transitions, gate outcomes, evidence references, checkpoints, leases, recovery sessions, recovery decisions, recovery events, and attempt lineage.

Unified Control Plane remains the authority for transition vocabulary, required gates, terminal decisions, validation requirements, evidence requirements, and recovery authorization.

Persistent Recovery Coordinator owns bounded scanning, classification, prerequisite checks, Control Plane recovery authorization references, safe reconciliation, and recovery evidence.

## Interruption Model

Recovery detects interruption from durable state, not process IDs alone:

- nonterminal attempts
- expired or active attempt leases
- checkpoint status
- side-effect state
- evidence-reference integrity
- recovery sessions without completion
- current Runtime identity

Terminal attempts remain immutable and are not reopened.

## Checkpoint Model

Migration 2 adds `recovery_checkpoints`.

A checkpoint records attempt ID, stage ID, checkpoint type, timestamp, runtime instance ID, stage sequence, operation idempotency key, restart-safe declaration, side-effect state, evidence references, input/output fingerprints, status, capability version, policy version, and metadata.

Restart safety requires the whole combination: committed status, restart-safe contract, known or compensated side-effect state, idempotency key, intact evidence reference, compatible capability version, compatible policy version, lease/fencing ownership, and Control Plane recovery authorization.

## Recovery Records

Migration 2 adds:

- `recovery_sessions`
- `recovery_decisions`
- `recovery_events`
- `attempt_lineage`

Recovery sessions summarize bounded startup scans. Recovery decisions store classification, decision, reason, policy version, authorization reference, checkpoint reference, fencing token, and review requirement. Recovery events are append-only. Attempt lineage links retries through `recovery_retry_of`.

## Classifications

Supported classifications are:

- `no_action_terminal`
- `active_current_owner`
- `interrupted_safe_to_resume`
- `interrupted_retry_required`
- `review_required`
- `blocked_corrupt_state`
- `blocked_missing_checkpoint`
- `blocked_unresolved_side_effect`
- `blocked_policy_denied`

Unknown or unsafe work is never represented as recoverable.

## Resume And Retry

Same-attempt resume is permitted only for committed restart-safe checkpoints with intact evidence, compatible versions, known or compensated side effects, valid idempotency, current recovery fencing ownership, and Control Plane authorization.

New-attempt retry is used when policy permits retry but not same-attempt continuation. The prior attempt is transitioned honestly, and the new attempt is linked through `attempt_lineage`.

Retry depth, actions per startup, and recovery attempts per command are bounded.

## Review Required

Recovery requires review when side effects are unknown, evidence is missing, checkpoint integrity is invalid, capability or policy versions are incompatible, lease ownership is ambiguous, the prior owner may still be active, the operation is not restart-safe, Control Plane authorization is denied, or retry limits are exhausted.

Review-required work remains durable and visible.

## Leases And Fencing

The coordinator uses the SQLite Operational State lease table. Only one `persistent-runtime-recovery` coordinator lease may be live. Fencing tokens advance with ownership, stale writers are rejected, shutdown releases the lease when possible, and abnormal exit remains recoverable by expiration.

## Health And Evidence

The Runtime Service ID is `persistent-runtime-recovery`.

Service order:

```text
operational-state
unified-control-plane
persistent-runtime-recovery
```

Review-required work degrades Runtime health. Corrupt state or unrecoverable invariants block health.

Evidence is written under:

```text
.sera/recovery/<recoverySessionId>/
```

Required files:

- `recovery-session.json`
- `scan-results.json`
- `recovery-decisions.jsonl`
- `recovery-events.jsonl`
- `resumed-attempts.json`
- `blocked-attempts.json`
- `final-recovery-report.json`

## Execution Guarantee

Persistent recovery does not claim exactly-once execution for arbitrary side effects.

The guarantee is narrower:

- durable state transitions are transactional
- command acceptance is idempotent
- restart-safe operations use durable idempotency keys
- exclusive local writers use leases and fencing tokens
- uncertain side effects are blocked for review
- terminal closeout only occurs after required gates pass

## CLI

```bash
npm run sera -- recovery inspect
npm run sera -- recovery scan
npm run sera -- recovery prove
npm run sera -- recovery pending
npm run sera -- recovery decisions
```

## Boundaries

Persistent Runtime Recovery v1 does not implement Milestone 6 isolated execution, arbitrary subprocess workloads, containers, virtual machines, HTTP servers, network listeners, distributed recovery, Hive Mode, remote workers, Desktop Operator, cloud persistence, model invocation, or exactly-once arbitrary side effects.

Milestone 5 is complete after this certification. Milestone 6, Isolated Execution Engine, is next.

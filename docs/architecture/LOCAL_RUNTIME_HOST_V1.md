# Local Runtime Host v1

## Purpose

Local Runtime Host v1 is S.E.R.A.'s first persistent local Runtime-layer process boundary.

It starts Runtime Services in deterministic dependency order, preserves local installation identity, creates a per-start runtime identity, reports aggregate health, records lifecycle evidence, propagates cancellation, cleans up failed partial startup, and shuts services down in reverse dependency order.

## Architecture Position

```text
Clients / Desktop Operator
Runtime Host
SQLite Operational State
Unified Control Plane
Runtime Services
Capability Engine
Certified Capabilities and Applications
Providers and Tools
```

The Runtime Host manages process and service lifecycle.

SQLite Operational State is hosted as a required Runtime Service before Unified Control Plane in Milestone 5B.

The Unified Control Plane remains the authority over attempts, authorization, terminal status, validation, evidence, and closeout.

The Runtime Host must not become a second orchestration authority.

## Identity Model

The Runtime Host uses two identities:

- `installationId`: created once for a local installation and persisted under the configured state root.
- `runtimeInstanceId`: created on every Runtime Host start and used to correlate lifecycle events, health, diagnostics, and evidence.

The persisted installation identity is written atomically. If an existing identity is corrupt or unsupported, Runtime Host reports a blocked result instead of silently replacing it.

Required runtime identity shape:

```json
{
  "schemaVersion": "sera.runtime-identity.v1",
  "installationId": "installation_...",
  "runtimeInstanceId": "runtime_...",
  "runtimeVersion": "0.1.0",
  "startedAt": "ISO-8601 timestamp",
  "permissionProfile": "offline-local",
  "networkPolicy": "offline-strict"
}
```

## Service Contract

A Runtime Service declares:

- `id`
- `version`
- `required`
- `dependencies`
- `start(context)`
- `health(context)`
- `stop(context)`
- optional startup timeout
- optional shutdown timeout

Service IDs must be unique. Dependencies must reference registered services. Invalid definitions, missing dependencies, and dependency cycles are blocked before startup.

## Dependency Ordering

Runtime Host calculates a normalized topological order over sorted service IDs and sorted dependency IDs.

Dependencies start before dependents. Dependents stop before dependencies. Equivalent registrations produce the same normalized order.

## Startup Behavior

Required service failure blocks Runtime startup. Already-started services are stopped in reverse order, failure evidence names the failed service, later services do not start, and the final status is blocked.

Optional service failure may continue as degraded. Dependents of a failed optional service are not started dishonestly. Required dependency rules remain explicit in the registry.

## Shutdown And Cancellation

Runtime Host supports explicit shutdown, idempotent repeated shutdown, reverse dependency shutdown, cancellation through `AbortSignal`, shutdown timeout recording, and lifecycle evidence for every stop attempt.

Process signal binding is explicit adapter behavior. The library API is testable without globally installing signal handlers.

## Health Aggregation

Health statuses are:

- `starting`
- `healthy`
- `degraded`
- `stopping`
- `stopped`
- `blocked`

A failed required service cannot produce overall healthy status. A failed optional service may produce degraded status. Aggregate health is deterministic and includes every registered service.

## Evidence

Runtime Host evidence is written under:

```text
.sera/runtime-host/<runtimeInstanceId>/
```

Required evidence:

- `identity.json`
- `configuration.json`
- `lifecycle-events.jsonl`
- `service-health.json`
- `final-runtime-report.json`

Lifecycle events include schema version, runtime instance ID, installation ID, optional service ID, event type, timestamp, outcome, optional message, and optional structured details.

Generated Runtime Host evidence is ignored by Git and excluded from Repository Snapshot source measurement.

## Non-Git And Offline Operation

Runtime Host works from a temporary non-Git project root. It does not require Git, GitHub, ChatGPT, Codex, a model provider, internet access, an external database, an HTTP server, or a network listener.

Defaults:

```text
permissionProfile = offline-local
networkPolicy = offline-strict
```

## Failure Semantics

Configuration errors, corrupt installation identity, invalid services, missing dependencies, cycles, required service failure, and required dependency skips produce honest blocked results.

Partial startup must not leave successfully started services running after the host reports failure.

## Control Plane Boundary

Local Runtime Host v1 includes only the minimum adapter needed to expose the existing Unified Control Plane as a required Runtime Service.

The adapter proves that Runtime Host can start, report Control Plane health, and shut down cleanly. It does not duplicate Control Plane logic, create another attempt lifecycle, or move terminal attempt authority out of the Unified Control Plane.

## Limitations

- Runtime Host still does not own attempt authority; SQLite Operational State is a required Milestone 5B service.
- No persistent attempt recovery.
- No isolated execution.
- No HTTP server or network listener.
- No Hive Mode, distributed worker discovery, remote execution, or cloud execution.
- No Desktop Operator implementation.

## Milestone 5B Boundary

Milestone 5A completes Local Runtime Host v1 only.

Milestone 5B completes SQLite Operational State v1. Milestone 5 remains in progress; Persistent Runtime Recovery v1 is the next boundary.

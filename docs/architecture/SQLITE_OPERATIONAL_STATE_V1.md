# SQLite Operational State v1

SQLite Operational State v1 is S.E.R.A.'s durable local Runtime state boundary.

It records commands, attempts, attempt transitions, gate outcomes, evidence references, runtime leases, idempotency records, schema migrations, backups, exports, and operational events in a local SQLite database.

It does not recover or continue attempts after a crash. Persistent recovery belongs to Milestone 5C.

## Architecture Position

```text
Runtime Host
SQLite Operational State Service
Unified Control Plane
Commands, Attempts, Gates, Evidence
```

Runtime Host owns process lifecycle. SQLite Operational State owns durable local records. Unified Control Plane remains the authority for authorization, valid transitions, required gates, terminal state, closeout, and final decisions.

The implementation uses Node's built-in `node:sqlite` `DatabaseSync` API. The repository now requires Node `>=24.0.0`. No native SQLite package, server, listener, model provider, cloud provider, or network dependency is added.

## Location And Configuration

Default generated state:

```text
.sera/state/sera-operational.db
.sera/state/sera-operational.db-wal
.sera/state/sera-operational.db-shm
.sera/state/backups/
.sera/state/exports/
```

Startup enables and verifies `foreign_keys = ON`, `journal_mode = WAL`, `busy_timeout = 5000` by default, `synchronous = FULL`, and `integrity_check`.

The state root, database path, backup root, and export root are configurable. Generated state is ignored by Git and excluded from Repository Snapshot.

## Schema And Migrations

Core tables are `schema_migrations`, `idempotency_records`, `commands`, `attempts`, `attempt_transitions`, `gate_outcomes`, `evidence_references`, `runtime_leases`, and `state_events`.

Migrations are ordered, contiguous, transactional, and checksum-recorded. Idempotent initialization is supported. Unsupported future schema versions, unknown migration versions, modified historical migration identity, migration gaps, and failed migrations block startup.

## Operational Rules

Command acceptance, initial attempt creation, and idempotency persistence happen transactionally. Equivalent idempotency-key reuse returns the original result; conflicting reuse is blocked.

Attempt states mirror the Unified Control Plane vocabulary: `PENDING`, `READY`, `RUNNING`, `BLOCKED`, `FAILED`, `CANCELLED`, `COMPLETED`, and `COMPLETED_WITH_WARNINGS`.

Accepted transitions update the attempt row and append to `attempt_transitions` atomically. Invalid transitions are blocked. Sequence numbers are monotonic per attempt. Optimistic versions prevent lost updates.

Terminal attempts are immutable. Terminal state, timestamp, reason, required gates, and transition history cannot be rewritten. Future retry/reopen behavior must create a new linked attempt.

Required gates must pass before success can be written. Evidence is stored as references with optional integrity hashes and metadata.

Runtime leases support acquire, renew, inspect, release, conflict rejection, acquisition after release or expiry, and fencing-token advancement. This is local-machine protection only, not distributed coordination.

## Failure Handling

Inaccessible databases, invalid SQLite files, failed integrity checks, unsupported schemas, failed migrations, checksum mismatches, transaction failures, backup failures, and export failures are reported honestly. The subsystem does not silently delete, replace, or rebuild corrupt operational truth.

## Backup And Export

Backups use SQLite `VACUUM INTO` to create a consistent local copy while the service is open. Results include path, bytes, SHA-256, and integrity validation.

JSON export includes schema version, export timestamp, installation/runtime references, commands, attempts, transitions, gates, evidence references, leases, and events in stable order. Export does not mutate the database.

## Runtime Service And CLI

The required Runtime Service ID is `operational-state`. It initializes after Runtime Host identity is available, validates or migrates the database, reports healthy only after schema and integrity checks pass, and closes handles during shutdown.

CLI:

```bash
npm run sera -- state init
npm run sera -- state inspect
npm run sera -- state prove
npm run sera -- state integrity
npm run sera -- state backup
npm run sera -- state export
```

## Limitations

No persistent attempt recovery, crash-resume orchestration, autonomous continuation, distributed coordination, network leases, HTTP server, model invocation, or cloud storage is implemented.

Milestone 5C is next.

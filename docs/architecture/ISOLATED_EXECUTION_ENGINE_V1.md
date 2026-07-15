# Isolated Execution Engine v1

Isolated Execution Engine v1 is S.E.R.A.'s governed local execution chamber. It sits under Runtime Host and Unified Control Plane authorization, uses SQLite Operational State for durable records, and writes execution evidence under `.sera/executions/<execution-id>/`.

## Guarantee

Isolated Execution Engine v1 is a governed process and workspace boundary for approved local workloads. It is not a complete hostile-code security boundary, container sandbox, virtual machine, kernel sandbox, or network namespace.

## Authority Boundaries

Runtime Host owns lifecycle, identity, aggregate health, shutdown, and cancellation propagation.

Unified Control Plane owns authorization, required gates, terminal attempt outcomes, verification, and closeout.

SQLite Operational State owns durable execution rows, events, inputs, outputs, authorizations, attempt records, leases, and evidence references.

Persistent Runtime Recovery classifies interrupted execution records conservatively. It does not resume arbitrary operating-system processes from memory.

The Execution Engine owns workspace creation, input materialization, approved direct process launch with `shell: false`, bounded stdout/stderr capture, timeout, cancellation, declared output harvesting, cleanup, and execution evidence.

## Request And Authorization

Execution requests include execution ID, attempt ID, authorization ID, approved executable ID, argument array, input and output declarations, relative working directory, environment profile, timeout, cancellation grace, stdout/stderr/combined output limits, expected exit codes, network policy, cleanup policy, and correlation metadata.

Every execution requires a structured authorization with request hash, executable ID, arguments, input/output scope, environment profile, timeout, output limits, network policy, permission profile, policy version, issued/expires timestamps, required gate references, completed gate references, and integrity hash. Missing, expired, mismatched, incomplete, or tampered authorizations block execution.

## Executable Registry

V1 exposes approved executable adapters only. The default registry contains deterministic proof fixtures and does not expose PowerShell, cmd.exe, bash, sh, arbitrary executable paths, or shell command strings. Processes are launched through direct process APIs with shell disabled.

## Workspace And Inputs

Each execution receives a unique temporary workspace outside the source repository by default. Inputs are materialized only from inline text, generated deterministic fixtures, approved copied files, or approved copied directories. Relative traversal, source path escape, symlink/junction escape, file-count excess, byte-limit excess, and live operational database inputs are blocked.

## Environment And Network

The baseline environment profile is `offline-minimal`; it does not inherit the full parent environment and excludes secrets. The default network policy is `offline-strict`, which blocks executable adapters declared network-capable. V1 does not create a kernel-enforced network namespace or manipulate firewall rules.

## Process, Output, Timeout, And Cancellation

The engine captures stdout and stderr separately with bounded memory, observed byte counts, captured byte counts, truncation flags, and output-limit events. Timeout sends a graceful termination signal and then a forced termination signal after the grace window. Operator or Runtime Host cancellation is idempotent and recorded durably. Best-effort process cleanup is documented as process-level behavior only; detached descendants are not guaranteed.

## SQLite Persistence

Migration 3 adds `executions`, `execution_events`, `execution_inputs`, `execution_outputs`, and `execution_authorizations` without changing historical migrations 1 or 2. Atomic operations cover execution creation, authorization acceptance, process completion, timeout/cancellation events, evidence attachment, and final cleanup state.

## Evidence

Each execution writes:

- `request.json`
- `authorization.json`
- `policy.json`
- `workspace-manifest.json`
- `input-manifest.json`
- `lifecycle-events.jsonl`
- `stdout.txt`
- `stderr.txt`
- `output-manifest.json`
- `process-result.json`
- `cleanup-report.json`
- `final-execution-report.json`

Evidence includes installation/runtime identity when available, execution ID, attempt ID, authorization ID, executable fingerprint, request hash, policy hash, timestamps, limits, exit information, truncation data, hashes, cleanup outcome, `modelUse: false`, and `networkUse: false`.

## Milestone Boundary

`SUCCEEDED_PROCESS` means only that the approved process exited according to its execution contract. It does not mean the attempt succeeded. Milestone 7 Evaluation Engine determines whether outputs satisfy task expectations.

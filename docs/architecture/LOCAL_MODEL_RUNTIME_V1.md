# Local Model Runtime v1

Local Model Runtime v1 is the Runtime-owned boundary for local model requests.

It does not make the Kernel depend on a model. It does not claim real model availability. It does not allow model output to execute tools, mutate source, approve gates, or become operational truth.

## Purpose

`@sera/model-runtime` accepts explicitly authorized local model invocation requests, normalizes and hashes them, routes them through a deterministic provider registry, records durable SQLite evidence, and returns candidate intelligence only.

The default certified provider is a deterministic fixture provider. Optional real-local providers are represented as disabled adapters until a later milestone authorizes local installation, discovery, and invocation.

## Layer

Recommended destination layer: Runtime.

Provider packages and adapters attach beneath this boundary. `packages/model-provider` remains compatibility evidence and provider-adapter source material, not Runtime authority.

## Guarantees

- provider registry is deterministic
- duplicate provider IDs are blocked
- provider/model binding is enforced
- invocation authorization is required
- authorization integrity is hashed and verified
- request normalization and request hashing are deterministic
- idempotency returns the original durable invocation for matching request hashes
- conflicting idempotency reuse is blocked
- public endpoints are blocked
- disabled providers degrade honestly
- prompt and response evidence is redacted
- model output is candidate intelligence only
- model tool proposals are recorded as inert metadata
- model tool execution is blocked
- timeout and cancellation are durable terminal states
- terminal invocation state is immutable
- Runtime Host registration reports health
- default proof is offline and does not invoke a real model

## SQLite Schema

Runtime State migration v5 adds:

- `model_providers`
- `model_catalog`
- `model_authorizations`
- `model_invocations`
- `model_events`
- `model_artifacts`

Migrations 1 through 4 remain unchanged.

## Evidence

Successful invocations write redacted proof artifacts under `.sera/model-runtime/<invocation-id>/`, including:

- `request-summary.json`
- `authorization.json`
- `provider.json`
- `model.json`
- `policy.json`
- `lifecycle-events.jsonl`
- `response-summary.json`
- `usage.json`
- `redaction-report.json`
- `final-invocation-report.json`

Repository Snapshot excludes `.sera/model-runtime/` as generated Runtime evidence.

## Relationship To Knowledge Intake

Knowledge and Universal Intake Runtime v1 is a sibling Runtime boundary. Local Model Runtime may later enrich candidate knowledge only through separate Control Plane authorization. Model output must remain candidate, provenance-linked, and unable to replace original source evidence or become canonical truth automatically.

## Relationship To Capability Engine

Capability Engine may consume Local Model Runtime output only as candidate intelligence. Model output cannot directly create, certify, promote, activate, roll back, or mutate a capability version.

## CLI

The CLI exposes:

- `npm run sera -- model providers`
- `npm run sera -- model models`
- `npm run sera -- model policy`
- `npm run sera -- model inspect <invocation-id>`
- `npm run sera -- model prove`

`model prove` uses a bounded temporary proof state and deterministic fixture provider. It is repeatable and does not depend on a live operational database.

## Non-goals

Local Model Runtime v1 does not:

- download or install models
- invoke Ollama or any real local model by default
- add cloud providers
- use public internet
- store credentials
- perform Knowledge Runtime behavior
- perform Capability Engine learning or promotion
- implement Desktop Operator behavior
- implement distributed inference
- implement Hive Mode
- let model output execute tools or mutate source

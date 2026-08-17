# M16-A1 — Governed Inactive Candidate

Status: **IN_PROGRESS** until the focused local proof passes. M16-A, M16-B, M16-C, and Milestone 16 remain incomplete.

## Purpose

M16-A1 proves that an authenticated operator request can establish an authentic missing capability against the authoritative hash-bound runtime registry, construct a bounded offline candidate under existing Product Control Plane and `GovernedCapabilityEngineComposition` authority, execute request-specific candidate-local tests through governed Execution Authority, preserve immutable evidence, and close out without certification, promotion, activation, or active-pointer mutation.

## Authority

`Operator request → Operator Gateway → Product Control Plane attempt → GovernedCapabilityEngineComposition → CapabilityEngine → governed Execution Authority candidate-local tests → immutable evidence → Product Control Plane closeout`

Operator Gateway does not instantiate Capability Engine or create Capability Engine authorization.

## Initial bounded acquisition profile

`deterministic-text-transform-acquisition-v1` ships one closed operation: `stable-unique-line-sort`.

The contract accepts bounded newline-delimited UTF-8 text; normalizes CRLF/CR to LF; removes empty lines; retains one exact instance of each non-empty line; sorts using deterministic case-sensitive lexicographic ordering; preserves internal whitespace; emits no trailing newline; has no shell, network, model, provider, package acquisition, or external side effect authority.

The production dispatcher selects a versioned acquisition profile from structured request data. It does not match one literal sentence to one prewritten response.

## Registry boundary

`ReleaseRelativeRuntimeCapabilityRegistryReader` reads the authoritative `architecture/runtime-capability-registry-v1.json` relative to the release root and verifies it against `architecture/runtime-capability-registry-v1.sha256`. The reader is injectable for tests and can later resolve the same files from a portable release root without depending on a development-repository absolute path.

## Candidate behavior

The candidate references the shipped `deterministic-text-transform-v1` approved executable adapter. The ID is added to the Capability Engine's closed typed executable policy; it is not an arbitrary string. The Execution Engine approved-executable registry binds it to a bundled local Node implementation with a fixed argument contract, offline compatibility, no network capability, bounded input/output, and isolated workspace execution.

Candidate-local execution is pre-certification evidence only. Passing these tests does not certify, promote, activate, or make the candidate selectable for ordinary certified execution.

## Required candidate-local tests

Duplicate lines, empty lines, already-sorted input, reverse-sorted input, case-sensitive ordering, internal whitespace, CRLF/LF policy, empty input, source non-mutation, deterministic replay, bounded input, malformed input rejection, and oversized input rejection. Expected and actual results are hash-bound.

## Offline declaration

Every successful M16-A1 result records:

- `offline = true`
- `publicNetworkUse = false`
- `cloudProviderUse = false`
- `modelUse = false`
- `externalPackageAcquisition = false`
- `repositoryMutation = false`

Ollama is not required for deterministic acquisition authority, construction, testing, validation, packaging, or release operation. Future local-model assistance remains candidate intelligence only.

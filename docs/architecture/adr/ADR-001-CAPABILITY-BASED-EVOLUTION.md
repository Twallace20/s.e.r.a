# ADR-001: Capability-Based Evolution Architecture

- Status: Accepted
- Date: July 2026
- Owner: S.E.R.A. owner

## Context

S.E.R.A. accumulated valuable safety, planning, memory, knowledge, evaluation, worker, operator, Git, and recovery capabilities. Later work increasingly expressed these through phase-specific scripts, overlay ZIP transport, browser submission, pointer files, and duplicated verifier/QA contracts.

The Phase 201 recovery incident demonstrated the risk: a child recovery process correctly returned BLOCKED after a Windows PowerShell compatibility error, while the surrounding pasted command stream continued and printed success-oriented output.

## Decision

Adopt a capability-based architecture governed by shared contracts, a deterministic control plane, transactional local state, isolated execution, unified evaluation, a Capability Genome, recursive learning, and a downloadable local operator application.

Existing phase work is preserved and classified rather than discarded.

GitHub, Git remotes, ChatGPT, Codex, browser automation, OneDrive, and overlay ZIP delivery are not core runtime requirements.

## Consequences

Benefits:
- one permanent lifecycle
- fail-fast terminal states
- measurable learning
- offline operation
- reusable capability composition
- safer self-improvement
- portable distribution

Costs:
- inventory and consolidation before further feature expansion
- migration of phase scripts into modules, tests, fixtures, or legacy
- new shared state and certification architecture

## First milestone

Repository Truth and Legacy Freeze (`repository-truth-v1`).

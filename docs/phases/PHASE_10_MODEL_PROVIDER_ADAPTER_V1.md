# Phase 10 — Model Provider Adapter v1

## Purpose

Add the first safe model-provider interface without making S.E.R.A. dependent on any LLM.

## What This Adds

- `@sera/model-provider`
- local mock provider
- disabled external provider slot
- provider registry listing
- redacted model request records
- deterministic mock responses
- model provider event log
- model provider summary
- CLI commands for providers, mock invocation, requests, responses, events, and summary

## Safety Rules

- No model provider is required for core runtime.
- External providers are blocked by default.
- Unknown providers are blocked.
- Prompt records are redacted before persistence.
- Model adapters do not mutate files, tasks, lessons, or memory by themselves.
- The mock provider is deterministic and local-only.

## Certified Level

`model-provider-v1`

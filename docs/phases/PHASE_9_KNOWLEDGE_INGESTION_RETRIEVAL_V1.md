# Phase 9 — Knowledge Ingestion + Local Retrieval v1

## Purpose

Give S.E.R.A. a local knowledge layer that can ingest project files, split them into searchable chunks, and retrieve evidence without depending on an LLM or external service.

## Certified capability

Phase 9 proves S.E.R.A. can:

- ingest a local file into `.sera-knowledge/`
- write document records and chunk records
- block path traversal outside the project root
- search indexed chunks with deterministic lexical retrieval
- inspect indexed documents and their chunks
- ingest supported files from a directory while ignoring runtime folders
- summarize document, chunk, and search counts

## Safety boundary

Knowledge retrieval is read-only. It does not modify source files, execute tasks, approve lessons, activate lessons, or change runtime behavior. Search results are local evidence hints, not generated truth.

## Storage

Runtime knowledge artifacts live under `.sera-knowledge/` and are ignored by Git:

- `documents.jsonl`
- `chunks.jsonl`
- `search-history.jsonl`
- `summary.json`

## Certification level

Passing this phase upgrades the certified level to:

`knowledge-retrieval-v1`

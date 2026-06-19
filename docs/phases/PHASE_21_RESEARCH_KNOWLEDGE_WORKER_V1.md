# Phase 21 — Research + Knowledge Worker v1

## Purpose

Phase 21 adds a local research and knowledge worker that answers only from indexed S.E.R.A. knowledge evidence. It turns existing lexical retrieval into operator-ready answer, comparison, and summary packets with citations, confidence labels, and explicit limitations.

## Certification boundary

Phase 21 is local, free, read-only, and evidence-bound.

It does not add internet research, browser automation, paid search APIs, hosted model providers, cloud databases, automatic task execution, lesson activation, or autonomous source mutation.

## What Phase 21 adds

- A new `@sera/research` package.
- A `ResearchKnowledgeWorker` for local evidence answers, comparisons, and summaries.
- Citation records with relative path, line range, chunk ID, matched terms, score, and snippet.
- `.sera-research/` runtime reports and JSONL history.
- Kernel methods for research answer, compare, summarize, history, and summary.
- CLI commands under `sera research`.
- Phase 21 demo and verification scripts.
- Integration tests proving answers are citation-bound and missing evidence is reported honestly.

## Safety rules

- The worker reads from `.sera-knowledge/` through the local `KnowledgeStore`.
- It does not call an LLM.
- It does not use external web search.
- It does not execute tools or mutate source files.
- It reports `insufficient_evidence` instead of guessing when local evidence is missing.
- It writes generated research history under ignored `.sera-research/` runtime storage.
- It preserves the Free Core Covenant.

## Certified commands

```bash
npm run free-core:verify
npm run knowledge:verify
npm run phase21:demo
npm run phase21:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

## Expected result

```text
S.E.R.A. free core covenant: PASS through_phase=45
S.E.R.A. knowledge source map: PASS mapped=38
S.E.R.A. phase21 research knowledge worker: PASS
Test Files 19 passed (19)
Tests 79 passed (79)
S.E.R.A. certify: PASS level=operator-console-v1
```

## Non-goals

Phase 21 does not make S.E.R.A. an internet researcher. It gives S.E.R.A. a safer local research surface so later web/manual ingestion phases have an evidence-bound answer contract to build on.

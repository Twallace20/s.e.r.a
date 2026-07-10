# S.E.R.A. Capability Architecture v1

Phase201 pivots S.E.R.A. away from phase-by-feature worker growth and toward a capability-based autonomous operating system architecture.

## Why this pivot exists

Phase200 proved the browser bridge and artifact downloader can submit, wait, locate the newest exact artifact control, click the exact expected ZIP, download it, and verify SHA. The failure was not the browser loop. The failure was contract drift between verifier, QA, repeatability, and closeout scripts.

Phase201 establishes the principle that gates do not exchange caller assertions. Gates read a shared phase contract and derive truth from evidence: git state, downloaded artifact state, log markers, handoffs, remote truth, and repo cleanliness.

## Capability layers

1. Kernel — secure execution, workspace isolation, configuration, filesystem policy, secrets policy, logging, and certification primitives.
2. Knowledge / Project Intelligence — repository scanner, symbol graph, dependency graph, architecture map, documentation index, semantic search, and file relationship mapping.
3. Memory — run memory, failure memory, decision memory, project memory, knowledge cache, and context retrieval.
4. Planning — goal trees, dependency graphs, execution DAGs, risk analysis, rollback strategy, validation strategy, and confidence scoring.
5. Workers — specialized workers that implement a common lifecycle and contract.
6. Tools — installable, permissioned tools behind a common schema and sandbox layer.
7. Reflection — post-run analysis, lesson capture, heuristic updates, and confidence adjustment.
8. Evolution — certified self-improvement after kernel, memory, planning, testing, rollback, and reflection are reliable.

## Architecture rule

S.E.R.A. should not grow into one enormous developer worker. New capability layers must be isolated, certified independently, and connected through stable contracts.

# Repository Truth v1

Repository Truth v1 is the Runtime-layer interpretation pass over Repository Snapshot v1 evidence.

It does not scan the repository independently, run arbitrary scripts, call models, use the network, migrate files, or delete legacy assets. It consumes a validated Snapshot output set, refreshes Snapshot by default for the CLI command, and writes deterministic truth records under `.sera/repository-truth/`.

## Command

```bash
npm run sera -- repository truth
npm run sera -- truth
```

Both commands refresh Repository Snapshot first. Advanced callers may use the public API with `refreshSnapshot: false` or a provided validated snapshot.

## Outputs

- `truth.json`
- `components.json`
- `dependency-graph.json`
- `test-ownership.json`
- `findings.json`
- `classifications.json`
- `summary.json`

Each output includes `schemaVersion`, `truthEngineVersion`, source Snapshot identity, repository-relative evidence paths, `modelUse: false`, and `networkUse: false`.

## Rule Model

Repository Truth v1 distinguishes `FACT`, `DERIVED`, `HEURISTIC`, `CONFLICT`, and `UNKNOWN`. Heuristic claims are never confidence `1.0`. Findings include evidence paths, counter-evidence paths, limitations, rule IDs, rule versions, and `automaticRemediationAllowed: false`.

## Boundaries

- Snapshot owns raw repository observation.
- Repository Truth owns deterministic classification and reconciliation.
- CLI and Kernel only invoke the Runtime package.
- Legacy and generated assets are identified, not remediated.
- Static caller/import authority is not claimed in v1.

## Acceptance Coverage Matrix

| # | Required behavior | Test file | Test name | Certification check | Evidence produced | Status |
|---|---|---|---|---|---|---|
| 1 | Missing snapshot refusal | `tests/repository-truth-v1.test.ts` | `blocks incomplete, mixed, or hash-mismatched snapshot sources honestly` | `repository_truth_blocks_incomplete_snapshot` | BLOCKED result for missing Snapshot output | covered |
| 2 | Mixed snapshot-ID refusal | `tests/repository-truth-v1.test.ts` | `blocks incomplete, mixed, or hash-mismatched snapshot sources honestly` | source validation cert coverage via Repository Truth fixture | BLOCKED result when `summary.json` ID differs | covered |
| 3 | Manifest/hash corruption refusal | `tests/repository-truth-v1.test.ts` | `blocks incomplete, mixed, or hash-mismatched snapshot sources honestly` | source validation cert coverage via Repository Truth fixture | BLOCKED result for missing manifest member and SHA-256 mismatch | covered |
| 4 | Deterministic repeatability | `tests/repository-truth-v1.test.ts` | `is repeatable after normalizing duration and source hash details` | `repository_truth_no_partial_promotion`, actual repeatability proof | normalized Truth hash comparison | covered |
| 5 | FACT, DERIVED, HEURISTIC, CONFLICT, UNKNOWN distinctions | `tests/repository-truth-v1.test.ts` | `distinguishes facts, heuristics, unknowns, evidence, and non-automatic findings` | `repository_truth_findings_have_evidence_and_rules` | findings, components, dependency graph certainty records | covered |
| 6 | Heuristic confidence below 1.0 | `tests/repository-truth-v1.test.ts` | `distinguishes facts, heuristics, unknowns, evidence, and non-automatic findings`; `assigns heuristic test ownership and reports unowned alternatives when needed` | `repository_truth_findings_have_evidence_and_rules`, `repository_truth_test_ownership_is_confidence_scored` | heuristic findings/components/tests with confidence `< 1` | covered |
| 7 | Evidence and basis on every heuristic | `tests/repository-truth-v1.test.ts` | `distinguishes facts, heuristics, unknowns, evidence, and non-automatic findings` | `repository_truth_findings_have_evidence_and_rules` | `basis` and `evidencePaths` on heuristic records | covered |
| 8 | Workspace dependency edges | `tests/repository-truth-v1.test.ts` | `records dependency graph facts, cycles, unresolved refs, and upward layer findings` | `repository_truth_dependency_graph_declared_only` | `dependency-graph.json` workspace dependency edges | covered |
| 9 | TypeScript project-reference edges | `tests/repository-truth-v1.test.ts` | `records dependency graph facts, cycles, unresolved refs, and upward layer findings` | `repository_truth_dependency_graph_declared_only` | `dependency-graph.json` TS project reference edges | covered |
| 10 | Missing local dependency findings | `tests/repository-truth-v1.test.ts` | `records dependency graph facts, cycles, unresolved refs, and upward layer findings` | `repository_truth_findings_have_evidence_and_rules` | unresolved local dependency in graph/findings | covered |
| 11 | Cycle detection | `tests/repository-truth-v1.test.ts` | `records dependency graph facts, cycles, unresolved refs, and upward layer findings` | Repository Truth dependency graph cert fixture | cycle list in `dependency-graph.json` | covered |
| 12 | Upward layer-dependency findings | `tests/repository-truth-v1.test.ts` | `records dependency graph facts, cycles, unresolved refs, and upward layer findings` | `repository_truth_dependency_graph_declared_only` | `upwardLayerDependencyFindings` and warning findings | covered |
| 13 | Tentative mapping preservation | `tests/repository-truth-v1.test.ts` | `writes required deterministic truth outputs from refreshed Repository Snapshot evidence`; `distinguishes facts, heuristics, unknowns, evidence, and non-automatic findings` | `repository_truth_schemas_parse` | component classifications with certainty/confidence/limitations | covered |
| 14 | Test ownership confidence and alternatives | `tests/repository-truth-v1.test.ts` | `assigns heuristic test ownership and reports unowned alternatives when needed` | `repository_truth_test_ownership_is_confidence_scored` | `test-ownership.json` ownership records | covered |
| 15 | Unowned test visibility | `tests/repository-truth-v1.test.ts` | `assigns heuristic test ownership and reports unowned alternatives when needed` | `repository_truth_test_ownership_is_confidence_scored` | `unownedTests` list | covered |
| 16 | Missing inventory implementation candidates | `tests/repository-truth-v1.test.ts` | `reconciles capability inventory and flags legacy authority risk without deleting anything` | `repository_truth_inventory_reconciliation` | `inventoryEntriesWithNoImplementation` | covered |
| 17 | Observed candidates absent from inventory | `tests/repository-truth-v1.test.ts` | `reconciles capability inventory and flags legacy authority risk without deleting anything` | `repository_truth_inventory_reconciliation` | `observedCandidatesNoInventory` | covered |
| 18 | Unsupported maturity/certification claims | `tests/repository-truth-v1.test.ts` | `distinguishes facts, heuristics, unknowns, evidence, and non-automatic findings` | inventory reconciliation cert coverage | `unsupportedMaturityOrCertificationClaims` | covered |
| 19 | Seeded legacy-authority risk detection | `tests/repository-truth-v1.test.ts` | `reconciles capability inventory and flags legacy authority risk without deleting anything` | `repository_truth_legacy_authority_analysis_present` | `legacyAuthorityAnalysis.riskCount > 0` and warning finding | covered |
| 20 | No false legacy-authority risk when authority is absent | `tests/repository-truth-v1.test.ts` | `does not report legacy authority risk when legacy has no active declared authority` | `repository_truth_legacy_authority_analysis_present` | `legacyAuthorityAnalysis.riskCount === 0` | covered |
| 21 | No repository-source mutation | `tests/repository-truth-v1.test.ts` | `records source snapshot identity and does not mutate repository source or existing snapshot interpretation inputs` | actual acceptance proof | source file text unchanged | covered |
| 22 | No Snapshot-output mutation during interpretation | `tests/repository-truth-v1.test.ts` | `records source snapshot identity and does not mutate repository source or existing snapshot interpretation inputs` | actual acceptance proof | eight Snapshot hashes unchanged when `refreshSnapshot:false` | covered |
| 23 | No absolute-path leakage | `tests/repository-truth-v1.test.ts` | `writes required deterministic truth outputs from refreshed Repository Snapshot evidence` | `repository_truth_paths_are_portable` | output JSON excludes temp root path | covered |
| 24 | No model use | `tests/repository-truth-v1.test.ts` | `writes required deterministic truth outputs from refreshed Repository Snapshot evidence` | `repository_truth_no_model_or_network` | `modelUse:false` | covered |
| 25 | No network use | `tests/repository-truth-v1.test.ts` | `writes required deterministic truth outputs from refreshed Repository Snapshot evidence` | `repository_truth_no_model_or_network` | `networkUse:false` | covered |
| 26 | Atomic failed-generation behavior | `tests/repository-truth-v1.test.ts` | `does not promote partial truth output after simulated failure` | `repository_truth_no_partial_promotion` | previous complete `summary.json` preserved | covered |
| 27 | CLI refresh behavior | CLI path exercised by validation command | actual `npm run sera -- repository truth` proof | `repository_truth_refreshes_snapshot_first` | `refreshedSnapshotFirst:true` and matching source Snapshot ID | covered |
| 28 | Preservation of existing tests | global suite | `npm test` | certification invokes full suite | 134 test files / 589 tests after acceptance closure | covered |
| 29 | Preservation of existing certifications | cert runner | `npm run certify` | all prior cert checks remain present | PASS `operator-console-v1` | covered |
| 30 | Preservation of Repository Snapshot certification | cert runner | `npm run certify` | `repository_snapshot_*` checks | Snapshot cert checks pass | covered |
| 31 | No global certification downgrade | cert runner | `npm run certify` | report level | PASS level remains `operator-console-v1` | covered |
| 32 | Required output files parse and reference one source Snapshot | `tests/repository-truth-v1.test.ts` | `writes required deterministic truth outputs from refreshed Repository Snapshot evidence`; `records source snapshot identity and does not mutate repository source or existing snapshot interpretation inputs` | `repository_truth_required_outputs_exist`, `repository_truth_schemas_parse` | seven parseable Truth outputs with common source Snapshot identity | covered |

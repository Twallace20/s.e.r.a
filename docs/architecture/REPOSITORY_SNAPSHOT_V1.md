# Repository Snapshot v1

## Purpose

Repository Snapshot v1 is the first permanent Runtime-layer subsystem governed by the SERA OS Constitution. It measures observable repository facts and writes reusable evidence for later interpretation by Repository Truth.

The information flow is:

```text
Repository -> Repository Snapshot -> Repository Truth -> Planner -> Model
```

Repository Snapshot measures. Repository Truth interprets.

## Architecture Placement

The implementation lives in `packages/repository-snapshot` as a Runtime-layer package. The CLI invokes it through `SeraKernel`, but scanning logic is not owned by the CLI, Desktop, Studio, model provider, browser adapter, or Legacy layer.

## Why Snapshot Precedes Truth

Repository Truth needs a stable fact base. This repository contains active source, generated runtime folders, phase-era artifacts, browser/ZIP pipeline evidence, PowerShell wrappers, tests, docs, and legacy records. Snapshot v1 creates deterministic local measurements first so the next milestone can classify facts without relying on recursive AI inspection or model guesses.

## Fact Versus Inference Boundary

Snapshot v1 records observable metadata:

- package manifests
- workspace declarations
- TypeScript references
- declared scripts
- test filenames and ownership hints
- documentation paths and categories
- local Git baseline when available
- exclusions, warnings, and errors

It does not infer architecture correctness, active callers, import graphs, dead code, legacy status, or production readiness.

Heuristic ownership appears only with confidence, basis, and evidence paths.

## Command Usage

Canonical command:

```bash
npm run sera -- repository snapshot
```

Short alias:

```bash
npm run sera -- snapshot
```

## Output Schemas

Snapshot output is written to `.sera/repository/`:

- `snapshot.json`
- `workspaces.json`
- `packages.json`
- `scripts.json`
- `tests.json`
- `references.json`
- `documents.json`
- `summary.json`

Every file includes `schemaVersion`, `scannerVersion`, repository-relative paths, final status evidence, and enough source evidence to reproduce reported counts.

## Exclusions

Default exclusions include generated and irrelevant directories such as:

- `.git`
- `node_modules`
- `dist`
- `build`
- `coverage`
- temporary directories
- `.sera/repository`
- existing run, certification, cache, proof, and generated-artifact directories

Exclusions are recorded in `summary.json`; they are not hidden.

## Git-Optional Behavior

Git is optional infrastructure. When Git is available and the repository is a work tree, Snapshot records local-only metadata such as branch, HEAD commit, dirty state, changed-file counts, and whether upstream metadata is configured.

Snapshot does not contact remotes. When Git is unavailable or the target is not a Git repository, the snapshot can still complete and records Git as unavailable or non-repository metadata.

## Safety Boundaries

The scanner:

- stays inside the repository root
- never follows symbolic links or junctions
- avoids executing repository code or discovered scripts
- does not load JavaScript configuration as code
- does not use a model
- does not use the network
- redacts obvious secrets in errors
- writes only through the Repository Snapshot output boundary
- does not change Git state

## Atomic Writes

Snapshot output is generated in a staging directory and promoted only after all required JSON files are written and parsed. A simulated failure after staging leaves the previous current snapshot intact rather than publishing partial current-state files.

## Status Meanings

- `COMPLETED`: required output set was generated and validated.
- `BLOCKED`: repository root or output boundary is invalid or inaccessible.
- `FAILED`: unexpected scanner failure prevented a valid output set.

Warnings may exist in a completed snapshot. They are counted and preserved as evidence.

## Testing

Coverage includes fixture repositories, deterministic output, exclusions, symlink/junction safety, non-Git operation, local Git observation, missing workspace and TypeScript references, malformed manifests, no script execution, no outside writes, atomic failure behavior, portable paths, false model/network use, Kernel API consumption, and CLI-facing structured output.

## Certification

Certification adds a Repository Snapshot v1 suite proving required outputs, schema parsing, portable paths, deterministic traversal, generated-directory exclusions, symlink safety, non-Git operation, optional local Git observation, no model or network use, repeatability, atomic failure behavior, and typed API consumption.

The global certification level remains compatible with the existing certification architecture.

## Known Limitations

- Snapshot v1 does not classify package placement or legacy status.
- Snapshot v1 does not build import graphs or caller graphs.
- Test framework hints are based only on filenames and declared scripts.
- Large documentation files may omit content hashes when above the safe hash threshold.
- Repository Truth is required before architectural conclusions are made from snapshot facts.

## Future Repository Truth Integration

Repository Truth should consume Snapshot output as its input evidence. It should classify active source, production modules, evaluation assets, failure fixtures, legacy references, obsolete files, and migration targets without re-scanning the repository through model-driven recursion.

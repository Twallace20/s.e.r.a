# Phase 15 — Knowledge Seeding + Source Map v1

## Purpose

Phase 15 makes S.E.R.A.'s existing local knowledge layer useful for understanding the repo itself.

Phase 9 proved that S.E.R.A. can ingest local files, chunk them, search them, inspect indexed documents, ignore runtime folders, and summarize `.sera-knowledge/`. Phase 15 adds the repo-level operating discipline around that capability: a curated source map, a repeatable seed script, and a source-map verification gate.

## What Phase 15 adds

- `docs/knowledge/SOURCE_MAP.md`
- `docs/knowledge/SEEDING_GUIDE.md`
- `scripts/seed-local-knowledge.mjs`
- `scripts/check-knowledge-source-map.mjs`
- `npm run knowledge:seed`
- `npm run knowledge:source-map`
- `npm run knowledge:verify`
- a Phase 15 integration test for the tracked source map
- README, validation, roadmap, and certification-ladder updates

## What Phase 15 proves

- S.E.R.A. has a tracked map of trusted repo evidence.
- Required mapped files exist in the repo.
- The source map references each required mapped file.
- Local `.sera-knowledge/` can be rebuilt from trusted repo sources.
- Runtime knowledge artifacts remain generated and ignored.
- The normal hygiene/build/test/certify/verify gate still passes.

## What Phase 15 does not add

- no external research worker
- no browser access
- no enabled external model provider
- no automatic task execution
- no automatic lesson activation
- no semantic reasoning over code beyond existing lexical retrieval
- no new mutation authority
- no uncontrolled self-improvement

## Validation

Run:

```bash
npm run knowledge:source-map
npm run knowledge:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Optional local knowledge seed:

```bash
npm run knowledge:seed
npm run sera -- knowledge summary
```

Expected runtime certification remains:

```text
S.E.R.A. certify: PASS level=operator-console-v1
```

## Completion criteria

Phase 15 is complete only when:

- source-map verification passes
- source and runtime hygiene pass
- build passes
- tests pass
- certification passes
- verify passes
- the phase is committed, merged into `main`, tagged, and the phase branch is cleaned

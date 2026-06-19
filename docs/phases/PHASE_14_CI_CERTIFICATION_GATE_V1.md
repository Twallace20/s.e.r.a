# Phase 14 — CI Certification Gate v1

## Purpose

Phase 14 moves S.E.R.A.'s certification discipline from local-only practice into GitHub branch and pull-request governance.

This phase does not add runtime authority. It does not enable external model providers, automatic task execution, uncontrolled autonomy, new mutation permissions, or new worker behavior.

## Why this phase exists

The first twelve runtime phases created a certified local foundation. Phase 13 aligned repository truth after that foundation.

The next risk is process drift: a future phase could accidentally merge generated artifacts, skip certification, or rely on local validation that is not repeated in GitHub.

Phase 14 prevents that by making the repo itself run the gate.

## Added capability

S.E.R.A. now has an operational CI gate that checks:

- dependency installation
- source hygiene
- runtime artifact hygiene
- TypeScript build
- integration tests
- certification runner
- post-certification hygiene

## Files added

- `.github/workflows/sera-certification.yml`
- `scripts/check-source-hygiene.mjs`
- `scripts/check-runtime-artifacts.mjs`
- `docs/phases/PHASE_14_CI_CERTIFICATION_GATE_V1.md`

## Files updated

- `package.json`
- `docs/BUILD_VALIDATION.md`
- `docs/roadmap/CERTIFICATION_LADDER.md`
- `docs/roadmap/NEXT_EVOLUTION_ROADMAP.md`
- `README.md`

## Local commands

```bash
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

## CI commands

The GitHub Actions workflow runs:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run hygiene:source
npm run hygiene:runtime
npm run build
npm test
npm run certify
npm run hygiene:source
npm run hygiene:runtime
```

## Hygiene rules

The source hygiene guard blocks tracked generated source artifacts:

- `*.tsbuildinfo`
- generated `.js` files in `packages/*/src` or `apps/*/src`
- generated `.js.map` files in `packages/*/src` or `apps/*/src`
- generated `.d.ts` files in `packages/*/src` or `apps/*/src`

The runtime artifact guard blocks tracked local/runtime folders and files:

- `node_modules/`
- `dist/`
- `coverage/`
- `.sera-runs/`
- `.sera-cert/`
- `.sera-local/`
- `.sera-memory/`
- `.sera-tasks/`
- `.sera-knowledge/`
- `.sera-models/`
- `.sera-autonomy/`
- `.sera-console/`
- `.env` files except `.env.example`

## Certification level

Phase 14 does not change the runtime certification level.

Expected runtime result remains:

```text
S.E.R.A. certify: PASS level=operator-console-v1
```

## Definition of done

Phase 14 is complete only when:

- local hygiene passes
- build passes
- tests pass
- certification passes at `operator-console-v1`
- CI workflow is committed
- branch is merged into `main`
- phase tag is pushed
- local and remote phase branches are cleaned

## Next phase

Phase 15 should seed the local knowledge layer with actual repo docs/source records and create a source map so S.E.R.A. can retrieve evidence about itself before deeper autonomy work continues.

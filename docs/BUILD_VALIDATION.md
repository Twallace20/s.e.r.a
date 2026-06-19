# Build Validation

S.E.R.A. only gets credit for capabilities that build, test, certify, and leave evidence.

## Current validation commands

```bash
npm install --ignore-scripts --no-audit --no-fund
npm run build
npm run hygiene
npm run verify
npm test
npm run certify
```

## Current expected certified runtime level

```text
S.E.R.A. certify: PASS level=operator-console-v1
```

## Phase 12 observed validation target

Phase 12 completed the secure local foundation with the Operator Console v1 capability. The expected test target at that point is:

```text
12 test files passed
60 tests passed
S.E.R.A. certify: PASS level=operator-console-v1
```

## Phase 13 validation posture

Phase 13 is documentation and repo-truth alignment. It does not add runtime authority or change the expected runtime cert level.

Phase 13 is valid only if the same commands still pass after the documentation changes:

```bash
npm run build
npm test
npm run certify
```

Expected result remains:

```text
S.E.R.A. certify: PASS level=operator-console-v1
```

## Generated artifact hygiene

The repository should not commit generated build/runtime artifacts, including:

- `node_modules/`
- `dist/`
- `.sera-runs/`
- `.sera-cert/`
- `.sera-memory/`
- `.sera-tasks/`
- `.sera-knowledge/`
- `.sera-models/`
- `.sera-autonomy/`
- `.sera-console/`
- `*.tsbuildinfo`
- generated `.js`, `.js.map`, or `.d.ts` files inside TypeScript `src/` folders unless intentionally authored and documented

## Phase 14 CI Certification Gate

Phase 14 moves the same discipline into GitHub Actions. It is an operational governance milestone, not a new runtime cert level.

The GitHub workflow must run on `main`, phase branches, and pull requests into `main`.

Required CI steps:

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

Expected runtime result remains:

```text
S.E.R.A. certify: PASS level=operator-console-v1
```

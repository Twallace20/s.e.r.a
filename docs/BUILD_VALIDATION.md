# Build Validation

S.E.R.A. only gets credit for capabilities that build, test, certify, and leave evidence.

## Current validation commands

```bash
npm install --ignore-scripts --no-audit --no-fund
npm run build
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

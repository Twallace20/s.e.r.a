# Build Validation

This starter package was generated and then validated in the build environment before packaging.

Validated commands:

```bash
npm install --ignore-scripts
npm run build
npm test
node packages/certs/dist/certify.js
```

Observed result:

- TypeScript build: passed
- Vitest integration tests: 4 passed / 0 failed
- Secure-base cert: PASS

The package was cleaned before zipping so `node_modules`, `dist`, `.sera-runs`, and `.sera-cert` are not included.

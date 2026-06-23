import { createDefaultLocalWorkerInstallScopeLockV1, inspectLocalWorkerInstallScopeLockV1 } from "./lib/local-worker-install-scope-lock-v1.mjs";

const result = inspectLocalWorkerInstallScopeLockV1(createDefaultLocalWorkerInstallScopeLockV1(), { writeArtifacts: true });

if (!result.ok) {
  console.error("S.E.R.A. phase64 local worker install scope lock v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase64 local worker install scope lock v1: PASS");
console.log(JSON.stringify(result, null, 2));

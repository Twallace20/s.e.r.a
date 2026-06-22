import { inspectLocalWorkerDryRunHarnessV1 } from "./lib/local-worker-dry-run-harness-v1.mjs";

const result = inspectLocalWorkerDryRunHarnessV1();

if (!result.ok) {
  console.error("S.E.R.A. phase57 local worker dry-run harness v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase57 local worker dry-run harness v1: PASS");
console.log(JSON.stringify(result, null, 2));

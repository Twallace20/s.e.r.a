#!/usr/bin/env node
import { inspectLocalWorkerCommandScopeLockV1 } from "./lib/local-worker-command-scope-lock-v1.mjs";

const result = inspectLocalWorkerCommandScopeLockV1(undefined, { writeArtifacts: true });
if (!result.ok) {
  console.error("S.E.R.A. phase87 local worker command scope lock v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log("S.E.R.A. phase87 local worker command scope lock v1: PASS");
console.log(JSON.stringify(result, null, 2));

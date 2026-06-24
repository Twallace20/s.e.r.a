#!/usr/bin/env node
import { inspectLocalWorkerCommandDryRunSimulatorV1 } from "./lib/local-worker-command-dry-run-simulator-v1.mjs";

const result = inspectLocalWorkerCommandDryRunSimulatorV1(undefined, { writeArtifacts: true });
if (!result.ok) {
  console.error("S.E.R.A. phase88 local worker command dry-run simulator v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log("S.E.R.A. phase88 local worker command dry-run simulator v1: PASS");
console.log(JSON.stringify(result, null, 2));

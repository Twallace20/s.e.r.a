#!/usr/bin/env node
import { inspectLocalWorkerCommandSandboxWorkspaceV1 } from "./lib/local-worker-command-sandbox-workspace-v1.mjs";

const result = inspectLocalWorkerCommandSandboxWorkspaceV1(undefined, { writeArtifacts: true });
if (!result.ok) {
  console.error("S.E.R.A. phase89 local worker command sandbox workspace v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log("S.E.R.A. phase89 local worker command sandbox workspace v1: PASS");
console.log(JSON.stringify(result, null, 2));

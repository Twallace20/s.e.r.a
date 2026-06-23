import { inspectLocalWorkerDependencyAllowlistV1 } from "./lib/local-worker-dependency-allowlist-v1.mjs";

const result = inspectLocalWorkerDependencyAllowlistV1(undefined, { writeArtifacts: true });
console.log("S.E.R.A. phase67 local worker dependency allowlist v1: " + (result.ok ? "PASS" : "BLOCKED"));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;

import { createDefaultLocalWorkerCommandAllowlistDraftV1, inspectLocalWorkerCommandAllowlistDraftV1 } from "./lib/local-worker-command-allowlist-draft-v1.mjs";

const result = inspectLocalWorkerCommandAllowlistDraftV1(createDefaultLocalWorkerCommandAllowlistDraftV1(), { writeArtifacts: true });
console.log("S.E.R.A. phase75 local worker command allowlist draft v1: " + (result.ok ? "PASS" : "FAIL"));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

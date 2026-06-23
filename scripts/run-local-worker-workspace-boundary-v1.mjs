import { createDefaultLocalWorkerWorkspaceBoundaryV1, inspectLocalWorkerWorkspaceBoundaryV1 } from "./lib/local-worker-workspace-boundary-v1.mjs";

const result = inspectLocalWorkerWorkspaceBoundaryV1(createDefaultLocalWorkerWorkspaceBoundaryV1(), { writeArtifacts: true });

if (!result.ok) {
  console.error("S.E.R.A. phase65 local worker workspace boundary v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase65 local worker workspace boundary v1: PASS");
console.log(JSON.stringify(result, null, 2));

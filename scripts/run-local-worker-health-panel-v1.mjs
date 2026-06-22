import { inspectLocalWorkerHealthPanelV1 } from "./lib/local-worker-health-panel-v1.mjs";

const result = inspectLocalWorkerHealthPanelV1();

if (!result.ok) {
  console.error("S.E.R.A. phase56 local worker health panel v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase56 local worker health panel v1: PASS");
console.log(JSON.stringify(result, null, 2));

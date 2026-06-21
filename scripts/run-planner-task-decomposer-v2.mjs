import { PlannerTaskDecomposerV2 } from "./lib/planner-task-decomposer-v2.mjs";

const planner = new PlannerTaskDecomposerV2();
const summary = planner.writeSummaryArtifacts();

if (!summary.ok) {
  console.error("S.E.R.A. phase31 planner task decomposer v2: FAIL");
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase31 planner task decomposer v2: PASS");
console.log(JSON.stringify(summary, null, 2));

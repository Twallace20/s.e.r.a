import { inspectWindowsTaskSchedulerStatusCheckV1 } from "./lib/windows-task-scheduler-status-check-v1.mjs";

const result = inspectWindowsTaskSchedulerStatusCheckV1();

if (!result.ok) {
  console.error("S.E.R.A. phase58 Windows Task Scheduler status check v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase58 Windows Task Scheduler status check v1: PASS");
console.log(JSON.stringify(result, null, 2));

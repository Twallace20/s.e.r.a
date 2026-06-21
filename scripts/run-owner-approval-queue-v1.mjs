import { inspectOwnerApprovalQueueV1, createDefaultOwnerApprovalQueueV1 } from "./lib/owner-approval-queue-v1.mjs";

const result = inspectOwnerApprovalQueueV1(createDefaultOwnerApprovalQueueV1(), {
  rootDir: process.cwd(),
});

if (!result.ok) {
  console.error("S.E.R.A. phase36 owner approval queue v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase36 owner approval queue v1: PASS");
console.log(JSON.stringify(result, null, 2));

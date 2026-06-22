import { inspectOvernightBranchWorkerV1, createDefaultOvernightBranchWorkerV1 } from "./lib/overnight-branch-worker-v1.mjs";

const result = inspectOvernightBranchWorkerV1(createDefaultOvernightBranchWorkerV1(), {
  rootDir: process.cwd(),
});

if (!result.ok) {
  console.error("S.E.R.A. phase40 overnight branch worker v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase40 overnight branch worker v1: PASS");
console.log(JSON.stringify(result, null, 2));

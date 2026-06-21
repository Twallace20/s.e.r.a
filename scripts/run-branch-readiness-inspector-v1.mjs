import { inspectBranchReadinessV1, createDefaultBranchReadinessProposalV1 } from "./lib/branch-readiness-inspector-v1.mjs";

const result = inspectBranchReadinessV1(createDefaultBranchReadinessProposalV1(), {
  rootDir: process.cwd(),
});

if (!result.ok) {
  console.error("S.E.R.A. phase34 branch readiness inspector v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase34 branch readiness inspector v1: PASS");
console.log(JSON.stringify(result, null, 2));
